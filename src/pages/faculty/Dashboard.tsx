import { StatCard } from "@/components/StatCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck,
  Users,
  BarChart3,
  Play,
  Clock,
  BookOpen,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { sessionsAPI, reportsAPI, subjectsAPI } from "@/lib/api";
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
      const resp = await sessionsAPI.getSessions({
        date: today,
        facultyId: user?.id,
      });
      return resp.data.data.sessions;
    },
    enabled: !!user?.id,
  });

  const { data: performanceData, isLoading: isPerformanceLoading } = useQuery({
    queryKey: ["faculty", "performance"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    },
  });

  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["faculty", "subjects"],
    queryFn: async () => {
      const resp = await subjectsAPI.getSubjects({ facultyId: user?.id });
      return resp.data.data.subjects || [];
    },
    enabled: !!user?.id,
  });

  const isLoading =
    isSessionsLoading || isPerformanceLoading || isSubjectsLoading;

  const todaySessions = sessionsData || [];
  const completedToday = todaySessions.filter(
    (s: any) => s.status === "completed",
  ).length;

  const attainmentData =
    performanceData?.students?.slice(0, 6).map((s: any) => ({
      name:
        s.student?.studentProfile?.fullName
          ?.split(" ")
          .map((n: string) => n[0])
          .join("") ||
        s.student?.username?.substring(0, 3).toUpperCase() ||
        "STU",
      attainment: s.averagePercentage || 0,
    })) || [];

  const recentActivity = todaySessions.slice(0, 3).map((s: any) => ({
    text: `${s.subject?.name || s.topic}`,
    subtext: `Ref: ${s.course?.code}`,
    time: s.status === "completed" ? "Completed" : `Starts @ ${s.startTime}`,
    type: s.status,
  }));

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading dashboard...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Faculty Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {user?.profile?.fullName || user?.username}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Daily Ops</Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/faculty/records")}
          >
            Audit History <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sessions"
          value={todaySessions.length.toString()}
          subtitle={`${completedToday} completed`}
          icon={CalendarCheck}
          className="h-full"
        />
        <StatCard
          title="Assigned Subjects"
          value={subjectsData?.length?.toString() || "0"}
          subtitle="Active academic session"
          icon={BookOpen}
          className="h-full"
        />
        <StatCard
          title="Class Average"
          value={`${performanceData?.statistics?.classAverage || 0}%`}
          subtitle="Across all subjects"
          icon={BarChart3}
          className="h-full"
        />
        <StatCard
          title="Total Students"
          value={performanceData?.statistics?.totalStudents?.toString() || "0"}
          subtitle="Enrolled students"
          icon={Users}
          className="h-full"
        />
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            {todaySessions.length} sessions scheduled for today
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaySessions.length > 0 ? (
            todaySessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {session.subject?.name || session.course?.code} —{" "}
                    {session.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.startTime} – {session.endTime}
                    {session.roomNumber ? ` · Room ${session.roomNumber}` : ""}
                    {" · "}
                    {session.attendanceCount || 0} present
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={
                    session.status === "scheduled" ? "default" : "outline"
                  }
                  onClick={() => navigate(`/faculty/session/${session.id}`)}
                >
                  {session.status === "scheduled" ? (
                    <>
                      <Play className="mr-1 h-3.5 w-3.5" />
                      Start
                    </>
                  ) : (
                    "View"
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-3 h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No sessions scheduled for today
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attainment Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Student Attainment</CardTitle>
            <CardDescription>Average attendance % per student</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={attainmentData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="attainment"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest session updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentActivity.length > 0 ? (
              recentActivity.map((item, i) => (
                <div key={i}>
                  <div className="flex items-start gap-3 py-3">
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{item.text}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.subtext} · {item.time}
                      </p>
                    </div>
                  </div>
                  {i < recentActivity.length - 1 && <Separator />}
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
