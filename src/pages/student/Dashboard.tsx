/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  GraduationCap,
  CalendarCheck,
  Clock,
  TrendingUp,
  MapPin,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { attendanceAPI, reportsAPI, coursesAPI, sessionsAPI } from "@/lib/api";
import {
  format,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { toast } from "sonner";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ATTENDANCE_EARLY_WINDOW_MINUTES = 10;
const ATTENDANCE_LATE_GRACE_MINUTES = 10;

const parseClockTimeToMinutes = (value?: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const { data: activeSessionsData, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["student", "active-sessions", user?.id],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions({
        timetableOnly: true,
        limit: 30,
      });
      return resp.data.data.sessions || [];
    },
    enabled: !!user?.id,
  });

  const isLoading =
    isStatsLoading || isLogsLoading || isCoursesLoading || isSessionsLoading;

  const records: any[] = Array.isArray(attendanceRecords)
    ? attendanceRecords
    : [];
  const courses: any[] = Array.isArray(coursesData) ? coursesData : [];
  const activeSessions: any[] = Array.isArray(activeSessionsData)
    ? activeSessionsData
    : [];

  const markAttendanceMutation = useMutation({
    mutationFn: async (session: any) => {
      const deviceInfo = [
        navigator.userAgent,
        navigator.platform,
        navigator.language,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 180);
      return attendanceAPI.markAttendance({
        sessionId: session.id,
        deviceInfo,
      });
    },
    onSuccess: (resp: any) => {
      const attendance = resp?.data?.data?.attendance;
      const wasProxyFlagged =
        attendance?.status === "absent" &&
        typeof attendance?.notes === "string" &&
        attendance.notes.includes("[PROXY_");

      if (wasProxyFlagged) {
        toast.error("Attendance flagged for security review", {
          description:
            "Check-in was recorded as absent due to a proxy-risk signal.",
        });
      } else {
        toast.success("Attendance marked successfully");
      }

      queryClient.invalidateQueries({
        queryKey: ["student", "attendance-logs"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "attendance-stats"],
      });
      queryClient.invalidateQueries({
        queryKey: ["student", "active-sessions"],
      });
    },
    onError: (error: any) => {
      const reason = error?.response?.data?.reason;
      const message = error?.response?.data?.message;

      if (reason === "duplicate_attendance") {
        toast.info("Attendance already marked for this session");
        return;
      }

      if (reason === "proxy_same_device_session") {
        toast.error("Attendance blocked by security checks", {
          description:
            "This device fingerprint was already used by another student in this session.",
        });
        return;
      }

      if (reason === "session_not_started") {
        toast.info(message || "Check-in has not opened yet for this session.");
        return;
      }

      if (
        reason === "session_checkin_window_closed" ||
        reason === "session_closed" ||
        reason === "attendance_not_on_session_day"
      ) {
        toast.error(message || "Check-in window is closed for this session.");
        return;
      }

      if (reason === "missing_device_fingerprint") {
        toast.error("Device verification data is missing. Refresh and retry.");
        return;
      }

      if (reason === "outside_campus_wifi") {
        toast.error("Connect to campus WiFi to mark attendance", {
          description:
            message ||
            "Attendance check-in is allowed only from the approved campus network.",
        });
        return;
      }

      toast.error(message || "Failed to mark attendance");
    },
  });

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openSessions = activeSessions.filter((session: any) => {
    if (session?.status === "completed") return false;

    const startMinutes = parseClockTimeToMinutes(session?.startTime);
    const endMinutes = parseClockTimeToMinutes(session?.endTime);

    if (startMinutes === null || endMinutes === null) return true;

    return (
      nowMinutes >= startMinutes - ATTENDANCE_EARLY_WINDOW_MINUTES &&
      nowMinutes <= endMinutes + ATTENDANCE_LATE_GRACE_MINUTES
    );
  });

  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
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

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Student Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.profile?.fullName || user?.username}
            {user?.profile?.enrollmentNumber
              ? ` · ${user.profile.enrollmentNumber}`
              : ""}
          </p>
        </div>
        <Badge variant="outline">
          Week {format(now, "w")} · {format(now, "MMM yyyy")}
        </Badge>
      </div>

      {/* Mark Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-primary" />
            Mark Attendance
          </CardTitle>
          <CardDescription>
            {activeSessions.length > 0
              ? `${activeSessions.length} session(s) open for check-in (within scheduled time)`
              : "No check-in windows are open right now. Sessions appear here only during class time (with a short grace period)."}
            {openSessions.length > 0
              ? `${openSessions.length} active session(s) open for check-in`
              : "No active sessions right now"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {openSessions.length > 0 ? (
            openSessions.map((session: any) => {
              const alreadyMarked = records.some(
                (r: any) => Number(r.sessionId) === Number(session.id),
              );
              const isMarkingCurrent =
                markAttendanceMutation.isPending &&
                markAttendanceMutation.variables?.id === session.id;

              return (
                <div
                  key={session.id}
                  className="flex flex-col items-start justify-between gap-3 rounded-lg border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {session.subject?.name || session.topic}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.course?.code || "Course"} · {session.startTime}–
                      {session.endTime}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {alreadyMarked ? (
                      <Badge variant="secondary">Marked</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => markAttendanceMutation.mutate(session)}
                        disabled={
                          isMarkingCurrent || markAttendanceMutation.isPending
                        }
                      >
                        {isMarkingCurrent ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                            Marking
                          </>
                        ) : (
                          "Mark Now"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No sessions are open for attendance right now.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Attendance"
          value={`${attendanceStats?.attendanceRate || 0}%`}
          icon={GraduationCap}
          className="h-full"
        />
        <StatCard
          title="This Week"
          value={weeklyData.reduce((a, d) => a + d.present, 0).toString()}
          subtitle={`of ${weeklyData.reduce((a, d) => a + d.total, 0)} classes`}
          icon={CalendarCheck}
          className="h-full"
        />
        <StatCard
          title="Total Present"
          value={attendanceStats?.presentCount?.toString() || "0"}
          subtitle="This semester"
          icon={Clock}
          className="h-full"
        />
        <StatCard
          title="Flagged Courses"
          value={flaggedCourses.length.toString()}
          subtitle="Below 75%"
          icon={TrendingUp}
          className="h-full"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">This Week's Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 6,
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
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

        {/* Course Attendance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance by Course</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[260px] overflow-y-auto">
            {courseAttendanceData.map((course: any) => (
              <div key={course.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {course.code} — {course.name}
                  </span>
                  <span
                    className={
                      course.attendancePct < 75
                        ? "font-semibold text-destructive"
                        : "font-semibold text-primary"
                    }
                  >
                    {course.attendancePct}%
                  </span>
                </div>
                <Progress value={course.attendancePct} className="h-2" />
              </div>
            ))}
            {courseAttendanceData.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No enrolled courses found
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Attendance Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.session?.date
                      ? format(parseISO(log.session.date), "MMM dd, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {log.session?.course?.code || "N/A"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.session?.topic}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={log.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {recentLogs.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No recent logs found
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
