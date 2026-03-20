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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, Calendar, BookOpen, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionsAPI } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AttendanceRecords() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["faculty", "sessions-history"],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions();
      return (
        resp.data.data.sessions ||
        (Array.isArray(resp.data.data) ? resp.data.data : [])
      );
    },
  });

  const sessions = Array.isArray(sessionsData) ? sessionsData : [];

  const filtered = sessions.filter(
    (s: any) =>
      s.course?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.subject?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.topic?.toLowerCase().includes(search.toLowerCase()) ||
      s.course?.code?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCopyExport = () => {
    if (!filtered || filtered.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = "Date\tTime\tSubject\tCode\tTopic\tVerified\n";
    const body = filtered
      .map((s: any) => {
        const dateStr = format(new Date(s.date), "yyyy-MM-dd");
        const timeStr = `${s.startTime} - ${s.endTime}`;
        const subject = s.subject?.name || s.course?.name || "N/A";
        const verified = `${s.attendance?.length || 0}/${s.totalStudents || "?"}`;
        return `${dateStr}\t${timeStr}\t${subject}\t${s.course?.code}\t${s.topic}\t${verified}`;
      })
      .join("\n");

    navigator.clipboard.writeText(headers + body).then(() => {
      toast.success("History exported to clipboard");
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Loading records...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <Calendar className="h-4 w-4 text-primary/70" /> Records and audit
            logs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
          >
            {filtered.length} Sessions
          </Badge>
          <div className="relative max-w-sm group min-w-[230px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter by subject or topic..."
              className="h-10 pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyExport}
            className="border-primary/20 text-primary"
          >
            Copy Export
          </Button>
        </div>
      </div>

      <Card
                className="app-card overflow-hidden"
      >
        <CardHeader className="border-b bg-muted/40 px-6 py-4">
          <CardTitle className="text-sm font-semibold text-foreground">
            Session Ledger
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="motion-table-stagger">
              <TableHeader className="bg-muted/40 border-b border-border">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11 pl-6">
                    Temporal Data
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                    Subject Module
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                    Session Details
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11 text-center">
                    Metrics
                  </TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[10px] uppercase tracking-[0.12em] h-11">
                    Status
                  </TableHead>
                  <TableHead className="w-[80px] pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any, idx: number) => (
                  <TableRow
                    key={s.id}
                    className="border-border hover:bg-muted/30 transition-colors group"
                    style={{ "--row-index": idx } as any}
                  >
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">
                          {format(new Date(s.date), "MMM dd, yyyy")}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {s.startTime} — {s.endTime}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                          {s.subject?.name || s.course?.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <BookOpen className="h-3 w-3" /> {s.course?.code}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm text-foreground font-medium block truncate">
                        {s.topic}
                      </span>
                      {s.batches && s.batches.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {s.batches.map((b: string) => (
                            <span
                              key={b}
                              className="px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase tracking-widest"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center justify-center bg-muted/30 border border-border rounded-lg px-3 py-1.5">
                        <span className="text-xs font-bold text-primary font-mono tracking-tight">
                          {s.attendance?.length || 0} / {s.totalStudents || "—"}
                        </span>
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest leading-none mt-0.5">
                          Verified
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-[0.12em] ${s.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"}`}
                      >
                        {s.status || "Live"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all rounded-full"
                        onClick={() => navigate(`/faculty/session/${s.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2 opacity-50">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          No matching records found
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em]">
        Historical Audit Feed
      </p>
    </div>
  );
}
