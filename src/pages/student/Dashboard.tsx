import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { GraduationCap, CalendarCheck, Clock, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { attendanceAPI, reportsAPI, coursesAPI } from "@/lib/api";
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: attendanceStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["student", "attendance-stats", user?.id],
    queryFn: async () => {
      const resp = await reportsAPI.attendance({ studentId: user?.id });
      return resp.data.data.statistics;
    },
    enabled: !!user?.id
  });

  const { data: attendanceRecords, isLoading: isLogsLoading } = useQuery({
    queryKey: ["student", "attendance-logs", user?.id],
    queryFn: async () => {
      const resp = await attendanceAPI.getAttendance({ studentId: user?.id, limit: 100 });
      return resp.data.data.attendanceRecords || [];
    },
    enabled: !!user?.id
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["student", "courses", user?.id],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const courses = resp.data.data.courses || [];
      return courses.filter((c: any) =>
        c.students?.some((s: any) => s.id === user?.id)
      );
    },
    enabled: !!user?.id
  });

  const isLoading = isStatsLoading || isLogsLoading || isCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const records: any[] = Array.isArray(attendanceRecords) ? attendanceRecords : [];
  const courses: any[] = Array.isArray(coursesData) ? coursesData : [];

  // --- Real weekly attendance chart ---
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const weeklyData = DAY_LABELS.map((day, idx) => {
    const dayRecords = records.filter((r: any) => {
      if (!r.session?.date) return false;
      try {
        const date = parseISO(r.session.date);
        return isWithinInterval(date, { start: weekStart, end: weekEnd }) && date.getDay() === (idx + 1) % 7;
      } catch {
        return false;
      }
    });
    const present = dayRecords.filter((r: any) => r.status === "present").length;
    return { day, present, total: dayRecords.length };
  });

  // --- Per-course real attendance ---
  const courseAttendanceData = courses.map((course: any) => {
    const courseRecords = records.filter((r: any) => r.session?.courseId === course.id);
    const total = courseRecords.length;
    const present = courseRecords.filter((r: any) => r.status === "present").length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { ...course, attendancePct: pct };
  });

  const flaggedCourses = courseAttendanceData.filter((c: any) => c.attendancePct < 75 && records.length > 0);
  const recentLogs = records.slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground uppercase aura-text-glow">Performance Analytics</h1>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-1">
          Authorized Sector // {user?.profile?.fullName || user?.username} // {user?.profile?.enrollmentNumber || "Student"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Overall Attendance" value={`${attendanceStats?.attendanceRate || 0}%`} icon={GraduationCap} trend={{ value: 0, label: "real-time" }} />
        <StatCard title="This Week" value={weeklyData.reduce((a, d) => a + d.present, 0).toString()} subtitle={`${weeklyData.reduce((a, d) => a + d.total, 0)} classes this week`} icon={CalendarCheck} />
        <StatCard title="Total Present" value={attendanceStats?.presentCount?.toString() || "0"} subtitle="Current semester" icon={Clock} />
        <StatCard title="Flagged Courses" value={flaggedCourses.length.toString()} subtitle="Below 75% attendance" icon={TrendingUp} iconClassName={flaggedCourses.length > 0 ? "bg-destructive/10" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/40 border-border backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">This Week's Attendance</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" }}
                />
                <Bar dataKey="present" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={20} name="Present" />
                <Bar dataKey="total" fill="hsl(222 30% 18%)" radius={[4, 4, 0, 0]} barSize={20} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/40 border-border backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">OBE Progress by Course</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-6 pb-6 h-[200px] overflow-y-auto custom-scrollbar">
            {courseAttendanceData.map((course: any) => (
              <div key={course.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium font-mono tracking-tight">{course.code} — {course.name}</span>
                  <span className={`font-mono font-bold ${course.attendancePct < 75 ? "text-rose-400" : "text-primary"}`}>{course.attendancePct}%</span>
                </div>
                <Progress value={course.attendancePct} className="h-1.5 bg-slate-800" />
              </div>
            ))}
            {courseAttendanceData.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No enrolled courses found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/40 border-border backdrop-blur-sm">
        <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Recent Attendance Log</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="rounded-xl border border-slate-800/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Date</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Course</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Topic</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log: any) => (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-white/5 transition-colors">
                    <TableCell className="text-xs text-slate-500 font-mono">
                      {log.session?.date ? format(parseISO(log.session.date), "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-bold text-white uppercase tracking-tight">{log.session?.course?.code || "N/A"}</TableCell>
                    <TableCell className="text-sm text-slate-300 italic">{log.session?.topic}</TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recentLogs.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-12">No recent logs found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
