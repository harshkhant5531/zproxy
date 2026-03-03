import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrCode, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { coursesAPI, sessionsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function CreateSession() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [room, setRoom] = useState("");

  const { data: coursesData, isLoading: isCoursesLoading } = useQuery({
    queryKey: ["faculty", "my-courses", user?.id],
    queryFn: async () => {
      const resp = await coursesAPI.getCourses();
      return resp.data.data.courses || resp.data.data;
    },
    enabled: !!user?.id
  });

  const facultyCourses = Array.isArray(coursesData) ? coursesData.filter((c: any) => c.facultyId === user?.id) : [];
  const selectedCourse = facultyCourses.find((c: any) => c.id.toString() === courseId);

  // Fetch the full course detail to get subjects when a course is selected
  const { data: courseDetail, isLoading: isCourseDetailLoading } = useQuery({
    queryKey: ["faculty", "course-detail", courseId],
    queryFn: async () => {
      const resp = await coursesAPI.getCourse(courseId);
      return resp.data.data.course;
    },
    enabled: !!courseId
  });

  const courseSubjects: any[] = courseDetail?.subjects || [];

  const createSessionMutation = useMutation({
    mutationFn: (data: any) => sessionsAPI.createSession(data),
    onSuccess: (resp) => {
      const newSession = resp.data.data.session;
      toast.success("Session initialized. Redirecting to live feed...");
      navigate(`/faculty/session/${newSession.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to initialize session");
    }
  });

  const handleGenerate = () => {
    if (!courseId || !topic) {
      toast.error("Protocol violation: Course and Topic required");
      return;
    }

    const now = new Date();
    const startTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const endTime = end.toTimeString().split(' ')[0].substring(0, 5);

    createSessionMutation.mutate({
      courseId: parseInt(courseId),
      ...(subjectId && { subjectId: parseInt(subjectId) }),
      topic,
      room,
      date: now.toISOString(),
      startTime,
      endTime,
    });
  };


  if (isCoursesLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Initialize Session</h1>
        <p className="text-sm text-slate-500 font-mono tracking-[0.2em]">ESTABLISH SESSION & ATTENDANCE GATEWAY</p>
      </div>

      {/* Steps Progress */}
      <div className="flex items-center justify-center gap-4 py-4">
        {["Entity", "Logic", "Deploy"].map((label, i) => (
          <div key={label} className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all duration-500 ${i + 1 <= step ? "bg-primary border-primary text-black shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "bg-slate-900 border-slate-800 text-slate-600"}`}>
              {i + 1}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${i + 1 <= step ? "text-slate-200" : "text-slate-600"}`}>{label}</span>
            {i < 2 && <div className={`h-[1px] w-8 ${i + 1 < step ? "bg-primary" : "bg-slate-800"}`} />}
          </div>
        ))}
      </div>

      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-8 space-y-8 relative">
          {step >= 1 && (
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-500">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Target Course Entity</label>
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); setStep(Math.max(step, 2)); }}>
                <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-slate-200 focus:ring-primary/50">
                  <SelectValue placeholder="Identify target course..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                  {facultyCourses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-primary/20">{c.code} — {c.name}</SelectItem>
                  ))}
                  {facultyCourses.length === 0 && <p className="p-2 text-xs text-slate-500 italic">No assigned courses detected</p>}
                </SelectContent>
              </Select>
            </div>
          )}

          {step >= 2 && courseId && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-500">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Subject Module</label>
                {isCourseDetailLoading ? (
                  <div className="h-12 flex items-center pl-4 bg-slate-950 border border-slate-800 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="ml-3 text-xs text-slate-500 font-mono">Loading subjects...</span>
                  </div>
                ) : (
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger className="h-12 bg-slate-950 border-slate-800 text-slate-200 focus:ring-primary/50">
                      <SelectValue placeholder={courseSubjects.length > 0 ? "Select subject..." : "No subjects — skip"} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      {courseSubjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()} className="focus:bg-primary/20">
                          {s.name} <span className="text-slate-500 ml-1 text-xs">({s.type})</span>
                        </SelectItem>
                      ))}
                      {courseSubjects.length === 0 && (
                        <p className="p-2 text-xs text-slate-500 italic">No subjects configured for this course</p>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Session Topic</label>
                <Input
                  className="h-12 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus-visible:ring-primary/50"
                  placeholder="e.g. AVL Trees, SQL Joins, Deadlocks..."
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (e.target.value.trim()) setStep(Math.max(step, 3));
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && topic && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-500 text-center pt-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-left space-y-1 mb-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] text-center mb-3">Ready for Deployment</p>
                <p className="text-slate-300 font-mono text-sm">
                  <span className="text-slate-500 text-xs uppercase">Course: </span>{selectedCourse?.code} — {selectedCourse?.name}
                </p>
                {subjectId && courseSubjects.find((s: any) => s.id.toString() === subjectId) && (
                  <p className="text-slate-300 font-mono text-sm">
                    <span className="text-slate-500 text-xs uppercase">Subject: </span>
                    {courseSubjects.find((s: any) => s.id.toString() === subjectId)?.name}
                  </p>
                )}
                <p className="text-slate-300 font-mono text-sm">
                  <span className="text-slate-500 text-xs uppercase">Topic: </span>{topic}
                </p>
              </div>
              <Button
                size="lg"
                className="w-full h-14 font-black uppercase tracking-[0.2em] italic bg-primary text-black hover:bg-primary/90 shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                onClick={handleGenerate}
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <><QrCode className="mr-3 h-5 w-5" /> Execute Initialization</>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <p className="text-[9px] text-slate-700 font-mono uppercase tracking-[0.5em]">Academic Integrity Engine // Secure Authentication</p>
      </div>
    </div>
  );
}
