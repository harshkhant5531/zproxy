import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Calendar,
    Loader2,
    Clock,
    MapPin,
    Download,
    Printer,
} from "lucide-react";
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
                (entry: TimetableEntry) => entry.facultyId === user?.id
            );
        },
        enabled: !!user?.id,
    });

    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-slate-400 font-mono uppercase tracking-widest text-xs">Synchronizing Schedule...</span>
            </div>
        );
    }

    const entries = Array.isArray(timetableData) ? timetableData : [];

    const handleExport = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-3 aura-text-glow">
                        <Calendar className="h-7 w-7 text-primary" /> Academic Schedule
                    </h1>
                    <p className="text-[10px] text-slate-500 font-mono tracking-[0.2em] uppercase mt-1">
                        Operational Matrix // {user?.profile?.fullName || user?.username} // Standard Ver.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-800 text-slate-400 hover:text-white bg-slate-900/50"
                        onClick={handleExport}
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Schedule
                    </Button>
                </div>
            </div>

            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-x-auto shadow-2xl">
                <CardContent className="p-0">
                    <div className="min-w-[800px]">
                        {/* Header */}
                        <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-slate-950/60 border-b border-slate-800">
                            <div className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Time
                            </div>
                            {days.map((day) => (
                                <div
                                    key={day}
                                    className="p-4 text-[10px] font-black text-slate-300 text-center border-l border-slate-800/50 uppercase tracking-[0.3em]"
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Rows */}
                        {timeSlots.map((slot) => (
                            <div
                                key={slot.start}
                                className="grid grid-cols-[120px_repeat(5,1fr)] border-b border-slate-800/30 group"
                            >
                                <div className="p-4 text-[11px] text-slate-500 font-mono font-bold bg-slate-950/20 group-hover:text-primary transition-colors flex items-center justify-center">
                                    {slot.start} - {slot.end}
                                </div>
                                {days.map((day, dayIdx) => {
                                    const session = entries.find(
                                        (e) =>
                                            e.dayOfWeek === dayIdx + 1 && e.startTime === slot.start
                                    );

                                    return (
                                        <div
                                            key={day}
                                            className="p-3 border-l border-slate-800/30 min-h-[140px] hover:bg-white/5 transition-all duration-300 relative"
                                        >
                                            {session ? (
                                                <div className={`h-full rounded-xl p-3 text-xs space-y-2 relative overflow-hidden flex flex-col justify-between shadow-lg group/card transition-all duration-500 border
                                                    ${session.startTime === "07:45" && dayIdx === 0 ? "bg-primary/10 border-primary/30 aura-glow animate-aura-pulse" : "bg-slate-950/80 border-white/5"}
                                                `}>
                                                    <div className="absolute top-0 right-0 p-1.5 opacity-40 group-hover/card:opacity-100 transition-opacity">
                                                        <Badge variant="outline" className="text-[8px] border-primary/20 text-primary py-0 px-1.5 bg-primary/5 uppercase tracking-widest font-bold">
                                                            {session.type || "Theory"}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-100 font-bold text-[11px] leading-tight uppercase tracking-tight">
                                                            {session.subject?.name || session.course?.name}
                                                        </p>
                                                    </div>

                                                    <div className="space-y-1.5 pt-2">
                                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                                                            <MapPin className="h-3.5 w-3.5 text-primary" />{" "}
                                                            {session.roomNumber || "LECTURE HALL"}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-mono">
                                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 pulsate" />
                                                            REAL-TIME SYNC
                                                        </div>
                                                    </div>

                                                    <div className="h-1 w-full bg-slate-900 rounded-full mt-2 overflow-hidden">
                                                        <div className="h-full bg-primary/50 w-full" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="h-full border border-dashed border-slate-800/20 rounded-xl flex items-center justify-center opacity-10 text-[9px] text-slate-500 font-mono uppercase tracking-widest">
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

            <div className="bg-slate-900/20 border border-slate-800/50 rounded-xl p-4 flex items-start gap-4">
                <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
                    <Clock className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Procedural Note</p>
                    <p className="text-xs text-slate-400 font-mono leading-relaxed">
                        The timetable is fixed by the institutional oversight. Any schedule conflicts or room reassignments must be authorized via the HOD terminal. Sessions marked with <span className="text-primary font-bold">Aura-Link</span> are enabled for real-time biometric verification.
                    </p>
                </div>
            </div>
        </div>
    );
}
