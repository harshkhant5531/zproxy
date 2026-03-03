import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, sessionsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, parseISO } from "date-fns";

const tooltipStyle = { background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" };
const tickStyle = { fill: "hsl(215 20% 55%)", fontSize: 12 };

export default function Analytics() {
  const { user } = useAuth();

  const { data: performanceData, isLoading: isPerfLoading } = useQuery({
    queryKey: ["faculty", "performance-reports"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    }
  });

  const { data: sessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["faculty", "sessions-all", user?.id],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions({ limit: 100 });
      return resp.data.data.sessions || [];
    }
  });

  if (isPerfLoading || isSessionsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // --- Top performers from performance report ---
  const students = performanceData?.students || [];
  const topStudents = students.slice(0, 5).map((s: any) => ({
    name: s.student?.studentProfile?.fullName || s.student?.username || "Unknown",
    attainment: s.averagePercentage || 0,
  }));

  // --- Real weekly trend from sessions (last 5 weeks) ---
  const sessions: any[] = Array.isArray(sessionsData) ? sessionsData : [];
  const completedSessions = sessions.filter((s: any) => s.status === "completed");

  const trendData = Array.from({ length: 5 }, (_, i) => {
    const weekOffset = 4 - i;
    const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    const weekEnd = startOfWeek(subWeeks(new Date(), weekOffset - 1), { weekStartsOn: 1 });

    const weekSessions = completedSessions.filter((s: any) => {
      if (!s.date) return false;
      try {
        const d = parseISO(s.date);
        return d >= weekStart && d < weekEnd;
      } catch { return false; }
    });

    const totalStudentsSum = weekSessions.reduce((acc: number, s: any) => {
      const total = s.course?.students?.length || 0;
      return acc + total;
    }, 0);
    const presentSum = weekSessions.reduce((acc: number, s: any) => {
      return acc + (s.attendanceRecords?.length || 0);
    }, 0);

    const avgAttendance = totalStudentsSum > 0
      ? Math.round((presentSum / totalStudentsSum) * 100)
      : 0;

    return {
      week: `W${i + 1}`,
      attendance: avgAttendance,
      sessions: weekSessions.length,
    };
  });

  // --- Radar: compute real engagement metrics from sessions ---
  const totalCompleted = completedSessions.length;
  const totalScheduled = sessions.length;
  const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const avgPresentRate = totalCompleted > 0
    ? Math.round(
      completedSessions.reduce((acc: number, s: any) => {
        const pct = s.course?.students?.length > 0
          ? (s.attendanceRecords?.length / s.course.students.length) * 100
          : 0;
        return acc + pct;
      }, 0) / totalCompleted
    )
    : 0;

  const radarData = [
    { subject: "Completion", A: completionRate, fullMark: 100 },
    { subject: "Present Rate", A: avgPresentRate, fullMark: 100 },
    { subject: "Engagement", A: avgPresentRate, fullMark: 100 },
    { subject: "Compliance", A: completionRate, fullMark: 100 },
    { subject: "Consistency", A: Math.min(completionRate, avgPresentRate), fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter">Academic Analytics</h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider">COURSE OUTCOME & ENGAGEMENT METRICS</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Index</p>
          <p className="text-xl font-black text-primary font-mono">{performanceData?.statistics?.classAverage || 0}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Top Performers Attainment</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            {topStudents.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topStudents}>
                  <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} hide />
                  <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="attainment" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-slate-600 italic text-sm font-mono">
                No performance data available yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Performance Analysis</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(222 30% 18%)" />
                <PolarAngleAxis dataKey="subject" tick={tickStyle} />
                <PolarRadiusAxis tick={{ ...tickStyle, fontSize: 10 }} domain={[0, 100]} />
                <Radar dataKey="A" stroke="hsl(187 100% 50%)" fill="hsl(187 100% 50%)" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm lg:col-span-2 shadow-2xl">
          <CardHeader className="pb-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Weekly Attendance Trend (Last 5 Weeks)</CardTitle>
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                {totalCompleted} sessions completed
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <XAxis dataKey="week" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="attendance" stroke="hsl(187 100% 50%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(187 100% 50%)", strokeWidth: 2 }} name="Avg Attendance %" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2"><div className="h-2 w-10 bg-primary" /> Attendance %</div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
