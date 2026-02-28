import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileBarChart, Download, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI, coursesAPI } from "@/lib/api";
import { toast } from "sonner";

const reportTypes = [
  { id: "attendance", name: "Attendance Compliance Report", description: "Detailed student attendance metrics" },
  { id: "performance", name: "Student Performance Report", description: "Academic and engagement analytics" },
  { id: "department", name: "Departmental Audit Report", description: "Overview of courses and outcomes" },
  { id: "naac", name: "NAAC Criteria 2.1.1", description: "Enrolment and Admission Data" },
];

export default function Reports() {
  const [dept, setDept] = useState("");
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch unique departments from courses
  const { data: courses } = useQuery({
    queryKey: ["admin", "courses-for-depts"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      return resp.data.data.courses || (Array.isArray(resp.data.data) ? resp.data.data : []);
    }
  });

  const departmentList = Array.from(new Set(courses?.map((c: any) => c.department))).sort();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Simulate/trigger report generation
      toast.info(`Generating ${reportType} report for ${dept}...`);
      // In a real app, this might trigger a background job or open a new tab with the PDF/Excel
      setTimeout(() => {
        toast.success(`${reportType.toUpperCase()} report generated successfully`);
        setIsGenerating(false);
      }, 2000);
    } catch (error) {
      toast.error("Failed to generate report");
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-white uppercase tracking-tighter">
          <FileBarChart className="h-6 w-6 text-primary" /> Reports & Compliance
        </h1>
        <p className="text-sm text-slate-400 font-mono tracking-wider">GENERATE ACCREDITATION-READY DATA FOR AUDITS</p>
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Configuration Engine</CardTitle></CardHeader>
        <CardContent className="space-y-6 px-6 pb-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Department Scope</label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  <SelectItem value="all">Global Institution</SelectItem>
                  {departmentList.map(d => (
                    <SelectItem key={d as string} value={d as string}>{d as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Protocol Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-slate-200">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {reportTypes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Temporal From</label>
              <Input
                type="date"
                className="bg-slate-950 border-slate-800 text-slate-200"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Temporal To</label>
              <Input
                type="date"
                className="bg-slate-950 border-slate-800 text-slate-200"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="w-full sm:w-auto px-8"
            disabled={!dept || !reportType || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Generate Compliance Payload
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map(r => (
          <Card key={r.id} className="bg-slate-900/40 border-slate-800 backdrop-blur-sm group hover:border-primary/30 transition-all duration-300">
            <CardContent className="p-5 flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors uppercase tracking-tight">{r.name}</p>
                <p className="text-xs text-slate-500 font-mono tracking-tighter">{r.description}</p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Last Scan: Feb 20, 2026
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"><FileText className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"><FileSpreadsheet className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
