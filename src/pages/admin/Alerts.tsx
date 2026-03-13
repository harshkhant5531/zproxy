import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
} from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
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
    return <div className="flex h-[60vh] items-center justify-center" />;
  }

  // Calculate shortage students client-side for dynamic thresholding
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
    <>
      <FullScreenLoader
        show={isUsersLoading || isAttLoading}
        operation="loading"
      />
      <div className="app-page">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-500" /> Attendance
              Alerts
            </h1>
            <p className="page-header-sub">
              Monitor students below attendance threshold
            </p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500" />
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
              {shortageStudents.length} Students Flagged
            </p>
          </div>
        </div>

        <Card className="bg-card/75 border-rose-500/25 backdrop-blur-md shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-rose-600 to-transparent" />
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/35 dark:bg-muted/20">
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11 pl-6">
                    Student Information
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11">
                    Department
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11">
                    Attendance Rate
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11">
                    Parent Contacts
                  </TableHead>
                  <TableHead className="text-muted-foreground font-medium text-[10px] uppercase tracking-wider h-11 text-right pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortageStudents.map((s: any) => {
                  const severity =
                    s.attendance < 50
                      ? "CRITICAL"
                      : s.attendance < 65
                        ? "HIGH"
                        : "MODERATE";
                  const severityColor =
                    severity === "CRITICAL"
                      ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                      : severity === "HIGH"
                        ? "text-orange-500 bg-orange-500/10 border-orange-500/20"
                        : "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";

                  return (
                    <TableRow
                      key={s.id}
                      className="border-border/50 hover:bg-rose-500/8 transition-colors"
                    >
                      <TableCell className="pl-6">
                        <p className="font-bold text-sm text-foreground">
                          {s.studentProfile?.fullName || s.username}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          ID: {s.studentProfile?.enrollmentNumber || s.id}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-foreground/85 font-medium">
                        {s.studentProfile?.department || "N/A"}
                        <span className="block text-[10px] text-muted-foreground font-bold">
                          Semester: {s.studentProfile?.currentSemester || 1}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-black text-sm text-rose-500 font-mono tracking-tighter shadow-rose-500/40 drop-shadow-sm">
                          {s.attendance}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded border font-black tracking-widest ${severityColor}`}
                        >
                          {severity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {s.studentProfile?.parentPhone || "NO CONTACT"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/85 italic truncate max-w-[150px]">
                          {s.studentProfile?.parentEmail || "NO EMAIL"}
                        </p>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() =>
                              toast.info(`Dispatching memo to ${s.username}`)
                            }
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground/80 hover:text-rose-500"
                            onClick={() =>
                              toast.error(`Inhibiting user access for ${s.id}`)
                            }
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
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
                      className="h-32 text-center text-muted-foreground italic font-mono uppercase tracking-[0.5em] text-[10px]"
                    >
                      Neural integrity 100% — No breaches detected
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {[
            { label: "Critical Threshold", value: "50%", color: "bg-rose-500" },
            { label: "High Sensitivity", value: "65%", color: "bg-orange-500" },
            { label: "Watchlist Target", value: "75%", color: "bg-yellow-500" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-card/70 p-3 border border-border/70 rounded-lg flex items-center justify-between"
            >
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                {item.label}
              </span>
              <span
                className={`text-xs font-black ${item.color.replace("bg-", "text-")} font-mono`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
