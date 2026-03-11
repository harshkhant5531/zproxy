import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck,
  Users,
  BarChart3,
  Play,
  Clock,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { sessionsAPI, reportsAPI, subjectsAPI } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["faculty", "sessions", today],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions({
        date: today,
        facultyId: user?.id,
      });
      return resp.data.data.sessions;
    },
    enabled: !!user?.id,
  });

  const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ["faculty", "performance"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    },
  });

  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["faculty", "subjects"],
    queryFn: async () => {
      const resp = await subjectsAPI.getSubjects({ facultyId: user?.id });
      return resp.data.data.subjects || [];
    },
    enabled: !!user?.id,
  });

  const isLoading =
    isSessionsLoading || isPerformanceLoading || isSubjectsLoading;

  const todaySessions = sessionsData || [];
  const completedToday = todaySessions.filter(
    (s: any) => s.status === "completed",
  ).length;

  const attainmentData =
    performanceData?.students?.slice(0, 6).map((s: any) => ({
      name:
        s.student?.studentProfile?.fullName
          ?.split(" ")
          .map((n: string) => n[0])
          .join("") ||
        s.student?.username?.substring(0, 3).toUpperCase() ||
        "STU",
      attainment: s.averagePercentage || 0,
    })) || [];

  const recentActivity = todaySessions.slice(0, 3).map((s: any) => ({
    text: `${s.subject?.name || s.topic}`,
    subtext: `Ref: ${s.course?.code}`,
    time: s.status === "completed" ? "Completed" : `Starts @ ${s.startTime}`,
    type: s.status,
  }));

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Faculty Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              Signed in as {user?.profile?.fullName || user?.username}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/faculty/records")}
            className="glass-card border-none text-muted-foreground hover:text-primary font-black uppercase text-[10px] tracking-widest px-4 h-9"
          >
            Audit History <ChevronRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div
            className="motion-page-enter motion-surface"
            style={{ animationDelay: "30ms" }}
          >
            <StatCard
              title="Today's Sessions"
              value={todaySessions.length.toString()}
              subtitle={`${completedToday} completed, ${todaySessions.length - completedToday} upcoming`}
              icon={CalendarCheck}
            />
          </div>
          <div
            className="motion-page-enter motion-surface"
            style={{ animationDelay: "90ms" }}
          >
            <StatCard
              title="Assigned Subjects"
              value={subjectsData?.length.toString() || "0"}
              subtitle="Active academic session"
              icon={BookOpen}
            />
          </div>
          <div
            className="motion-page-enter motion-surface"
            style={{ animationDelay: "150ms" }}
          >
            <StatCard
              title="Class Average"
              value={`${performanceData?.statistics?.classAverage || 0}%`}
              subtitle="Across all active subjects"
              icon={BarChart3}
            />
          </div>
          <div
            className="motion-page-enter motion-surface"
            style={{ animationDelay: "210ms" }}
          >
            <StatCard
              title="Total Students"
              value={
                performanceData?.statistics?.totalStudents?.toString() || "0"
              }
              subtitle="Enrolled in assigned modules"
              icon={Users}
            />
          </div>
        </div>

        {/* Today's Sessions */}
        <Card className="glass-card aura-glow border-none overflow-hidden">
          <CardHeader className="card-header-muted">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {todaySessions.length > 0 ? (
              todaySessions.map((session: any, i: number) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-2xl bg-muted/10 border border-white/5 p-5 transition-all hover:bg-muted/20 hover:border-primary/40 group relative overflow-hidden motion-page-enter"
                  style={{ animationDelay: `${50 + i * 60}ms` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.02] to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  <div className="space-y-1.5 relative z-10">
                    <p className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                      {session.subject?.name || session.course?.code} —{" "}
                      {session.topic}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[10px] text-muted-foreground font-mono">
                      <span className="flex items-center gap-2 bg-black/20 px-2 py-0.5 rounded border border-white/5">
                        <Clock className="h-3.5 w-3.5 text-primary/70" />
                        {session.startTime} - {session.endTime}
                      </span>
                      <span className="bg-black/20 px-2 py-0.5 rounded border border-white/5 text-[9px] font-bold">
                        {session.roomNumber || "OFF-SITE"}
                      </span>
                      <span className="text-primary font-black aura-text-glow">
                        {session.attendanceCount || 0} VERIFIED SIGNALS
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={
                      session.status === "scheduled" ? "default" : "outline"
                    }
                    className={
                      session.status === "scheduled"
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6 h-9 shadow-[0_0_20px_rgba(var(--primary),0.3)] relative z-10"
                        : "glass-card border-none text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px] px-6 h-9 relative z-10"
                    }
                    onClick={() => navigate(`/faculty/session/${session.id}`)}
                  >
                    {session.status === "scheduled" ? (
                      <>
                        <Play className="mr-2 h-3.5 w-3.5 fill-current" />
                        Initialize
                      </>
                    ) : (
                      "Audit"
                    )}
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-2xl bg-muted/5">
                <Clock className="h-16 w-16 text-muted-foreground/10 mx-auto mb-6" />
                <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">
                  Static Schedule // No Active Sessions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Performance Metrics // Attainment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={attainmentData}>
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(var(--primary), 0.05)" }}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="attainment"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-xl">
            <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                Telemetry Feed // Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/20 transition-all cursor-default group motion-page-enter"
                    style={{ animationDelay: `${70 + i * 70}ms` }}
                  >
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] shrink-0 group-hover:scale-125 transition-transform" />
                    <div className="space-y-1">
                      <p className="text-sm text-foreground font-black uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
                        {item.text}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {item.subtext} •{" "}
                        <span className="text-primary/70">{item.time}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-xs text-muted-foreground italic">
                    Standby // No recent activity detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="text-center pt-4">
          <p className="text-[9px] text-muted-foreground/30 font-mono uppercase tracking-[0.5em]">
            Aura Integrity Engine // Central Oversight Terminal
          </p>
        </div>
      </div>
    </>
  );
}
