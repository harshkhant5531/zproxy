import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { reportsAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";

const tooltipStyle = { background: "hsl(222 47% 8%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, color: "hsl(210 40% 96%)" };
const tickStyle = { fill: "hsl(215 20% 55%)", fontSize: 12 };

export default function Analytics() {
  const { data: performanceData, isLoading: isPerfLoading } = useQuery({
    queryKey: ["faculty", "performance-reports"],
    queryFn: async () => {
      const resp = await reportsAPI.performance();
      return resp.data.data;
    }
  });

  const { data: attendanceData, isLoading: isAttLoading } = useQuery({
    queryKey: ["faculty", "attendance-reports"],
    queryFn: async () => {
      const resp = await reportsAPI.attendance();
      return resp.data.data.reports || [];
    }
  });

  if (isPerfLoading || isAttLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Transform data for charts
  const students = performanceData?.students || [];
  const topStudents = students.slice(0, 5).map((s: any) => ({
    name: s.student?.studentProfile?.fullName || s.student?.username,
    attainment: s.averagePercentage,
  }));

  const trendData = [
    { week: "W1", attendance: 85, performance: 72 },
    { week: "W2", attendance: 82, performance: 75 },
    { week: "W3", attendance: 90, performance: 78 },
    { week: "W4", attendance: 88, performance: 81 },
    { week: "W5", attendance: 92, performance: 85 },
  ];

  const radarData = [
    { subject: "Accuracy", A: 85, fullMark: 100 },
    { subject: "Engagement", A: 90, fullMark: 100 },
    { subject: "Compliance", A: 95, fullMark: 100 },
    { subject: "Integrity", A: 88, fullMark: 100 },
    { subject: "Punctuality", A: 76, fullMark: 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase tracking-tighter italic">Deep-State Analytics</h1>
          <p className="text-sm text-slate-400 font-mono tracking-wider">NEURAL COURSE OUTCOME & ENGAGEMENT METRICS</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-lg backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Index</p>
          <p className="text-xl font-black text-primary font-mono">{performanceData?.statistics?.classAverage || 0}%</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Top Performers Attainment</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topStudents}>
                <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} hide />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="attainment" fill="hsl(187 100% 50%)" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Engagement Fingerprint</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(222 30% 18%)" />
                <PolarAngleAxis dataKey="subject" tick={tickStyle} />
                <PolarRadiusAxis tick={{ ...tickStyle, fontSize: 10 }} />
                <Radar dataKey="A" stroke="hsl(187 100% 50%)" fill="hsl(187 100% 50%)" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm lg:col-span-2 shadow-2xl">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-bold text-slate-300 uppercase tracking-widest italic">Chronological Outcome Progress</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <XAxis dataKey="week" tick={tickStyle} axisLine={false} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} domain={[60, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="attendance" stroke="hsl(187 100% 50%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(187 100% 50%)", strokeWidth: 2 }} />
                <Line type="monotone" dataKey="performance" stroke="hsl(161 94% 30%)" strokeWidth={3} dot={{ r: 4, fill: "hsl(161 94% 30%)", strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2"><div className="h-2 w-10 bg-primary" /> Attendance</div>
              <div className="flex items-center gap-2"><div className="h-2 w-10 bg-emerald-700" /> Performance</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attainment Formula */}
      <Card className="bg-slate-950/40 border-slate-800 shadow-inner">
        <CardHeader className="pb-3 px-6"><CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">OBE Attainment Formula [v2.4]</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 font-mono text-sm flex flex-col items-center">
            <p className="text-primary text-xl font-black drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">A<sub>CO</sub> = (W<sub>att</sub> × P<sub>att</sub>) + (W<sub>int</sub> × M<sub>int</sub>)</p>
            <div className="h-px w-20 bg-slate-800 my-4" />
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Weights: ATT=0.20 | INT=0.80 — DYNAMIC_ADJUST_ENABLED</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
