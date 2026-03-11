import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  QrCode,
  Users,
  Clock,
  Shield,
  Wifi,
  AlertTriangle,
  UserPlus,
  Loader2,
  RefreshCw,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsAPI, attendanceAPI } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export default function LiveSession() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [qrTimer, setQrTimer] = useState(15);
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

  const generateQRMutation = useMutation({
    mutationFn: () => sessionsAPI.generateQR(id!),
    onSuccess: (data) => {
      queryClient.setQueryData(["session", id], (old: any) => ({
        ...old,
        qrCode: data.data.data.qrCode,
      }));
      setQrTimer(15);
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

  useEffect(() => {
    if (
      sessionData &&
      !sessionData.qrCode &&
      sessionData.status !== "completed" &&
      !generateQRMutation.isPending
    ) {
      generateQRMutation.mutate();
    }
  }, [sessionData]);

  useEffect(() => {
    if (sessionData?.status === "completed") return;

    const interval = setInterval(() => {
      setQrTimer((prev) => {
        if (prev <= 1) {
          generateQRMutation.mutate();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [id, sessionData?.status]);

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
  const proxyRecords = (attendanceData || []).filter((a: any) =>
    a.notes?.includes("[PROXY_SUSPECT") || a.notes?.includes("[PROXY_DETECTED"),
  );
  const parseProxyFlag = (notes: string | null): number | null => {
    if (!notes) return null;
    const m = notes.match(/\[PROXY_(?:SUSPECT|DETECTED):sharedWith:(\d+)\]/);
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

  return (
    <>
      <FullScreenLoader show={isSessionLoading} operation="loading" />
      <FullScreenLoader
        show={endSessionMutation.isPending}
        operation="submitting"
        label="Ending Session..."
      />
      <FullScreenLoader
        show={overrideMutation.isPending}
        operation="saving"
        label="Applying Override..."
      />
      <div className="space-y-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {session?.subject?.name || session?.course?.code} —{" "}
              {session?.topic}
            </h1>
            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-primary/70" />
              {session?.date &&
                format(new Date(session.date), "MMMM dd, yyyy")}{" "}
              • {session?.startTime} - {session?.endTime}
            </p>
            {session?.batches && session.batches.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {session.batches.map((b: string) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-black uppercase tracking-wider"
                  >
                    Batch {b}
                  </span>
                ))}
                {session?.geofenceRadius && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Grid: {session.geofenceRadius}m
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
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
                  className="font-bold uppercase tracking-wider shadow-lg shadow-destructive/20"
                >
                  End Session
                </Button>
              </>
            )}
            {isCompleted && (
              <Button
                variant="outline"
                size="sm"
                onClick={copyAbsenteeReport}
                className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 font-bold uppercase tracking-wider"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Copy Export
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="bg-card border-border backdrop-blur-sm lg:row-span-2 overflow-hidden shadow-xl">
            <CardHeader className="pb-3 px-6 border-b border-border/40">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center justify-between">
                <span>
                  {isCompleted ? "Session Statistics" : "Secure Attendance QR"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] ${isCompleted ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary animate-pulse"}`}
                >
                  {isCompleted ? "Concluded" : "Live Feed"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-8 text-center relative h-full bg-gradient-to-b from-transparent to-primary/5">
              {!isCompleted ? (
                <div className="space-y-6">
                  <div className="aspect-square bg-white rounded-xl flex items-center justify-center border-4 border-background shadow-inner relative overflow-hidden">
                    {session?.qrCode ? (
                      <>
                        <QRCodeSVG
                          value={(() => {
                            // PRIORITIZE VERCEL DEPLOYED URL
                            // If we have VITE_API_URL or are not on localhost/localIP, we are likely on Vercel
                            const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
                            
                            if (!isLocal) {
                              return `${window.location.origin}/student/verify?token=${session.qrCode.codeValue}`;
                            }

                            // If we are on local, check if the session networkIp is a public URL (like Vercel)
                            if (session.networkIp && (session.networkIp.includes("vercel.app") || session.networkIp.includes("http"))) {
                               return `${session.networkIp.startsWith("http") ? session.networkIp : `https://${session.networkIp}`}/student/verify?token=${session.qrCode.codeValue}`;
                            }

                            // Only use local LAN IP if specifically requested or as absolute last resort
                            const port = window.location.port ? `:${window.location.port}` : "";
                            const base = session.networkIp && session.networkIp !== "localhost"
                              ? (session.networkIp.startsWith("http") ? session.networkIp : `http://${session.networkIp}${port}`)
                              : import.meta.env.VITE_NETWORK_IP
                                ? `http://${import.meta.env.VITE_NETWORK_IP}${import.meta.env.VITE_PORT ? `:${import.meta.env.VITE_PORT}` : port}`
                                : window.location.origin;
                                
                            return `${base}/student/verify?token=${session.qrCode.codeValue}`;
                          })()}
                          size={window.innerWidth < 640 ? 200 : 240}
                          level="H"
                          includeMargin={true}
                          className={
                            generateQRMutation.isPending
                              ? "opacity-30"
                              : "opacity-100 transition-opacity duration-300"
                          }
                        />
                        {generateQRMutation.isPending && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-10 w-10 text-gray-700 animate-spin" />
                          </div>
                        )}
                      </>
                    ) : (
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    )}
                  </div>
                  <div className="p-5 bg-background border border-border rounded-xl shadow-lg">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">
                      Rotation Sync
                    </p>
                    <p className="text-4xl font-black text-primary aura-text-glow font-mono">
                      {qrTimer}s
                    </p>
                    <Progress
                      value={(qrTimer / 15) * 100}
                      className="h-1.5 mt-4 bg-muted"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-background border border-border rounded-xl shadow-sm">
                      <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">
                        Present
                      </p>
                      <p className="text-4xl font-black text-emerald-500">
                        {presentCount}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-background border border-border rounded-xl shadow-sm">
                      <p className="text-[10px] uppercase text-muted-foreground font-black tracking-widest mb-1">
                        Absent
                      </p>
                      <p className="text-4xl font-black text-destructive">
                        {absenteeRoster.length}
                      </p>
                    </div>
                  </div>
                  <div className="text-left mt-8">
                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Shield className="h-3 w-3" /> Absentee Roster
                    </h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {absenteeRoster.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-3 rounded-lg bg-background border border-border group hover:border-destructive/30 transition-colors"
                        >
                          <p className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">
                            {s.studentProfile?.fullName || s.username}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {s.studentProfile?.studentId || "UID: " + s.id}
                          </p>
                        </div>
                      ))}
                      {absenteeRoster.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-20" />
                          <p className="text-xs text-muted-foreground italic">
                            No absentees detected
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border backdrop-blur-sm col-span-1 lg:col-span-2 shadow-xl">
            <CardHeader className="pb-3 px-6">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Participation Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
                <div className="text-center">
                  <p className="text-5xl font-black text-foreground tracking-tighter aura-text-glow">
                    {pct}%
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mt-1">
                    Attendance rate
                  </p>
                </div>
                <div className="flex-1 space-y-2">
                  <Progress value={pct} className="h-3 bg-muted" />
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase font-mono tracking-wider">
                    <span className="hidden xs:inline">0% Threshold</span>
                    <span className="hidden xs:inline">100% Target</span>
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-2xl font-black text-foreground">
                    {presentCount}{" "}
                    <span className="text-muted-foreground text-sm">
                      / {totalCount}
                    </span>
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">
                    Verified Assets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border backdrop-blur-sm col-span-1 lg:col-span-2 shadow-xl">
            <CardHeader className="pb-3 px-6">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Integrity Protocol Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-background p-4 rounded-xl text-center border border-border group hover:border-primary/30 transition-colors shadow-sm">
                  <Shield className="h-6 w-6 text-emerald-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Encryption
                  </p>
                  <p className="text-xs text-emerald-500 font-black mt-1">
                    AES-256 ACTIVE
                  </p>
                </div>
                <div className="bg-background p-4 rounded-xl text-center border border-border group hover:border-primary/30 transition-colors shadow-sm">
                  <Wifi className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Geo-Fence
                  </p>
                  <p className="text-xs text-primary font-black mt-1">
                    CAMPUS GRID
                  </p>
                </div>
                <div className="bg-background p-4 rounded-xl text-center border border-border group hover:border-primary/30 transition-colors shadow-sm">
                  <AlertTriangle className="h-6 w-6 text-emerald-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Adversary
                  </p>
                  <p className="text-xs text-emerald-500 font-black mt-1">
                    ZERO THREAT
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Proxy Suspects Alert ─────────────────────────────────────────── */}
        {proxyRecords.length > 0 && (
          <Card className="bg-amber-500/5 border-amber-500/30 shadow-lg animate-in fade-in">
            <CardHeader className="pb-2 px-6 pt-4">
              <CardTitle className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {proxyRecords.length} Proxy Detected
                {proxyRecords.length > 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-4">
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                The following students used the same device/IP as another
                student during this session. Review manually.
              </p>
              <div className="space-y-2">
                {proxyRecords.map((log: any) => {
                  const sharedWithId = parseProxyFlag(log.notes);
                  const sharedRecord = attendanceData?.find(
                    (a: any) => a.studentId === sharedWithId,
                  );
                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 bg-background border border-amber-500/20 rounded-lg px-4 py-2.5"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          {log.student?.studentProfile?.fullName ||
                            log.student?.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Shared device with{" "}
                          <span className="text-amber-500 font-bold">
                            {sharedRecord?.student?.studentProfile?.fullName ||
                              sharedRecord?.student?.username ||
                              `Student #${sharedWithId}`}
                          </span>
                        </p>
                      </div>
                      <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-wider shrink-0">
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
          <Card className="bg-card border-primary/30 border-2 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-300">
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
                  className="bg-primary text-primary-foreground font-black uppercase tracking-widest px-8 h-12"
                >
                  Authenticate Asset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
            <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Users className="h-4 w-4" />
              {isCompleted
                ? "Final Attendance Record"
                : "Live Authentication Stream"}
              {!isCompleted && (
                <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-muted/10 sticky top-0 z-10">
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
                        className={`border-border group hover:bg-muted/20 transition-colors ${proxySharedWithId ? "bg-amber-500/5 hover:bg-amber-500/10" : ""}`}
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
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
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
                          <span className="text-[9px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-tighter">
                            {log.method || "QR_SCAN"}
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
                              Scanning for authentication signals...
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
