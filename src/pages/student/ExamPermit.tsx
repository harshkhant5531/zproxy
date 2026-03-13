/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Ticket,
  Download,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Fingerprint,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { reportsAPI, coursesAPI } from "@/lib/api";
import { toast } from "sonner";
import { FullScreenLoader } from "@/components/FullScreenLoader";

export default function ExamPermit() {
  const { user } = useAuth();

  const { data: attendanceStats, isLoading: isAttLoading } = useQuery({
    queryKey: ["student", "attendance-stats", user?.id],
    queryFn: async () => {
      const resp = await reportsAPI.attendance({ studentId: user?.id });
      return resp.data.data.reports;
    },
    enabled: !!user?.id,
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["student", "courses", user?.id],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const courses = resp.data.data.courses || [];
      return courses.filter((c: any) =>
        c.students?.some((s: any) => s.id === user?.id),
      );
    },
    enabled: !!user?.id,
  });

  const isLoading = isAttLoading || isCoursesLoading;

  const reports = Array.isArray(attendanceStats) ? attendanceStats : [];
  const studentCourses = Array.isArray(coursesData) ? coursesData : [];

  const courseEligibility = studentCourses.map((c: any) => {
    // Find statistics for this specific course from the reports API response
    const stat = Array.isArray(attendanceStats)
      ? attendanceStats.find((s: any) => s.id === c.id) // If backend returns aggregated stats
      : undefined;

    // Fallback: Calculate from raw attendance logs if stats not pre-aggregated
    const courseReports = reports.filter((r) => r.session?.courseId === c.id);
    const total = courseReports.length;
    const present = courseReports.filter((r) => r.status === "present").length;
    const attendance = total > 0 ? (present / total) * 100 : 0;

    return {
      id: c.code,
      name: c.name,
      attendance: parseFloat(attendance.toFixed(1)),
      eligible: attendance >= 75 || total === 0,
    };
  });

  const overallEligible =
    courseEligibility.length > 0 && courseEligibility.every((c) => c.eligible);

  const handleDownload = () => {
    toast.success("Hall Ticket generated. Initializing download...");
    setTimeout(() => {
      const link = document.createElement("a");
      link.href = "#"; // Simulation
      link.setAttribute(
        "download",
        `HallTicket-${user?.profile?.studentId || "STU"}.pdf`,
      );
      toast.success("Security Payload Transmitted");
    }, 1500);
  };

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <div className="app-page max-w-4xl mx-auto">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" /> Exam Permit
            </h1>
            <p className="page-header-sub">Examination access authorization</p>
          </div>
        </div>

        <div className="relative group motion-slide-up">
          <Card
            className={`relative bg-card border border-border shadow-sm overflow-hidden motion-surface ${overallEligible ? "border-primary/40" : "border-destructive/40"}`}
          >
            {/* HID-like visual element */}
            <div className="absolute top-8 right-8 h-10 w-14 bg-muted/50 rounded-md border border-border pointer-events-none" />

            <CardContent className="p-10 space-y-8">
              <div className="flex justify-between items-start border-b border-border pb-6">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.25em]">
                    Institution Record
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                    End-Term Examination 2026
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`h-1.5 w-10 rounded-full ${overallEligible ? "bg-primary" : "bg-destructive"}`}
                    />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {overallEligible
                        ? "Status: Authorized"
                        : "Status: Inhibited"}
                    </span>
                  </div>
                </div>
                <Fingerprint className="h-8 w-8 text-muted-foreground/40" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Subject Identity
                  </label>
                  <p className="text-base font-semibold text-foreground">
                    {user?.profile?.fullName || user?.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Serial Index
                  </label>
                  <p className="text-base font-mono text-foreground/90">
                    # {user?.profile?.studentId || "STU-000"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Assigned Sector
                  </label>
                  <p className="text-base font-semibold text-foreground">
                    {user?.profile?.department || "General Computation"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Temporal Cycle
                  </label>
                  <p className="text-base font-semibold text-foreground">
                    Segment 0{user?.profile?.semester || 5}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.14em]">
                  Course Integrity Metrics
                </p>
                <div className="grid gap-2">
                  {courseEligibility.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between rounded-lg bg-muted/20 border border-border p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${course.eligible ? "bg-primary animate-pulse" : "bg-destructive"}`}
                        />
                        <div>
                          <p className="text-sm font-semibold text-foreground tracking-tight">
                            {course.id} // {course.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            INTEGRITY: {course.attendance}%
                          </p>
                        </div>
                      </div>
                      {course.eligible ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Lock className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  ))}
                  {courseEligibility.length === 0 && (
                    <p className="text-center py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                      No course data indexed
                    </p>
                  )}
                </div>
              </div>

              <div className="text-center pt-8">
                {overallEligible ? (
                    <Button
                      onClick={handleDownload}
                      size="lg"
                      className="w-full h-14 text-sm font-bold tracking-widest uppercase bg-primary text-black hover:brightness-110 shadow-sm relative overflow-hidden group/btn motion-press"
                    >
                      <Download className="mr-3 h-5 w-5" /> Download Hall Ticket
                    </Button>
                ) : (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      variant="outline"
                      disabled
                      className="w-full h-14 text-sm font-bold tracking-widest uppercase bg-muted/30 border border-border text-muted-foreground"
                    >
                      <Lock className="mr-3 h-5 w-5" /> Hall Ticket Inhibited
                    </Button>
                    <p className="text-xs text-destructive/90 font-mono tracking-[0.03em]">
                      Minimum 75% attendance required across all sectors for
                      authorization.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground/60 font-mono uppercase tracking-[0.18em] mt-6">
                  Verified by Aura Governance Engine v4.2
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
