import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, MapPin, Download, Printer } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useQuery } from "@tanstack/react-query";
import { timetableAPI } from "@/lib/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

interface Course {
  id: number;
  code: string;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

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
  course?: Course;
  subject?: Subject;
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = [
  { start: "07:45", end: "09:35" },
  { start: "09:50", end: "11:30" },
  { start: "12:10", end: "13:50" },
];

export default function FacultyTimetable() {
  const { user } = useAuth();

  const { data: timetableData, isLoading } = useQuery<TimetableEntry[]>({
    queryKey: ["faculty", "timetable", user?.id],
    queryFn: async () => {
      const resp = await timetableAPI.getTimetable({ limit: 100 });
      // Filter entries for the current faculty
      return resp.data.data.timetableEntries.filter(
        (entry: TimetableEntry) => entry.facultyId === user?.id,
      );
    },
    enabled: !!user?.id,
  });

  const entries = Array.isArray(timetableData) ? timetableData : [];

  const handleExport = () => {
    window.print();
  };

  return (
    <>
      <FullScreenLoader show={isLoading} operation="loading" />
      <div className="app-page">
        <div className="app-page-header">
          <div>
            <h1 className="page-header-title flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Academic Schedule
            </h1>
            <p className="page-header-sub">
              {user?.profile?.fullName || user?.username}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border/70 text-muted-foreground hover:text-foreground bg-background/70"
              onClick={handleExport}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Schedule
            </Button>
          </div>
        </div>

        <Card className="bg-card/75 border-border/60 backdrop-blur-md overflow-x-auto shadow-2xl">
          <CardContent className="p-0">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-[130px_repeat(5,1fr)] bg-muted/35 dark:bg-muted/20 border-b border-border/70">
                <div className="p-4 text-xs font-semibold text-foreground/80 uppercase tracking-[0.12em] flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Time
                </div>
                {days.map((day) => (
                  <div
                    key={day}
                    className="p-4 text-sm font-semibold text-foreground text-center border-l border-border/50 uppercase tracking-[0.08em]"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {timeSlots.map((slot) => (
                <div
                  key={slot.start}
                  className="grid grid-cols-[130px_repeat(5,1fr)] border-b border-border/45 group"
                >
                  <div className="p-4 text-sm text-foreground/85 font-mono font-semibold bg-muted/20 group-hover:text-primary transition-colors flex items-center justify-center">
                    {slot.start} - {slot.end}
                  </div>
                  {days.map((day, dayIdx) => {
                    const session = entries.find(
                      (e) =>
                        e.dayOfWeek === dayIdx + 1 &&
                        e.startTime === slot.start,
                    );

                    return (
                      <div
                        key={day}
                        className="p-3 border-l border-border/45 min-h-[146px] hover:bg-accent/35 transition-all duration-300 relative"
                      >
                        {session ? (
                          <div
                            className={`h-full rounded-xl p-3.5 text-sm space-y-2 relative overflow-hidden flex flex-col justify-between shadow-lg group/card transition-all duration-500 border
                                                    ${session.startTime === "07:45" && dayIdx === 0 ? "bg-primary/10 border-primary/30 aura-glow animate-aura-pulse" : "bg-card/95 dark:bg-card/85 border-border/65"}
                                                `}
                          >
                            <div className="absolute top-0 right-0 p-1.5 opacity-40 group-hover/card:opacity-100 transition-opacity">
                              <Badge
                                variant="outline"
                                className="text-[8px] border-primary/20 text-primary py-0 px-1.5 bg-primary/5 uppercase tracking-widest font-bold"
                              >
                                {session.type || "Theory"}
                              </Badge>
                            </div>
                            <div>
                              <p className="text-foreground font-semibold text-sm leading-snug tracking-tight">
                                {session.subject?.name || session.course?.name}
                              </p>
                            </div>

                            <div className="space-y-1.5 pt-2">
                              <div className="flex items-center gap-1.5 text-xs text-foreground/80 font-medium tracking-wide">
                                <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                                {session.roomNumber || "LECTURE HALL"}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-foreground/70 font-mono">
                                <div className="h-1.5 w-1.5 rounded-full bg-success pulsate" />
                                REAL-TIME SYNC
                              </div>
                            </div>

                            <div className="h-1 w-full bg-muted/70 rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-primary/50 w-full" />
                            </div>
                          </div>
                        ) : (
                          <div className="h-full border border-dashed border-border/45 rounded-xl flex items-center justify-center opacity-20 text-xs text-foreground/60 font-mono uppercase tracking-wide">
                            Slot Available
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

        <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
              Procedural Note
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              The timetable is fixed by the institutional oversight. Any
              schedule conflicts or room reassignments must be authorized via
              the HOD terminal. Sessions marked with{" "}
              <span className="text-primary font-bold">Aura-Link</span> are
              enabled for real-time biometric verification.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
