/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, usersAPI, coursesAPI } from "@/lib/api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: deptData, isLoading: isDeptsLoading } = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => {
      const resp = await reportsAPI.getDepartmentReports();
      return resp.data.data.departments;
    },
  });

  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const resp = await usersAPI.getUsers({ role: "student", limit: 1000 });
      return resp.data.data.users || [];
    },
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses({ limit: 1000 });
      return resp.data.data.courses || [];
    },
  });

  const { data: facultyData, isLoading: isFacultyLoading } = useQuery({
    queryKey: ["admin", "faculty"],
    queryFn: async () => {
      const resp = await usersAPI.getUsers({ role: "faculty", limit: 1000 });
      return resp.data.data.users || [];
    },
  });

  const { data: attendanceData, isLoading: isAttLoading } = useQuery({
    queryKey: ["admin", "global-attendance"],
    queryFn: async () => {
      const resp = await reportsAPI.attendance({ limit: 5000 });
      return resp.data.data.reports || [];
    },
  });

  const isLoading =
    isDeptsLoading ||
    isStudentsLoading ||
    isFacultyLoading ||
    isCoursesLoading ||
    isAttLoading;

  const deptChart =
    deptData?.map((d: any) => ({
      name: d.department,
      avg: d.averageAttendance,
      students: d.totalStudents,
    })) || [];

  const avgAttendance = deptData?.length
    ? (
        deptData.reduce((acc: number, d: any) => acc + d.averageAttendance, 0) /
        deptData.length
      ).toFixed(1)
    : "0";

  // Compute shortage students from real attendance data
  const students: any[] = Array.isArray(studentsData) ? studentsData : [];
  const reports: any[] = Array.isArray(attendanceData) ? attendanceData : [];

  const shortageStudents = students
    .map((s: any) => {
      const studentReports = reports.filter((r: any) => r.studentId === s.id);
      const total = studentReports.length;
      const present = studentReports.filter(
        (r: any) => r.status === "present",
      ).length;
      const attendance =
        total > 0 ? parseFloat(((present / total) * 100).toFixed(1)) : 0;
      return { ...s, attendance, totalClasses: total };
    })
    .filter((s: any) => s.attendance < 75 && s.totalClasses > 0)
    .sort((a: any, b: any) => a.attendance - b.attendance)
    .slice(0, 6);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Institutional Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global system metrics for admin operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
          >
            Central Analytics
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-warning/30 bg-warning/10 text-warning px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
          >
            Risk Students: {shortageStudents.length}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="">
          <StatCard
            title="Total Students"
            value={studentsData?.length.toString() || "0"}
            icon={Users}
            className=""
          />
        </div>
        <div className="">
          <StatCard
            title="Staff Faculty"
            value={facultyData?.length.toString() || "0"}
            icon={ShieldAlert}
            className=""
          />
        </div>
        <div className="">
          <StatCard
            title="Active Courses"
            value={coursesData?.length.toString() || "0"}
            subtitle={`${deptData?.length || 0} sectors`}
            icon={BookOpen}
            className="bg-card border border-border shadow-sm"
          />
        </div>
        <div className="">
          <StatCard
            title="Avg Attendance"
            value={`${avgAttendance}%`}
            icon={TrendingUp}
            className="bg-card border border-border shadow-sm"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="overflow-hidden group">
          <CardHeader className="border-b bg-muted/40 px-6 py-4">
            <CardTitle className="text-sm font-semibold text-foreground">
              Department Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptChart}>
                <XAxis
                  dataKey="name"
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                    fontWeight: "bold",
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{
                    fill: "hsl(var(--muted-foreground))",
                    fontSize: 10,
                  }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar
                  dataKey="avg"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 2, 2]}
                  barSize={45}
                  className="filter drop-shadow-[0_0_8px_hsl(var(--primary)/0.35)]"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden group">
          <CardHeader className="border-b bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Shortage
                Alerts
              </CardTitle>
              {shortageStudents.length > 0 && (
                <Link
                  to="/admin/alerts"
                  className="text-[10px] font-semibold text-primary uppercase tracking-widest hover:underline"
                >
                  View All →
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-6 h-[260px] overflow-y-auto custom-scrollbar">
            {shortageStudents.length > 0 ? (
              shortageStudents.map((s: any, i: number) => {
                const severity =
                  s.attendance < 50
                    ? "CRITICAL"
                    : s.attendance < 65
                      ? "HIGH"
                      : "MODERATE";
                const colorClass =
                  severity === "CRITICAL"
                    ? "text-destructive bg-destructive/10 border-destructive/30"
                    : severity === "HIGH"
                      ? "text-warning bg-warning/10 border-warning/30"
                      : "text-warning bg-warning/10 border-warning/30";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/60 p-4 hover:border-destructive/30 transition-all hover:bg-muted/40"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {s.studentProfile?.fullName || s.username}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono uppercase opacity-70">
                        {s.studentProfile?.enrollmentNumber || s.id} ·{" "}
                        {s.studentProfile?.department || "—"}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${colorClass}`}
                      >
                        {severity}
                      </span>
                      <span className="text-sm font-bold text-destructive font-mono">
                        {s.attendance}%
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <ShieldAlert className="h-8 w-8 opacity-30 text-success" />
                <p className="text-sm font-medium text-success">All clear</p>
                <p className="text-xs text-muted-foreground">
                  No attendance shortages detected
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {deptData?.map((dept: any, i: number) => (
          <Card
            key={dept.department}
            className="hover:scale-[1.01] transition-all duration-300 group overflow-hidden"
          >
            <CardContent className="p-5 relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-primary/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate pr-2">
                  {dept.department}
                </h3>
                <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                  {dept.averageAttendance}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 relative z-10">
                <span className="text-[11px] text-muted-foreground">
                  Courses:{" "}
                  <span className="text-foreground font-semibold">
                    {dept.totalCourses}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Students:{" "}
                  <span className="text-foreground font-semibold">
                    {dept.totalStudents}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Faculty:{" "}
                  <span className="text-foreground font-semibold">
                    {dept.totalFaculty}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Avg Marks:{" "}
                  <span className="text-foreground font-semibold">
                    {dept.averageMarks}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
