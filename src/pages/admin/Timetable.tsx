import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2, Clock, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { timetableAPI } from "@/lib/api";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00"];

export default function Timetable() {
  const { data: timetableData, isLoading } = useQuery({
    queryKey: ["admin", "timetable"],
    queryFn: async () => {
      const resp = await timetableAPI.getTimetable({ limit: 100 });
      return resp.data.data.timetableEntries;
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const entries = Array.isArray(timetableData) ? timetableData : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter italic flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" /> Temporal Grid
          </h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider uppercase">Institutional Scheduling Matrix</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1 rounded text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Sync: Active</div>
        </div>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md overflow-x-auto shadow-2xl">
        <CardContent className="p-0">
          <div className="min-w-[1000px]">
            {/* Header */}
            <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-slate-950/60 border-b border-slate-800">
              <div className="p-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="h-3 w-3" /> Timeline
              </div>
              {days.map((day, idx) => (
                <div key={day} className="p-4 text-[10px] font-black text-slate-300 text-center border-l border-slate-800/50 uppercase tracking-[0.3em]">
                  {day}
                </div>
              ))}
            </div>

            {/* Rows */}
            {timeSlots.map(slot => (
              <div key={slot} className="grid grid-cols-[120px_repeat(5,1fr)] border-b border-slate-800/30 group">
                <div className="p-4 text-[11px] text-slate-500 font-mono font-bold bg-slate-950/20 group-hover:text-primary transition-colors">
                  {slot}:00 Protocol
                </div>
                {days.map((day, dayIdx) => {
                  // dayOfWeek is 0-6 (Sun-Sat), but our grid is Mon-Fri (1-5)
                  const session = entries.find(e =>
                    e.dayOfWeek === (dayIdx + 1) &&
                    e.startTime.startsWith(slot)
                  );

                  return (
                    <div key={day} className="p-3 border-l border-slate-800/30 min-h-[100px] hover:bg-white/5 transition-all duration-300">
                      {session && (
                        <div className="h-full rounded-lg bg-slate-950/80 border border-primary/20 p-3 text-xs space-y-2 group/card relative overflow-hidden flex flex-col justify-between">
                          <div className="absolute top-0 right-0 p-1">
                            <div className="h-1 w-4 bg-primary/20 rounded-full" />
                          </div>
                          <div>
                            <p className="font-black text-primary uppercase tracking-tighter italic text-sm">{session.course?.code}</p>
                            <p className="text-slate-400 line-clamp-1 font-medium">{session.course?.name}</p>
                          </div>
                          <div className="space-y-1 pt-2">
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                              <MapPin className="h-3 w-3 text-slate-700" /> {session.roomNumber || "LH-201"}
                            </div>
                            <p className="text-[9px] text-slate-600 italic font-mono truncate">
                              FAC: {session.faculty?.facultyProfile?.fullName || "AURA_CORE"}
                            </p>
                          </div>
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

      <div className="flex justify-center gap-8 pt-4">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-primary" /> Active Thread
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-slate-800" /> Empty Node
        </div>
      </div>
    </div>
  );
}
