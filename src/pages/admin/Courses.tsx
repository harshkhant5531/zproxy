import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { coursesAPI } from "@/lib/api";

export default function CourseManagement() {
  const [search, setSearch] = useState("");

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const data = resp.data.data;
      return data.courses || (Array.isArray(data) ? data : []);
    }
  });

  const courses = Array.isArray(coursesData) ? coursesData : [];

  const filtered = courses.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter">Academic Course Registry</h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider">{courses.length} REGISTERED ENTITIES</p>
        </div>
      </div>

      <div className="relative max-w-sm group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Filter courses by code or name..."
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
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Unique Code</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Course Title</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Department</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Semester</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Credits</TableHead>
                <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-11">Faculty Head</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c: any) => (
                <TableRow key={c.id} className="border-slate-800 hover:bg-white/5 transition-colors group">
                  <TableCell className="font-mono text-sm font-black text-primary group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{c.code}</TableCell>
                  <TableCell className="font-bold text-sm text-slate-100">{c.name}</TableCell>
                  <TableCell className="text-xs text-slate-400 font-medium uppercase tracking-tighter">{c.department}</TableCell>
                  <TableCell className="text-sm font-mono text-slate-300">SEM {c.semester}</TableCell>
                  <TableCell className="text-sm text-slate-300">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-primary">{c.credits} CR</span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300 italic">
                    {c.faculty?.facultyProfile?.fullName || c.faculty?.username || "Not Assigned"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">No matching courses found in registry</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
