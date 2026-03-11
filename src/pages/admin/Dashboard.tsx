import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
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

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
            Institutional Overview
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-1">
            Global System Metrics // Admin Portal
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Students"
            value={studentsData?.length.toString() || "0"}
            icon={Users}
            className="glass-card aura-glow border-none"
          />
          <StatCard
            title="Staff Faculty"
            value={facultyData?.length.toString() || "0"}
            icon={ShieldAlert}
            className="glass-card aura-glow border-none"
          />
          <StatCard
            title="Active Courses"
            value={coursesData?.length.toString() || "0"}
            subtitle={`${deptData?.length || 0} SECTORS`}
            icon={BookOpen}
            className="glass-card aura-glow border-none"
          />
          <StatCard
            title="Avg Attendance"
            value={`${avgAttendance}%`}
            icon={TrendingUp}
            className="glass-card aura-glow border-none"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="glass-card aura-glow border-none overflow-hidden group">
            <CardHeader className="card-header-muted px-6 py-4">
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
                    className="filter drop-shadow-[0_0_8px_rgba(var(--primary),0.4)]"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass-card aura-glow border-none overflow-hidden group">
            <CardHeader className="card-header-muted px-6 py-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />{" "}
                  Shortage Alerts
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
                shortageStudents.map((s: any) => {
                  const severity =
                    s.attendance < 50
                      ? "CRITICAL"
                      : s.attendance < 65
                        ? "HIGH"
                        : "MODERATE";
                  const colorClass =
                    severity === "CRITICAL"
                      ? "text-rose-500 bg-rose-500/10 border-rose-500/30"
                      : severity === "HIGH"
                        ? "text-orange-500 bg-orange-500/10 border-orange-500/30"
                        : "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/40 p-4 hover:border-destructive/30 transition-all hover:bg-muted/30"
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
                  <ShieldAlert className="h-8 w-8 opacity-30 text-emerald-500" />
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    All clear
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No attendance shortages detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {deptData?.map((dept: any) => (
            <Card
              key={dept.department}
              className="glass-card aura-glow border-none hover:scale-[1.01] transition-all duration-300 group overflow-hidden"
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
    </>
  );
}
