import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Printer,
  BookOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { timetableAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { FullScreenLoader } from "@/components/FullScreenLoader";

interface TimetableEntry {
  id: number;
  courseId: number;
  subjectId: number;
  facultyId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber: string;
  type: string;
  semester: number;
  course?: { id: number; code: string; name: string };
  subject?: { id: number; name: string };
  faculty?: { id: number; profile?: { fullName?: string }; username?: string };
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const dayShort = ["MON", "TUE", "WED", "THU", "FRI"];
const timeSlots = [
  { start: "07:45", end: "09:35", label: "Period 1" },
  { start: "09:50", end: "11:30", label: "Period 2" },
  { start: "12:10", end: "13:50", label: "Period 3" },
];

const typeColors: Record<string, string> = {
  Practical: "bg-violet-500/10 border-violet-500/30 text-violet-400",
  Lab: "bg-violet-500/10 border-violet-500/30 text-violet-400",
  Theory: "bg-primary/10 border-primary/30 text-primary",
  Tutorial: "bg-amber-500/10 border-amber-500/30 text-amber-400",
};

export default function StudentTimetable() {
  const { user } = useAuth();

  const { data: timetableData, isLoading } = useQuery<TimetableEntry[]>({
    queryKey: ["student", "timetable", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // GET /api/timetable auto-filters by enrolled courses for student role
      const resp = await timetableAPI.getTimetable({ limit: 200 });
      return resp.data.data?.timetableEntries ?? [];
    },
    enabled: !!user?.id,
  });

  const entries = Array.isArray(timetableData) ? timetableData : [];

  const today = new Date().getDay(); // 0=Sun, 1=Mon … 6=Sat
  const todayIdx = today >= 1 && today <= 5 ? today - 1 : -1;

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" /> Academic Schedule
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {user?.profile?.fullName || user?.username} &mdash; Current
              Semester
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>

        {/* Timetable grid */}
        <Card className="glass-card aura-glow border-none overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Column headers */}
              <div className="grid grid-cols-[130px_repeat(5,1fr)] bg-muted/20 border-b border-border/40">
                <div className="p-3.5 flex items-center gap-1.5 text-xs font-semibold text-foreground/75 uppercase tracking-wide">
                  <Clock className="h-3 w-3" /> Time
                </div>
                {days.map((day, i) => (
                  <div
                    key={day}
                    className={`p-3.5 text-center text-sm font-semibold uppercase tracking-wide border-l border-border/30 transition-colors ${
                      i === todayIdx ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {dayShort[i]}
                    {i === todayIdx && (
                      <span className="block h-0.5 w-4 bg-primary rounded-full mx-auto mt-1" />
                    )}
                  </div>
                ))}
              </div>

              {/* Time slot rows */}
              {timeSlots.map((slot) => (
                <div
                  key={slot.start}
                  className="grid grid-cols-[130px_repeat(5,1fr)] border-b border-border/20 last:border-0"
                >
                  <div className="p-3.5 flex flex-col justify-center bg-muted/10">
                    <span className="text-xs font-mono text-foreground/75">
                      {slot.start}
                    </span>
                    <span className="text-xs font-mono text-foreground/55">
                      – {slot.end}
                    </span>
                    <span className="text-[10px] text-foreground/45 uppercase tracking-wide mt-0.5">
                      {slot.label}
                    </span>
                  </div>

                  {days.map((day, dayIdx) => {
                    const session = entries.find(
                      (e) =>
                        e.dayOfWeek === dayIdx + 1 &&
                        e.startTime === slot.start,
                    );
                    const colorClass =
                      typeColors[session?.type ?? "Theory"] ??
                      typeColors.Theory;
                    const isToday = dayIdx === todayIdx;

                    return (
                      <div
                        key={day}
                        className={`p-2.5 border-l border-border/20 min-h-[132px] transition-colors ${
                          isToday ? "bg-primary/[0.03]" : "hover:bg-muted/10"
                        }`}
                      >
                        {session ? (
                          <div
                            className={`h-full rounded-xl border p-3.5 text-sm flex flex-col gap-2.5 ${colorClass}`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
                                {session.subject?.name ||
                                  session.course?.name ||
                                  "—"}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 shrink-0 border-current"
                              >
                                {session.type || "Theory"}
                              </Badge>
                            </div>

                            <div className="mt-auto space-y-1">
                              <div className="flex items-center gap-1.5 text-xs text-foreground/80">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {session.roomNumber || "TBA"}
                              </div>
                              {session.faculty && (
                                <div className="flex items-center gap-1.5 text-xs text-foreground/70">
                                  <BookOpen className="h-3 w-3 shrink-0" />
                                  {session.faculty.profile?.fullName ||
                                    session.faculty.username ||
                                    "Faculty"}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full border border-dashed border-border/20 rounded-xl flex items-center justify-center">
                            <span className="text-[10px] text-foreground/40 uppercase tracking-wide">
                              Free
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(typeColors).map(([type, cls]) => (
            <div
              key={type}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium ${cls}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {type}
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 shrink-0">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Your timetable is managed by your department. Sessions marked as{" "}
            <span className="text-primary font-medium">Practical / Lab</span>{" "}
            require physical attendance. Any conflicts must be reported to the
            faculty coordinator.
          </p>
        </div>
      </div>{" "}
    </>
  );
}
