import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, BookOpen, GraduationCap, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, usersAPI, coursesAPI } from "@/lib/api";

export default function AdminDashboard() {
  const { data: deptData, isLoading: isDeptsLoading } = useQuery({
    queryKey: ["admin", "departments"],
    queryFn: async () => {
      const resp = await reportsAPI.getDepartmentReports();
      return resp.data.data.departments;
    }
  });

  const { data: studentsData, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const resp = await usersAPI.getUsers();
      // Backend returns { success: true, data: { users: [...], pagination: { ... } } }
      const users = resp.data.data.users || [];
      return users.filter((u: any) => u.role === "student");
    }
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      // Backend returns { success: true, data: { courses: [...], pagination: { ... } } }
      return resp.data.data.courses || [];
    }
  });

  const isLoading = isDeptsLoading || isStudentsLoading || isCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const deptChart = deptData?.map((d: any) => ({
    name: d.department,
    avg: d.averageAttendance,
    students: d.totalStudents
  })) || [];

  const avgAttendance = deptData?.length
    ? (deptData.reduce((acc: number, d: any) => acc + d.averageAttendance, 0) / deptData.length).toFixed(1)
    : "0";

  // Identify shortage students (mocking logic since we don't have a direct endpoint for threshold yet)
  // In a real scenario, we'd fetch actual attendance records
  const shortageStudents = []; // Simplified for now

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 font-mono uppercase tracking-wider">Aura Integrity Engine • System Overview</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={studentsData?.length.toString() || "0"} icon={Users} trend={{ value: 0, label: "real-time" }} />
        <StatCard title="Active Courses" value={coursesData?.length.toString() || "0"} subtitle={`Across ${deptData?.length || 0} departments`} icon={BookOpen} />
        <StatCard title="Avg Attendance" value={`${avgAttendance}%`} trend={{ value: 0, label: "current" }} icon={TrendingUp} />
        <StatCard title="Flagged Students" value="0" subtitle="Below 75% threshold" icon={AlertTriangle} iconClassName="bg-destructive/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-300">Department Attendance</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptChart}>
                <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" }}
                />
                <Bar dataKey="avg" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-300">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Shortage Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 h-[260px] overflow-y-auto custom-scrollbar">
            {shortageStudents.length > 0 ? (
              shortageStudents.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{s.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{s.id} • {s.department}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">{s.attendance}%</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <AlertTriangle className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Clear system status</p>
                <p className="text-xs">No attendance shortages detected</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {deptData?.map((dept: any) => (
          <Card key={dept.department} className="bg-slate-900/40 border-slate-800 hover:border-primary/50 transition-colors group">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{dept.department}</h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {dept.averageAttendance}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Courses: <span className="text-slate-200">{dept.totalCourses}</span></span>
                  <span>Students: <span className="text-slate-200">{dept.totalStudents}</span></span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>Faculty: <span className="text-slate-200">{dept.totalFaculty}</span></span>
                  <span>Avg Marks: <span className="text-slate-200">{dept.averageMarks}</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
