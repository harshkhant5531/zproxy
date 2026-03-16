import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileBarChart, Download, Loader2 } from "lucide-react";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reportsAPI, coursesAPI } from "@/lib/api";
import { toast } from "sonner";

const reportTypes = [
  {
    id: "attendance",
    name: "Attendance Compliance Report",
    description: "Detailed student attendance metrics",
  },
  {
    id: "performance",
    name: "Student Performance Report",
    description: "Academic and engagement analytics",
  },
  {
    id: "department",
    name: "Departmental Audit Report",
    description: "Overview of courses and outcomes",
  },
  {
    id: "naac",
    name: "NAAC Criteria 2.1.1",
    description: "Enrolment and Admission Data",
  },
];

export default function Reports() {
  const [dept, setDept] = useState("");
  const [reportType, setReportType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  // Fetch unique departments from courses
  const { data: reportsData, isLoading: isReportsLoading } = useQuery({
    queryKey: ["admin", "reports-list"],
    queryFn: async () => {
      const resp = await reportsAPI.getReports();
      return resp.data.data.reports || [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin", "courses-for-depts"],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      return (
        resp.data.data.courses ||
        (Array.isArray(resp.data.data) ? resp.data.data : [])
      );
    },
  });

  const departmentList = Array.from(
    new Set(courses?.map((c: any) => c.department)),
  ).sort();

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await reportsAPI.generateReport({
        type: reportType,
        scope: dept,
        dateFrom,
        dateTo,
      });
      toast.success(`${reportType.toUpperCase()} report generation requested`);
      queryClient.invalidateQueries({ queryKey: ["admin", "reports-list"] });
      setIsGenerating(false);
    } catch (error) {
      toast.error("Failed to generate report");
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: number) => {
    try {
      const response = await reportsAPI.downloadReport(reportId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `report-${reportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success("Download started");
    } catch (error) {
      toast.error("Download failed");
    }
  };

  if (isReportsLoading) return <FullScreenLoader show operation="loading" />;

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="page-header-title flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-primary" /> Reports &
            Compliance
          </h1>
          <p className="page-header-sub">
            Generate accreditation-ready data for audits
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full border-primary/30 bg-primary/10 text-primary px-3 py-1 text-[10px] uppercase tracking-[0.12em]"
        >
          {reportsData?.length || 0} Generated
        </Badge>
      </div>

      <Card className="app-card motion-surface">
        <CardHeader className="card-header-muted py-4 px-6">
          <CardTitle className="text-sm font-semibold text-foreground">
            Configuration Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.12em]">
                Department Scope
              </label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger className="h-11 bg-background border-border">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Global Institution</SelectItem>
                  {departmentList.map((d) => (
                    <SelectItem key={d as string} value={d as string}>
                      {d as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.12em]">
                Report Type
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="h-11 bg-background border-border">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.12em]">
                From Date
              </label>
              <Input
                type="date"
                className="h-11 bg-background border-border"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-[0.12em]">
                To Date
              </label>
              <Input
                type="date"
                className="h-11 bg-background border-border"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="h-11 px-8 font-semibold"
            disabled={!dept || !reportType || isGenerating}
            onClick={handleGenerate}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.12em]">
          Generated Reports
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {reportsData?.map((r: any) => (
            <Card
              key={r.id}
              className="app-card group hover:border-primary/20 transition-all duration-200"
            >
              <CardContent className="p-5 flex items-start justify-between">
                <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {reportTypes.find((t) => t.id === r.type)?.name || r.type}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-tight">
                    Scope: {r.scope} · Status: {r.status}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-live-blink" />
                    Generated: {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 flex-shrink-0"
                  onClick={() => handleDownload(r.id)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {reportsData?.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-border/40 rounded-2xl">
              <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
                No reports generated yet
              </p>
            </div>
          )}
        </div>
      </div>
      <FullScreenLoader show={isGenerating} operation="generating" />
    </div>
  );
}
