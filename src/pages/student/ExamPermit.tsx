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
      <div className="space-y-8 max-w-2xl mx-auto py-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
            Nexus Permit
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">
            Examination Access Authorization // HID-V4
          </p>
        </div>

        <div className="relative group">
          {/* Holographic Decorations */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-600/30 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />

          <Card
            className={`relative bg-slate-950/80 border-2 backdrop-blur-xl shadow-2xl overflow-hidden ${overallEligible ? "border-primary/20" : "border-rose-500/20"}`}
          >
            {/* Chip/HID visual element */}
            <div className="absolute top-8 right-8 h-10 w-14 bg-gradient-to-br from-yellow-500/40 to-yellow-600/20 rounded-md border border-yellow-500/30 opacity-60" />

            <CardContent className="p-8 space-y-8">
              <div className="flex justify-between items-start border-b border-slate-800 pb-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.4em]">
                    AURA INTEGRITY REPOSITORY
                  </p>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                    End Term Protocol — 2026
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <div
                      className={`h-1.5 w-10 rounded-full ${overallEligible ? "bg-primary shadow-[0_0_8px_rgba(34,211,238,0.5)]" : "bg-rose-500"}`}
                    />
                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                      {overallEligible
                        ? "Status: Authorized"
                        : "Status: Inhibited"}
                    </span>
                  </div>
                </div>
                <Fingerprint className="h-8 w-8 text-slate-700" />
              </div>

              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Subject Identity
                  </label>
                  <p className="text-sm font-bold text-slate-200 uppercase">
                    {user?.profile?.fullName || user?.username}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Serial Index
                  </label>
                  <p className="text-sm font-mono text-slate-300">
                    # {user?.profile?.studentId || "STU-000"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Assigned Sector
                  </label>
                  <p className="text-sm font-bold text-slate-200 uppercase">
                    {user?.profile?.department || "General Computation"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Temporal Cycle
                  </label>
                  <p className="text-sm font-bold text-slate-200">
                    Segment 0{user?.profile?.semester || 5}
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-900">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                  Course Integrity Metrics
                </p>
                <div className="grid gap-2">
                  {courseEligibility.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/60 border border-slate-800 p-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${course.eligible ? "bg-primary animate-pulse" : "bg-rose-500"}`}
                        />
                        <div>
                          <p className="text-xs font-black text-slate-200 uppercase tracking-tight">
                            {course.id} // {course.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            INTEGRITY: {course.attendance}%
                          </p>
                        </div>
                      </div>
                      {course.eligible ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Lock className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                  ))}
                  {courseEligibility.length === 0 && (
                    <p className="text-center py-4 text-xs text-slate-600 italic">
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
                    className="w-full h-14 font-black uppercase tracking-[0.2em] italic bg-primary text-black hover:bg-primary/90 shadow-[0_0_25px_rgba(34,211,238,0.4)] relative overflow-hidden group/btn"
                  >
                    <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/30 transform translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                    <Download className="mr-3 h-5 w-5" /> Download Hall Ticket
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Button
                      size="lg"
                      variant="destructive"
                      disabled
                      className="w-full h-14 font-black uppercase tracking-[0.2em] bg-slate-900 border border-rose-500/40 text-rose-500 opacity-60"
                    >
                      <Lock className="mr-3 h-5 w-5" /> Hall Ticket Inhibited
                    </Button>
                    <p className="text-[9px] text-rose-500 font-mono uppercase tracking-[0.1em]">
                      Minimum 75% attendance required across all sectors for
                      authorization.
                    </p>
                  </div>
                )}

                <p className="text-[9px] text-slate-700 font-mono uppercase tracking-[0.4em] mt-6">
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
