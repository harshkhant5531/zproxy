import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, sessionsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { format, startOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};
const tickStyle = { fill: "hsl(215 20% 55%)", fontSize: 12 };

export default function Analytics() {
  const { user } = useAuth();

  const { data: performanceData, isLoading: isPerfLoading } = useQuery({
    queryKey: ["faculty", "performance-reports"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    },
  });

  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["faculty", "sessions-all", user?.id],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions({ limit: 100 });
      return resp.data.data.sessions || [];
    },
  });

  const students = performanceData?.students || [];
  const topStudents = students.slice(0, 5).map((s: any) => ({
    name:
      s.student?.studentProfile?.fullName || s.student?.username || "Unknown",
    attainment: s.averagePercentage || 0,
  }));

  const sessions: any[] = Array.isArray(sessionsData) ? sessionsData : [];
  const completedSessions = sessions.filter(
    (s: any) => s.status === "completed",
  );

  const trendData = Array.from({ length: 5 }, (_, i) => {
    const weekOffset = 4 - i;
    const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), {
      weekStartsOn: 1,
    });
    const weekEnd = startOfWeek(subWeeks(new Date(), weekOffset - 1), {
      weekStartsOn: 1,
    });

    const weekSessions = completedSessions.filter((s: any) => {
      if (!s.date) return false;
      try {
        const d = parseISO(s.date);
        return d >= weekStart && d < weekEnd;
      } catch {
        return false;
      }
    });

    const totalStudentsSum = weekSessions.reduce((acc: number, s: any) => {
      const total = s.course?.students?.length || 0;
      return acc + total;
    }, 0);
    const presentSum = weekSessions.reduce((acc: number, s: any) => {
      return acc + (s.attendanceRecords?.length || 0);
    }, 0);

    const avgAttendance =
      totalStudentsSum > 0
        ? Math.round((presentSum / totalStudentsSum) * 100)
        : 0;

    return {
      week: `W${i + 1}`,
      attendance: avgAttendance,
      sessions: weekSessions.length,
    };
  });

  const totalCompleted = completedSessions.length;
  const totalScheduled = sessions.length;
  const completionRate =
    totalScheduled > 0
      ? Math.round((totalCompleted / totalScheduled) * 100)
      : 0;

  const avgPresentRate =
    totalCompleted > 0
      ? Math.round(
          completedSessions.reduce((acc: number, s: any) => {
            const pct =
              s.course?.students?.length > 0
                ? (s.attendanceRecords?.length / s.course.students.length) * 100
                : 0;
            return acc + pct;
          }, 0) / totalCompleted,
        )
      : 0;

  const radarData = [
    { subject: "Completion", A: completionRate, fullMark: 100 },
    { subject: "Present Rate", A: avgPresentRate, fullMark: 100 },
    { subject: "Engagement", A: avgPresentRate, fullMark: 100 },
    { subject: "Compliance", A: completionRate, fullMark: 100 },
    {
      subject: "Consistency",
      A: Math.min(completionRate, avgPresentRate),
      fullMark: 100,
    },
  ];

  return (
    <>
      <FullScreenLoader
        show={isPerfLoading || isSessionsLoading}
        operation="loading"
      />
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase aura-text-glow">
              Institutional Intelligence
            </h1>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Live Analytics // Course Outcome & Engagement
            </p>
          </div>
          <div className="glass-card aura-glow border-none px-6 py-3 rounded-2xl flex flex-col items-end">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">
              Performance Index
            </p>
            <p className="text-3xl font-black text-primary tracking-tighter aura-text-glow">
              {performanceData?.statistics?.classAverage || 0}
              <span className="text-sm ml-1 opacity-50">%</span>
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="glass-card aura-glow border-none overflow-hidden group">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-6 py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                Top Performance Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {topStudents.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topStudents}>
                    <XAxis
                      dataKey="name"
                      tick={tickStyle}
                      axisLine={false}
                      tickLine={false}
                      hide
                    />
                    <YAxis
                      tick={tickStyle}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backdropFilter: "blur(12px)",
                        backgroundColor: "rgba(0,0,0,0.8)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "12px",
                      }}
                      itemStyle={{
                        color: "hsl(var(--primary))",
                        fontWeight: "bold",
                      }}
                    />
                    <Bar
                      dataKey="attainment"
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 2, 2]}
                      barSize={35}
                      className="filter drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground/30 font-mono text-[10px] uppercase tracking-widest">
                  Station Idle // No Data Ingested
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card aura-glow border-none overflow-hidden group">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-6 py-4">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                Engagement Vector Map
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.05)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{
                      ...tickStyle,
                      fill: "hsl(var(--foreground))",
                      opacity: 0.6,
                    }}
                  />
                  <PolarRadiusAxis
                    tick={{
                      ...tickStyle,
                      fontSize: 10,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                    domain={[0, 100]}
                  />
                  <Radar
                    dataKey="A"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card aura-glow border-none lg:col-span-2 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-border/10 px-8 py-5 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] italic">
                Attendance Telemetry Trend
              </CardTitle>
              <div className="text-[9px] text-primary font-black uppercase tracking-[0.2em] bg-primary/10 px-3 py-1 rounded-full border border-primary/20 aura-glow">
                {totalCompleted} Verified Cycles
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <XAxis
                    dataKey="week"
                    tick={tickStyle}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={tickStyle}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backdropFilter: "blur(12px)",
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="hsl(var(--primary))"
                    strokeWidth={4}
                    dot={{
                      r: 6,
                      fill: "hsl(var(--primary))",
                      strokeWidth: 2,
                      stroke: "hsl(var(--background))",
                    }}
                    activeDot={{
                      r: 8,
                      fill: "hsl(var(--primary))",
                      strokeWidth: 0,
                    }}
                    name="Attendance Flow"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
