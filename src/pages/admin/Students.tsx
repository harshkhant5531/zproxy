import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Upload, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usersAPI } from "@/lib/api";

export default function StudentManagement() {
  const [search, setSearch] = useState("");

  const { data: userData, isLoading } = useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const resp = await usersAPI.getUsers();
      const data = resp.data.data;
      const allUsers = Array.isArray(data.users) ? data.users : (Array.isArray(data) ? data : []);
      return allUsers.filter((u: any) => u.role === "student");
    }
  });

  const students = Array.isArray(userData) ? userData : [];

  const filtered = students.filter((s: any) =>
    (s.studentProfile?.fullName || s.username).toLowerCase().includes(search.toLowerCase()) ||
    (s.studentProfile?.studentId || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.studentProfile?.department || "").toLowerCase().includes(search.toLowerCase())
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter">Student Registry</h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider">{students.length} ACTIVE ENROLLMENTS</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-slate-800 text-slate-300"><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button size="sm"><Upload className="mr-2 h-4 w-4" />Bulk Import</Button>
        </div>
      </div>

      <div className="relative max-w-sm group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search by name, ID, or department..."
          className="pl-9 bg-slate-900/50 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:ring-primary/50"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-2xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-950/40">
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Student ID</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Full Name</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Department</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Semester</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Status</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Device ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id} className="border-slate-800 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-mono text-xs font-black text-primary group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                    {s.studentProfile?.studentId || "N/A"}
                  </TableCell>
                  <TableCell className="font-bold text-sm text-slate-100">{s.studentProfile?.fullName || s.username}</TableCell>
                  <TableCell className="text-xs text-slate-400 font-medium uppercase tracking-tighter">{s.studentProfile?.department || "N/A"}</TableCell>
                  <TableCell className="text-sm font-mono text-slate-300">{s.studentProfile?.semester ? `SEM ${s.studentProfile.semester}` : "N/A"}</TableCell>
                  <TableCell>
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{s.status || "active"}</span>
                  </TableCell>
                  <TableCell className="text-[10px] text-slate-500 font-mono uppercase truncate max-w-[120px]">{s.deviceId || "UNLINKED"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">No matching students found in registry</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
