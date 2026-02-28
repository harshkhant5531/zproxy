import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Loader2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionsAPI } from "@/lib/api";
import { format } from "date-fns";

export default function AttendanceRecords() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["faculty", "sessions-history"],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions();
      return resp.data.data.sessions || (Array.isArray(resp.data.data) ? resp.data.data : []);
    }
  });

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const filtered = sessions.filter((s: any) =>
    s.course?.name.toLowerCase().includes(search.toLowerCase()) ||
    s.topic.toLowerCase().includes(search.toLowerCase()) ||
    s.course?.code.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter italic">Session Archive</h1>
        <p className="text-sm text-slate-400 font-mono tracking-wider">HISTORICAL ATTENDANCE LEDGER & AUDIT LOGS</p>
      </div>

      <div className="relative max-w-sm group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Filter by course or topic..."
          className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-primary/50"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden shadow-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/40">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Temporal Data</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Course Entity</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Topic/Core</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Spatial Data</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Metrics</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id} className="border-slate-800 hover:bg-white/5 transition-colors group">
                  <TableCell className="text-[11px] text-slate-400 font-mono italic">
                    {format(new Date(s.date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="font-bold text-sm text-slate-100 uppercase tracking-tighter">
                    {s.course?.code}
                    <span className="block text-[10px] font-normal text-slate-500">{s.course?.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300 italic max-w-[200px] truncate">{s.topic}</TableCell>
                  <TableCell className="text-[11px] text-slate-500 font-mono">ROOM: {s.room || "LH-201"}</TableCell>
                  <TableCell className="text-xs font-mono font-bold text-primary bg-primary/5 px-2 py-1 rounded w-fit">
                    {s.presentCount || 0}/{s.totalStudents || 0}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${s.status === "completed" ? "bg-emerald-500/20 text-emerald-500" : "bg-cyan-500/20 text-cyan-500"}`}>
                      {s.status || "In-Progress"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white" onClick={() => navigate(`/faculty/session/${s.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 italic font-mono uppercase tracking-widest text-[10px]">No archives found in neural buffer</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
