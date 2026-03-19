/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Clock,
  Shield,
  AlertTriangle,
  UserPlus,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsAPI, attendanceAPI } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export default function LiveSession() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showOverride, setShowOverride] = useState(false);
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const resp = await sessionsAPI.getSession(id!);
      return {
        ...resp.data.data.session,
        networkIp: resp.data.data.networkIp,
      };
    },
    enabled: !!id,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ["session", id, "attendance"],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessionAttendance(id!);
      return resp.data.data.attendance;
    },
    enabled: !!id,
    refetchInterval: (data: any) =>
      sessionData?.status === "completed" ? false : 5000,
  });

  const endSessionMutation = useMutation({
    mutationFn: () => sessionsAPI.finalizeSession(id!),
    onSuccess: (resp: any) => {
      const { markedAbsent = 0, excusedAbsent = 0 } = resp.data.data || {};
      const parts: string[] = [];
      if (markedAbsent > 0) parts.push(`${markedAbsent} marked absent`);
      if (excusedAbsent > 0)
        parts.push(`${excusedAbsent} excused (approved leave)`);
      toast.success(
        parts.length > 0
          ? `Session concluded — ${parts.join(", ")}.`
          : "Session concluded. All eligible students are present.",
      );
      queryClient.invalidateQueries({ queryKey: ["session", id] });
      queryClient.invalidateQueries({
        queryKey: ["session", id, "attendance"],
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to end session");
    },
  });

  const overrideMutation = useMutation({
    mutationFn: (data: any) => attendanceAPI.markAttendance(data),
    onSuccess: () => {
      toast.success("Attendance marked manually");
      queryClient.invalidateQueries({
        queryKey: ["session", id, "attendance"],
      });
      setShowOverride(false);
      setOverrideStudentId("");
      setOverrideReason("");
    },
  });

  const session = sessionData;
  const isCompleted = session?.status === "completed";
  const presentRecords =
    attendanceData?.filter((a: any) => a.status === "present") || [];
  const absentRecords =
    attendanceData?.filter((a: any) => a.status === "absent") || [];
  const presentCount = presentRecords.length;
  const allEnrolledStudents: any[] = session?.course?.students || [];
  // Filter to only the selected batch(es) when batches are set
  const eligibleStudents =
    session?.batches?.length > 0
      ? allEnrolledStudents.filter((s: any) =>
          session.batches.includes(s.studentProfile?.batch),
        )
      : allEnrolledStudents;
  const presentStudentIds = new Set(
    presentRecords.map((a: any) => a.studentId),
  );
  // Students who haven't checked in at all (used during live view)
  const absentees = eligibleStudents.filter(
    (s: any) => !presentStudentIds.has(s.id),
  );
  // For completed view: map absent records to student-shape objects
  const absenteeRoster: any[] = isCompleted
    ? absentRecords.map((r: any) => ({
        id: r.studentId,
        username: r.student?.username || "Unknown",
        studentProfile: r.student?.studentProfile || null,
      }))
    : absentees;

  // Proxy suspects: attendance records whose notes contain [PROXY_SUSPECT…] or [PROXY_DETECTED…]
  const proxyRecords = (attendanceData || []).filter(
    (a: any) =>
      a.notes?.includes("[PROXY_SUSPECT") ||
      a.notes?.includes("[PROXY_DETECTED"),
  );
  const parseProxyFlag = (notes: string | null): number | null => {
    if (!notes) return null;
    const m = notes.match(
      /\[PROXY_(?:SUSPECT|DETECTED):sharedWith:(\d+)[^\]]*\]/,
    );
    return m ? parseInt(m[1]) : null;
  };

  const totalCount = eligibleStudents.length || 1;
  const pct = Math.round((presentCount / totalCount) * 100);

  const copyAbsenteeReport = () => {
    const dateStr = format(new Date(session?.date), "MMM dd, yyyy");
    const subjectName = session?.subject?.name || session?.course?.name;

    let reportText = `AURA INTEGRITY REPORT\nSubject: ${subjectName}\nDate: ${dateStr}\n\nPresent: ${presentCount}\nAbsent: ${absentees.length}\nProxies Caught: ${proxyRecords.length}\n\n`;

    if (proxyRecords.length > 0) {
      reportText += `SECURITY ALERTS (PROXY ATTEMPTS):\n`;
      proxyRecords.forEach((p: any, i: number) => {
        reportText += `${i + 1}. ${p.student?.studentProfile?.fullName || p.student?.username} (MARKED ABSENT)\n`;
      });
      reportText += `\n`;
    }

    reportText += `ABSENTEES:\n${absentees.map((s: any, i: number) => `${i + 1}. ${s.studentProfile?.fullName || s.username}`).join("\n")}`;

    navigator.clipboard.writeText(reportText);
    toast.success("Intelligence report copied!");
  };

  const handleManualOverride = () => {
    if (!overrideStudentId || !overrideReason) return;
    overrideMutation.mutate({
      sessionId: parseInt(id!),
      studentId: parseInt(overrideStudentId),
      status: "present",
      notes: overrideReason,
      method: "manual_override",
    });
  };

  const handleCopyExport = () => {
    if (!attendanceData || attendanceData.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = "Student ID\tFull Name\tStatus\tTimestamp\tMethod\n";
    const body = attendanceData
      .map((log: any) => {
        const name =
          log.student?.studentProfile?.fullName ||
          log.student?.username ||
          "N/A";
        const id =
          log.student?.studentProfile?.studentId ||
          log.student?.username ||
          "N/A";
        const timestamp = format(
          new Date(log.timestamp),
          "yyyy-MM-dd HH:mm:ss",
        );
        const method = log.method || "MANUAL_IP";
        return `${id}\t${name}\t${log.status}\t${timestamp}\t${method}`;
      })
      .join("\n");

    navigator.clipboard.writeText(headers + body).then(() => {
      toast.success("Attendance copied to clipboard (Excel format)");
    });
  };

  if (isSessionLoading || !session) {
    return (
      <div className="app-page min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading session...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="app-page space-y-6">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title">
              {session?.subject?.name || session?.course?.code} —{" "}
              {session?.topic}
            </h1>
            <p className="page-header-sub flex items-center gap-2">
              <Clock className="h-3 w-3 text-primary/70" />
              {session?.date &&
                format(new Date(session.date), "MMMM dd, yyyy")}{" "}
              • {session?.startTime} - {session?.endTime}
            </p>
            {session?.batches && session.batches.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {session.batches.map((b: string) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase tracking-widest"
                  >
                    Batch {b}
                  </span>
                ))}
                <span className="px-2 py-0.5 bg-info/10 text-info border border-info/20 rounded text-[10px] font-black uppercase tracking-wider">
                  Manual + IP Verification
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverride(!showOverride)}
                  className="border-border text-foreground hover:bg-accent"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Manual Override
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => endSessionMutation.mutate()}
                  disabled={endSessionMutation.isPending}
                  className="font-bold uppercase tracking-widest shadow-sm motion-press"
                >
                  {endSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ending...
                    </>
                  ) : (
                    "End Session"
                  )}
                </Button>
              </>
            )}
            {isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyAbsenteeReport}
                className="border-emerald-500/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold uppercase tracking-widest motion-press"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Copy Export
              </Button>
            )}
          </div>
        </div>

        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm motion-slide-up">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${isCompleted ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary"}`}
                >
                  {isCompleted ? "Concluded" : "Live"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-info/10 text-info border border-info/20">
                  Manual + IP
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">
                Render Proxy Headers Trusted
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Presence
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {presentCount}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Absent
                </p>
                <p className="mt-1 text-2xl font-bold text-destructive">
                  {absenteeRoster.length}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Coverage
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {pct}%
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/80 p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Proxy Flags
                </p>
                <p className="mt-1 text-2xl font-bold text-warning">
                  {proxyRecords.length}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Session Coverage</span>
                <span>
                  {presentCount}/{totalCount}
                </span>
              </div>
              <Progress
                value={(presentCount / totalCount) * 100}
                className="h-2"
              />
            </div>

            <div className="mt-4 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-primary" />
                Clean mode: students check in manually, with IP and device
                verification active.
              </p>
            </div>
          </div>
        </section>

        {isCompleted && (
          <Card className="border-border bg-card shadow-sm motion-slide-up">
            <CardHeader className="border-b border-border/50 pb-3">
              <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Absentee Roster
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                {absenteeRoster.length > 0 ? (
                  absenteeRoster.map((s: any) => (
                    <div
                      key={s.id}
                      className="rounded-lg border border-border/70 bg-background px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {s.studentProfile?.fullName || s.username}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {s.studentProfile?.studentId || `UID: ${s.id}`}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    No absentees detected.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Proxy Suspects Alert ─────────────────────────────────────────── */}
        {proxyRecords.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5 shadow-sm overflow-hidden motion-slide-up">
            <CardHeader className="pb-2 px-6 pt-4 border-b border-destructive/20 bg-destructive/10">
              <CardTitle className="text-[11px] font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {proxyRecords.length} Violation Detected
                {proxyRecords.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-4">
              <p className="app-caption mb-3 leading-relaxed">
                Potential proxy activity detected from shared device signatures.
                Review flagged pairings below.
              </p>
              <div className="space-y-2.5">
                {proxyRecords.map((log: any) => {
                  const sharedWithId = parseProxyFlag(log.notes);
                  const sharedRecord = attendanceData?.find(
                    (a: any) => a.studentId === sharedWithId,
                  );
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 rounded-xl border border-warning/25 bg-background/90 px-4 py-3"
                    >
                      <div className="h-8 w-8 rounded-lg border border-warning/25 bg-warning/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {log.student?.studentProfile?.fullName ||
                            log.student?.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate">
                          Shared with{" "}
                          <span className="text-warning font-bold">
                            {sharedRecord?.student?.studentProfile?.fullName ||
                              sharedRecord?.student?.username ||
                              `Student #${sharedWithId}`}
                          </span>
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-warning bg-warning/10 border border-warning/20 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
                        Violation
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {showOverride && !isCompleted && (
          <Card className="bg-card border-primary/20 border shadow-md motion-slide-up">
            <CardHeader>
              <CardTitle className="text-sm font-black text-foreground uppercase tracking-widest">
                Manual Presence Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Asset Identifier
                  </label>
                  <Input
                    placeholder="Enrollment or User ID..."
                    value={overrideStudentId}
                    onChange={(e) => setOverrideStudentId(e.target.value)}
                    className="bg-background border-border h-12 focus-visible:ring-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                    Authorization Note
                  </label>
                  <Textarea
                    placeholder="Explain the protocol override..."
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="bg-background border-border min-h-[48px] focus-visible:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowOverride(false)}
                  className="uppercase text-[10px] font-black tracking-widest"
                >
                  Abort
                </Button>
                <Button
                  onClick={handleManualOverride}
                  disabled={overrideMutation.isPending}
                  className="bg-primary text-primary-foreground font-bold uppercase tracking-widest px-8 h-12 rounded-xl motion-press"
                >
                  {overrideMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    "Authenticate"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card shadow-sm overflow-hidden motion-slide-up">
          <CardHeader className="border-b border-border px-6 py-4 bg-muted/30">
            <CardTitle className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Users className="h-4 w-4" />
              {isCompleted ? "Attendance Record" : "Authentication Stream"}
              {!isCompleted && (
                <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyExport}
                className="ml-auto h-7 px-2 text-[9px] font-black uppercase tracking-widest border-primary/25 text-primary hover:bg-primary/10"
              >
                Copy Export
              </Button>
            </CardTitle>
            <div className="flex flex-wrap gap-2 items-center mt-2 px-6">
              <span className="text-[10px] font-black text-success uppercase tracking-widest border border-success/30 bg-success/5 px-2 py-0.5 rounded">
                Mode: Manual + IP Verified
              </span>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest border border-primary/30 bg-primary/5 px-2 py-0.5 rounded">
                Network Trust: Render Proxy Headers
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-background/90 backdrop-blur sticky top-0 z-10">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest pl-6">
                      Student Identity
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">
                      Timestamp
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">
                      Protocol
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest pr-6">
                      Validation
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData?.map((log: any) => {
                    const proxySharedWithId = parseProxyFlag(log.notes);
                    const proxyPartner = proxySharedWithId
                      ? attendanceData.find(
                          (a: any) => a.studentId === proxySharedWithId,
                        )
                      : null;
                    return (
                      <TableRow
                        key={log.id}
                        className={`border-border group hover:bg-muted/20 transition-colors ${proxySharedWithId ? "bg-warning/5" : ""}`}
                      >
                        <TableCell className="pl-6">
                          <div className="py-1">
                            <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                              {log.student?.studentProfile?.fullName ||
                                log.student?.username}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {log.student?.username}
                            </p>
                            {proxySharedWithId && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                                <span className="text-[9px] font-black text-warning uppercase tracking-wider">
                                  Proxy Violation — shared with{" "}
                                  {proxyPartner?.student?.studentProfile
                                    ?.fullName ||
                                    proxyPartner?.student?.username ||
                                    `#${proxySharedWithId}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {format(new Date(log.timestamp), "HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <span className="text-[9px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-tighter border border-border/50">
                            {log.method || "MANUAL_IP"}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6">
                          <StatusBadge status={log.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!attendanceData || attendanceData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-20">
                        {isCompleted ? (
                          <>
                            <Users className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground font-medium italic">
                              No attendance records found.
                            </p>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-10 w-10 text-muted-foreground/20 animate-spin mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground font-medium italic">
                              Waiting for attendance check-ins...
                            </p>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="text-center pt-8">
          <p className="text-[9px] text-muted-foreground/40 font-mono uppercase tracking-[0.5em]">
            Aura Integrity Engine // Temporal Session Feed
          </p>
        </div>
      </div>
    </>
  );
}
