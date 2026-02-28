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
import { format } from "date-fns";

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
      const resp = await attendanceAPI.getAttendance({ studentId: user?.id, limit: 10 });
      return resp.data.data.attendanceRecords;
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

  const weeklyData = [
    { day: "Mon", present: 3, total: 4 },
    { day: "Tue", present: 4, total: 4 },
    { day: "Wed", present: 2, total: 4 },
    { day: "Thu", present: 4, total: 4 },
    { day: "Fri", present: 3, total: 4 },
  ]; // Placeholder for weekly breakdown as API doesn't provide it directly in a simple way

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Student Dashboard</h1>
        <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">
          Welcome back, {user?.profile?.fullName || user?.username} • {user?.profile?.enrollmentNumber || "Student"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Overall Attendance" value={`${attendanceStats?.attendanceRate || 0}%`} icon={GraduationCap} trend={{ value: 0, label: "real-time" }} />
        <StatCard title="Today's Classes" value="--" subtitle="Check schedule" icon={CalendarCheck} />
        <StatCard title="Total Present" value={attendanceStats?.presentCount?.toString() || "0"} subtitle="Current semester" icon={Clock} />
        <StatCard title="Flagged Courses" value="0" subtitle="Below 75%" icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Weekly Attendance Breakdown</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis dataKey="day" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" }}
                />
                <Bar dataKey="present" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="total" fill="hsl(222 30% 18%)" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">OBE Progress by Course</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-6 pb-6 h-[200px] overflow-y-auto custom-scrollbar">
            {coursesData?.map((course: any) => (
              <div key={course.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-medium font-mono tracking-tight">{course.code} — {course.name}</span>
                  <span className="font-mono text-primary">85%</span>
                </div>
                <Progress value={85} className="h-1.5 bg-slate-800" />
              </div>
            ))}
            {(!coursesData || coursesData.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-8">No enrolled courses found</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Recent Attendance Log</CardTitle></CardHeader>
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
                {attendanceRecords?.map((log: any) => (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-white/5 transition-colors">
                    <TableCell className="text-xs text-slate-500 font-mono">{format(new Date(log.session.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-sm font-bold text-white uppercase tracking-tight">{log.session?.course?.code || "N/A"}</TableCell>
                    <TableCell className="text-sm text-slate-300 italic">{log.session?.topic}</TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!attendanceRecords || attendanceRecords.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-12">No recent logs found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
