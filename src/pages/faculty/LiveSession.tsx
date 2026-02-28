import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QrCode, Users, Clock, Shield, Wifi, AlertTriangle, UserPlus, Loader2, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionsAPI, attendanceAPI } from "@/lib/api";
import { format } from "date-fns";
import { toast } from "sonner";

export default function LiveSession() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [qrTimer, setQrTimer] = useState(15);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideStudentId, setOverrideStudentId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const resp = await sessionsAPI.getSession(id!);
      return resp.data.data.session;
    },
    enabled: !!id
  });

  const { data: attendanceData, isLoading: isAttendanceLoading } = useQuery({
    queryKey: ["session", id, "attendance"],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessionAttendance(id!);
      return resp.data.data.attendance;
    },
    enabled: !!id,
    refetchInterval: 5000 // Poll every 5 seconds for live updates
  });

  const generateQRMutation = useMutation({
    mutationFn: () => sessionsAPI.generateQR(id!),
    onSuccess: (data) => {
      queryClient.setQueryData(["session", id], (old: any) => ({
        ...old,
        qrCode: data.data.data.qrCode
      }));
      setQrTimer(15);
    }
  });

  const overrideMutation = useMutation({
    mutationFn: (data: any) => attendanceAPI.markAttendance(data),
    onSuccess: () => {
      toast.success("Attendance marked manually");
      queryClient.invalidateQueries({ queryKey: ["session", id, "attendance"] });
      setShowOverride(false);
      setOverrideStudentId("");
      setOverrideReason("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to mark attendance");
    }
  });

  useEffect(() => {
    if (sessionData && !sessionData.qrCode && !generateQRMutation.isPending) {
      generateQRMutation.mutate();
    }
  }, [sessionData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQrTimer(prev => {
        if (prev <= 1) {
          generateQRMutation.mutate();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [id]);

  if (isSessionLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const session = sessionData;
  const presentCount = attendanceData?.length || 0;
  const totalCount = session?.course?.students?.length || 40;
  const pct = Math.round((presentCount / totalCount) * 100);

  const handleManualOverride = () => {
    if (!overrideStudentId || !overrideReason) {
      toast.error("Please provide both Student ID and reason");
      return;
    }
    overrideMutation.mutate({
      sessionId: parseInt(id!),
      studentId: parseInt(overrideStudentId),
      status: "present",
      notes: overrideReason,
      method: "manual_override"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">{session?.course?.code} — {session?.topic}</h1>
          <p className="text-sm text-slate-400 font-mono italic">
            {format(new Date(session?.date), "MMMM dd, yyyy")} • {session?.startTime} - {session?.endTime}
          </p>
        </div>
        <Button variant="outline" size="sm" className="border-slate-800 text-slate-300" onClick={() => setShowOverride(!showOverride)}>
          <UserPlus className="mr-2 h-4 w-4" /> Manual Override
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* QR Code */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm lg:row-span-2 shadow-2xl shadow-primary/5 overflow-hidden group">
          <CardHeader className="pb-3 px-6 border-b border-white/5 bg-white/5 select-none font-mono">
            <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center justify-between">
              <span>Secure Session QR</span>
              <span className="text-primary italic">Live Transmission</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-8 text-center relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/40 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/40 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/40 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/40 rounded-br-lg" />

            <div className={`aspect-square bg-white rounded-2xl flex items-center justify-center border-4 border-slate-800 relative group overflow-hidden transition-all duration-700 ${generateQRMutation.isPending ? 'opacity-30 scale-90 blur-[4px]' : 'opacity-100 scale-100 shadow-[0_0_40px_rgba(34,211,238,0.2)]'}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent h-1/2 w-full animate-scan-move pointer-events-none opacity-20" />
              {session?.qrCode ? (
                <div className="flex flex-col items-center gap-4 animate-in zoom-in-90 duration-700 z-10">
                  <div className="p-2">
                    <QRCodeSVG
                      value={`${window.location.hostname === "localhost" && import.meta.env.VITE_NETWORK_IP
                        ? `http://${import.meta.env.VITE_NETWORK_IP}:${import.meta.env.VITE_PORT || '8080'}`
                        : window.location.origin
                        }/student/verify?token=${session.qrCode.codeValue}`}
                      size={220}
                      level="H"
                      includeMargin={false}
                      className="rounded-sm"
                    />
                  </div>
                  <div className="h-px w-12 bg-slate-200" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 text-primary animate-spin" />
                  <p className="text-[10px] font-black text-primary animate-pulse tracking-widest">ENCRYPTING...</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-1 bg-primary animate-pulse" />
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">Rotation Sync</p>
                    <p className="text-3xl font-mono font-black text-primary mt-1">{qrTimer}<span className="text-sm ml-1 opacity-50">s</span></p>
                  </div>
                  <div className="h-10 w-10 flex items-center justify-center">
                    <Shield className={`h-6 w-6 text-primary ${qrTimer < 5 ? 'animate-bounce text-amber-500' : 'animate-pulse'}`} />
                  </div>
                </div>
                <Progress value={(qrTimer / 15) * 100} className="h-1 mt-3 bg-slate-900 border-none rounded-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                  <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">ECC Level</p>
                  <p className="text-[10px] text-slate-300 font-mono">HIGH (L3)</p>
                </div>
                <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                  <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest">Protocol</p>
                  <p className="text-[10px] text-slate-300 font-mono">AURA-v4</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Pulse Counter */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm col-span-1 lg:col-span-2">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Real-time Presence Insight</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center gap-8">
              <div className="relative h-32 w-32 shrink-0">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222 30% 12%)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(187 100% 50%)" strokeWidth="6"
                    strokeDasharray={`${pct * 2.64} 264`} strokeLinecap="round" className="transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white">{pct}%</span>
                  <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Sync</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <p className="text-5xl font-black text-white tabular-nums tracking-tighter">
                    {presentCount}<span className="text-xl text-slate-600 font-normal ml-2">/ {totalCount}</span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-1 uppercase tracking-widest">Students authenticated</p>
                </div>
                <Progress value={pct} className="h-2 bg-slate-950" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Indicators */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm col-span-1 lg:col-span-2">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Integrity Shield Metrics</CardTitle></CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid gap-4 grid-cols-3">
              <div className="rounded-2xl bg-slate-950/50 border border-slate-800/50 p-4 text-center group hover:border-emerald-500/30 transition-colors">
                <Shield className="h-6 w-6 text-emerald-500 mx-auto mb-2 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Credential Verification</p>
                <p className="text-xs text-emerald-500 font-mono mt-1">100% SECURE</p>
              </div>
              <div className="rounded-2xl bg-slate-950/50 border border-slate-800/50 p-4 text-center group hover:border-primary/30 transition-colors">
                <Wifi className="h-6 w-6 text-primary mx-auto mb-2 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Geofence Compliance</p>
                <p className="text-xs text-primary font-mono mt-1">CAMPUS ONLY</p>
              </div>
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 text-center group hover:border-amber-500/40 transition-colors">
                <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2 group-hover:drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Anomaly Detection</p>
                <p className="text-xs text-amber-500 font-mono mt-1">0 THREATS</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Override Form */}
      {showOverride && (
        <Card className="bg-slate-900/60 border-primary/30 border-2 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-white flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" />Manual Presence Override</CardTitle></CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Student Database ID</label>
                <Input
                  placeholder="Enter numeric ID..."
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:ring-primary"
                  value={overrideStudentId}
                  onChange={(e) => setOverrideStudentId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Authorization Reason</label>
                <Textarea
                  placeholder="Provide brief justification..."
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 resize-none focus:ring-primary"
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setShowOverride(false)}>Cancel</Button>
              <Button size="sm" onClick={handleManualOverride} disabled={overrideMutation.isPending}>
                {overrideMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />} Authenticate Student
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Table */}
      <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
        <CardHeader className="pb-3 px-6"><CardTitle className="text-sm font-medium text-slate-300">Live Authentication Feed</CardTitle></CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="rounded-2xl border border-slate-800/50 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-950/60">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-10">Student Identity</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-10">Timestamp</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-10">Vector</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-10">GPS Trust</TableHead>
                  <TableHead className="text-slate-400 font-mono text-[10px] uppercase tracking-wider h-10">Integrity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendanceData?.map((log: any) => (
                  <TableRow key={log.id} className="border-slate-800 hover:bg-white/5 transition-colors group">
                    <TableCell className="font-bold text-sm text-white group-hover:text-primary transition-colors">
                      {log.student?.profile?.fullName || log.student?.username}
                      <span className="block text-[10px] text-slate-500 font-mono tracking-tighter mt-0.5">{log.student?.profile?.studentId || log.studentId}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 font-mono">{format(new Date(log.timestamp), "HH:mm:ss")}</TableCell>
                    <TableCell className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-bold bg-slate-800/30 rounded inline-block px-1.5 mt-4 ml-4">
                      {log.method || "QR_SCAN"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-emerald-500">
                        <Shield className="h-3 w-3" /> VERIFIED
                      </span>
                    </TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(!attendanceData || attendanceData.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Clock className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm font-medium italic">Awaiting initial check-ins...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
