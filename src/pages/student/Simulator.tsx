import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Calculator, Zap, Crosshair, Loader2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { reportsAPI, coursesAPI } from "@/lib/api";

export default function WhatIfSimulator() {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [plannedAbsences, setPlannedAbsences] = useState([0]);

  const { data: attendanceStats, isLoading: isAttLoading } = useQuery({
    queryKey: ["student", "attendance-stats", user?.id],
    queryFn: async () => {
      const resp = await reportsAPI.attendance({ studentId: user?.id });
      return resp.data.data.statistics;
    },
    enabled: !!user?.id
  });

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["student", "courses", user?.id],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      const studentCourses = resp.data.data.filter((c: any) =>
        c.students.some((s: any) => s.id === user?.id)
      );
      if (studentCourses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(studentCourses[0].id);
      }
      return studentCourses;
    },
    enabled: !!user?.id
  });

  const isLoading = isAttLoading || isCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedCourse = coursesData?.find((c: any) => c.id === selectedCourseId);
  const courseStats = attendanceStats?.courses?.find((c: any) => c.id === selectedCourseId) || {
    present: 0,
    total: 0,
    rate: 0
  };

  // Logic: Calculate remaining sessions based on course total classes vs held sessions
  // Note: Backend 'totalClasses' might be the cap.
  const totalClasses = selectedCourse?.subjects?.[0]?.totalClasses || 40;
  const heldClasses = courseStats.total;
  const remainingClasses = Math.max(0, totalClasses - heldClasses);

  const futureAttended = remainingClasses - plannedAbsences[0];
  const projectedPresent = courseStats.present + Math.max(0, futureAttended);
  const projectedPct = Math.round((projectedPresent / totalClasses) * 100);
  const passThreshold = 75;
  const willPass = projectedPct >= passThreshold;

  return (
    <div className="space-y-8 max-w-2xl mx-auto py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Crosshair className="h-8 w-8 text-primary animate-pulse" /> Trajectory Predictor
        </h1>
        <p className="text-[10px] text-slate-500 font-mono tracking-[0.3em] uppercase">Simulate attendance outcomes // Tactical Oversight v4</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-slate-950/60 border-2 border-slate-900 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="h-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-primary/50" />
          <CardContent className="p-6 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" /> Selective course data
              </label>
              <Select value={selectedCourseId} onValueChange={(val) => {
                setSelectedCourseId(val);
                setPlannedAbsences([0]);
              }}>
                <SelectTrigger className="h-12 bg-slate-900 border-slate-800 text-slate-200 focus:ring-primary/40 font-bold uppercase tracking-tight">
                  <SelectValue placeholder="Target selection..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {coursesData?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id} className="font-bold uppercase text-xs">
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-primary italic">{courseStats.present}</p>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">Acquired</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-slate-200 italic">{courseStats.total}</p>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">Concluded</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-purple-500 italic">{remainingClasses}</p>
                <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mt-1">Residual</p>
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-slate-900">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Absence parameter</label>
                  <p className="text-sm font-bold text-slate-200 uppercase italic">Planned Disruptions: {plannedAbsences[0]}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono text-slate-600 uppercase">Buffer: {remainingClasses - plannedAbsences[0]}</p>
                </div>
              </div>
              <Slider
                value={plannedAbsences}
                onValueChange={setPlannedAbsences}
                max={remainingClasses}
                step={1}
                className="py-4"
              />
              <div className="flex items-start gap-3 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 font-mono leading-relaxed uppercase">
                  Adjust the slider to simulate missing residual sessions. The engine will calculate your final integrity score based on the total course capacity ({totalClasses} sessions).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`relative bg-slate-950 border-2 overflow-hidden transition-all duration-500 ${willPass ? "border-primary shadow-[0_0_30px_rgba(34,211,238,0.2)]" : "border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.2)]"}`}>
          <div className="absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 bg-slate-900 rotate-45 border-l border-b border-white/5" />
          <CardContent className="p-10 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <svg className="h-32 w-32 -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-900" />
                <circle
                  cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent"
                  strokeDasharray={364} strokeDashoffset={364 - (364 * projectedPct) / 100}
                  className={`transition-all duration-1000 ${willPass ? "text-primary" : "text-rose-500"}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black italic text-white">{projectedPct}%</span>
                <span className="text-[8px] font-mono text-slate-500 uppercase">Projected</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className={`text-xl font-black uppercase italic ${willPass ? "text-primary" : "text-rose-500"}`}>
                {willPass ? "Optimal Trajectory" : "Threshold Breach"}
              </h3>
              <p className="text-xs text-slate-400 font-mono tracking-tighter uppercase">
                {willPass
                  ? "Simulation indicates compliance with academic integrity protocols."
                  : `Simulation indicates an integrity breach. Minimum ${Math.ceil(totalClasses * 0.75) - courseStats.present} more sessions required.`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
