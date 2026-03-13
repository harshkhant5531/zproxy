/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GraduationCap, CalendarCheck, Clock, TrendingUp } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { attendanceAPI, reportsAPI, coursesAPI } from "@/lib/api";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from "date-fns";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function StudentDashboard() {
  const { user } = useAuth();

  const { data: attendanceStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["student", "attendance-stats", user?.id],
    queryFn: async () => {
      const resp = await reportsAPI.attendance({ studentId: user?.id });
      return resp.data.data.statistics;
    },
    enabled: !!user?.id,
  });

  const { data: attendanceRecords, isLoading: isLogsLoading } = useQuery({
    queryKey: ["student", "attendance-logs", user?.id],
    queryFn: async () => {
      const resp = await attendanceAPI.getAttendance({
        studentId: user?.id,
        limit: 100,
      });
      return resp.data.data.attendanceRecords || [];
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

  const isLoading = isStatsLoading || isLogsLoading || isCoursesLoading;

  const records: any[] = Array.isArray(attendanceRecords)
    ? attendanceRecords
    : [];
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
        return (
          isWithinInterval(date, { start: weekStart, end: weekEnd }) &&
          date.getDay() === (idx + 1) % 7
        );
      } catch {
        return false;
      }
    });
    const present = dayRecords.filter(
      (r: any) => r.status === "present",
    ).length;
    return { day, present, total: dayRecords.length };
  });

  // --- Per-course real attendance ---
  const courseAttendanceData = courses.map((course: any) => {
    const courseRecords = records.filter(
      (r: any) => r.session?.courseId === course.id,
    );
    const total = courseRecords.length;
    const present = courseRecords.filter(
      (r: any) => r.status === "present",
    ).length;
    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { ...course, attendancePct: pct };
  });

  const flaggedCourses = courseAttendanceData.filter(
    (c: any) => c.attendancePct < 75 && records.length > 0,
  );
  const recentLogs = records.slice(0, 10);

  if (isLoading) return <FullScreenLoader show operation="loading" />;

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="page-header-title">Student Dashboard</h1>
          <p className="page-header-sub">
            {user?.profile?.fullName || user?.username}
            {user?.profile?.enrollmentNumber
              ? ` (${user.profile.enrollmentNumber})`
              : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 motion-stagger">
        <Card className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Weekly Present
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {weeklyData.reduce((a, d) => a + d.present, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Weekly Sessions
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {weeklyData.reduce((a, d) => a + d.total, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border/70 bg-card/70">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Below Threshold
            </p>
            <p className="text-2xl font-semibold text-foreground mt-1">
              {flaggedCourses.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 motion-stagger">
        <div>
          <StatCard
            title="Overall Attendance"
            value={`${attendanceStats?.attendanceRate || 0}%`}
            icon={GraduationCap}
            trend={{ value: 0, label: "real-time" }}
          />
        </div>
        <div>
          <StatCard
            title="This Week"
            value={weeklyData.reduce((a, d) => a + d.present, 0).toString()}
            subtitle={`${weeklyData.reduce((a, d) => a + d.total, 0)} classes this week`}
            icon={CalendarCheck}
          />
        </div>
        <div>
          <StatCard
            title="Total Present"
            value={attendanceStats?.presentCount?.toString() || "0"}
            subtitle="Current semester"
            icon={Clock}
          />
        </div>
        <div>
          <StatCard
            title="Flagged Courses"
            value={flaggedCourses.length.toString()}
            subtitle="Below 75% attendance"
            icon={TrendingUp}
            iconClassName={
              flaggedCourses.length > 0
                ? "bg-destructive/10 border-destructive/20"
                : undefined
            }
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          className="bg-card border border-border shadow-sm motion-slide-up"
          style={{ animationDelay: "280ms" }}
        >
          <CardHeader className="card-header-muted py-4 px-6">
            <CardTitle className="text-sm font-semibold text-foreground">
              This Week's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="day"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 12,
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar
                  dataKey="present"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  name="Present"
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--muted))"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  name="Total"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card
          className="bg-card border border-border shadow-sm motion-slide-up"
          style={{ animationDelay: "280ms" }}
        >
          <CardHeader className="card-header-muted py-4 px-6">
            <CardTitle className="text-sm font-semibold text-foreground">
              Attendance by Course
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-6 pb-6 pt-4 max-h-[260px] overflow-y-auto">
            {courseAttendanceData.map((course: any, i: number) => (
              <div
                key={course.id}
                className="space-y-1.5 motion-slide-up"
                style={{ animationDelay: `${300 + i * 50}ms` }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground font-mono tracking-tight">
                    {course.code} — {course.name}
                  </span>
                  <span
                    className={`font-bold font-mono ${course.attendancePct < 75 ? "text-destructive" : "text-primary"}`}
                  >
                    {course.attendancePct}%
                  </span>
                </div>
                <Progress value={course.attendancePct} className="h-1.5" />
              </div>
            ))}
            {courseAttendanceData.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No enrolled courses found
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border border-border shadow-sm motion-surface">
        <CardHeader className="card-header-muted py-4 px-6">
          <CardTitle className="text-sm font-semibold text-foreground">
            Recent Attendance Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <Table className="motion-table-stagger">
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11 pl-6">
                    Date
                  </TableHead>
                  <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                    Course
                  </TableHead>
                  <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11">
                    Topic
                  </TableHead>
                  <TableHead className="text-muted-foreground/60 font-semibold text-[10px] uppercase tracking-widest h-11 pr-6">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs.map((log: any, i: number) => (
                  <TableRow
                    key={log.id}
                    className="border-border/30 hover:bg-muted/20 transition-colors motion-page-enter"
                    style={{ animationDelay: `${60 + i * 35}ms` }}
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono pl-6">
                      {log.session?.date
                        ? format(parseISO(log.session.date), "MMM dd, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground uppercase tracking-tight">
                      {log.session?.course?.code || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.session?.topic}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge status={log.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recentLogs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">
                No recent logs found
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
