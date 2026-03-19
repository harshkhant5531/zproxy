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
import { startOfWeek, subWeeks, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
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

  if (isPerfLoading || isSessionsLoading) {
    return (
      <div className="app-page min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="page-header-title">Analytics Overview</h1>
          <p className="page-header-sub">
            Live analytics for course outcomes and engagement
          </p>
        </div>
        <Card variant="glass" className="motion-surface px-6 py-3 rounded-xl">
          <CardContent className="p-0 flex flex-col items-end">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
              Performance Index
            </p>
            <p className="text-3xl font-bold text-primary tracking-tighter">
              {performanceData?.statistics?.classAverage || 0}
              <span className="text-sm ml-1 opacity-50">%</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card variant="glass" className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Completed Sessions
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {totalCompleted}
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Completion Rate
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {completionRate}%
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Avg Present Rate
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {avgPresentRate}%
            </p>
          </CardContent>
        </Card>
        <Card variant="glass" className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Tracked Students
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {students.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card
          variant="elevated"
          className="bg-card border border-border shadow-sm motion-surface overflow-hidden group"
        >
          <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
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
                    contentStyle={tooltipStyle}
                    itemStyle={{
                      color: "hsl(var(--primary))",
                      fontWeight: "600",
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
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground/30 font-mono text-[10px] uppercase tracking-widest">
                Station Idle // No Data Ingested
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          variant="elevated"
          className="bg-card border border-border shadow-sm motion-surface overflow-hidden group"
        >
          <CardHeader className="bg-muted/30 border-b border-border px-6 py-4">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Engagement Vector Map
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
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

        <Card
          variant="elevated"
          className="bg-card border border-border shadow-sm motion-surface lg:col-span-2 overflow-hidden"
        >
          <CardHeader className="bg-muted/30 border-b border-border px-8 py-5 flex flex-row items-center justify-between">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Attendance Telemetry Trend
            </CardTitle>
            <div className="text-[9px] text-primary font-bold uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
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
                <Tooltip contentStyle={tooltipStyle} />
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
  );
}
