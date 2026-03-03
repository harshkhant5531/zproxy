import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarCheck, Users, BarChart3, Play, Clock, Loader2 } from "lucide-react";
import { sessionsAPI, reportsAPI, coursesAPI } from "@/lib/api";
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
      const resp = await sessionsAPI.getSessions({ date: today, facultyId: user?.id });
      return resp.data.data.sessions;
    },
    enabled: !!user?.id
  });

  const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ["faculty", "performance"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    }
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["faculty", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const courses = resp.data.data.courses || [];
      return courses.filter((c: any) => c.facultyId === user?.id);
    },
    enabled: !!user?.id
  });

  const isLoading = isSessionsLoading || isPerformanceLoading || isCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const todaySessions = sessionsData || [];
  const completedToday = todaySessions.filter((s: any) => s.status === "completed").length;

  const attainmentData = performanceData?.students?.slice(0, 6).map((s: any) => ({
    name: s.student?.studentProfile?.fullName?.split(' ').map((n: string) => n[0]).join('') || s.student?.username?.substring(0, 3).toUpperCase() || "STU",
    attainment: s.averagePercentage || 0
  })) || [];

  const recentActivity = todaySessions.slice(0, 3).map((s: any) => ({
    text: `Session: ${s.topic} (${s.course?.code})`,
    time: s.status === "completed" ? "Completed" : `Scheduled for ${s.startTime}`,
    type: s.status
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Faculty Dashboard</h1>
        <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">{user?.profile?.fullName || user?.username} • Academic Hub</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Sessions" value={todaySessions.length.toString()} subtitle={`${completedToday} completed, ${todaySessions.length - completedToday} upcoming`} icon={CalendarCheck} />
        <StatCard title="Assigned Courses" value={coursesData?.length.toString() || "0"} subtitle="Active semester" icon={Users} />
        <StatCard title="Class Average" value={`${performanceData?.statistics?.classAverage || 0}%`} icon={BarChart3} />
        <StatCard title="Total Students" value={performanceData?.statistics?.totalStudents?.toString() || "0"} subtitle="In assigned courses" icon={Users} />
      </div>

      {/* Today's Sessions */}
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6">
          <CardTitle className="text-sm font-medium text-slate-300">Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-6 pb-6">
          {todaySessions.length > 0 ? (
            todaySessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between rounded-xl bg-slate-950/40 border border-slate-800/50 p-4 transition-all hover:border-primary/30">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white uppercase tracking-tight">{session.course?.code} — {session.topic}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-primary/70" />{session.startTime} - {session.endTime}</span>
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded text-[10px]">{session.roomNumber || "Online"}</span>
                    <span className="text-primary/80 font-bold">{session.attendanceCount} records</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={session.status === "scheduled" ? "default" : "outline"}
                  className={session.status === "scheduled" ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-slate-800 text-slate-400 hover:text-white"}
                  onClick={() => navigate(`/faculty/session/${session.id}`)}
                >
                  {session.status === "scheduled" ? <><Play className="mr-2 h-3.5 w-3.5 fill-current" />Start Session</> : "View Details"}
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <Clock className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-400">No sessions scheduled for today</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Top Performance Overview</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={attainmentData}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" }}
                />
                <Bar dataKey="attainment" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Activity & Logs</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.5)] shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm text-slate-200 font-medium leading-none">{item.text}</p>
                  <p className="text-[11px] text-slate-500 font-mono italic">{item.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
