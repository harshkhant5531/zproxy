/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, ShieldAlert, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, usersAPI } from "@/lib/api";
import { toast } from "sonner";

export default function ShortageAlerts() {
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["admin", "students-list"],
    queryFn: async () => {
      const resp = await usersAPI.getUsers({ role: "student" });
      return (
        resp.data.data.users ||
        (Array.isArray(resp.data.data) ? resp.data.data : [])
      );
    },
  });

  const { data: attendanceData, isLoading: isAttLoading } = useQuery({
    queryKey: ["admin", "global-attendance"],
    queryFn: async () => {
      const resp = await reportsAPI.attendance();
      return resp.data.data.reports || [];
    },
  });

  if (isUsersLoading || isAttLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="px-6 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              Loading alerts...
            </span>
          </div>
        </Card>
      </div>
    );
  }

  const students = Array.isArray(usersData) ? usersData : [];
  const reports = Array.isArray(attendanceData) ? attendanceData : [];

  const shortageStudents = students
    .map((s: any) => {
      const studentReports = reports.filter((r) => r.studentId === s.id);
      const total = studentReports.length;
      const present = studentReports.filter(
        (r) => r.status === "present",
      ).length;
      const attendance = total > 0 ? (present / total) * 100 : 0;
      return {
        ...s,
        attendance: parseFloat(attendance.toFixed(1)),
        totalClasses: total,
      };
    })
    .filter((s) => s.attendance < 75 || s.totalClasses === 0)
    .sort((a, b) => a.attendance - b.attendance);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Attendance Alerts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students below the 75% attendance threshold
          </p>
        </div>
        <Badge variant="destructive">
          {shortageStudents.length} Students Flagged
        </Badge>
      </div>

      {/* Threshold Legend */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Critical",
            threshold: "< 50%",
            variant: "destructive" as const,
          },
          {
            label: "High Risk",
            threshold: "50–65%",
            variant: "outline" as const,
          },
          {
            label: "Moderate",
            threshold: "65–75%",
            variant: "secondary" as const,
          },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{item.label}</span>
              <Badge variant={item.variant}>{item.threshold}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flagged Students</CardTitle>
          <CardDescription>
            {shortageStudents.length} students require intervention
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shortageStudents.map((s: any) => {
                const severity =
                  s.attendance < 50
                    ? "Critical"
                    : s.attendance < 65
                      ? "High"
                      : "Moderate";
                const badgeVariant =
                  s.attendance < 50 ? "destructive" : "secondary";

                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium text-sm">
                        {s.studentProfile?.fullName || s.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.studentProfile?.enrollmentNumber || s.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {s.studentProfile?.department || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sem {s.studentProfile?.currentSemester || 1}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-destructive">
                        {s.attendance}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>{severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">
                        {s.studentProfile?.parentPhone || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.studentProfile?.parentEmail || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            toast.info(`Email sent to ${s.username}`)
                          }
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            toast.error(`Escalated: ${s.username}`)
                          }
                        >
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {shortageStudents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    No attendance risks detected
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
