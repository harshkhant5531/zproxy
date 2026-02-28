import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, MapPin, Shield, Clock, CheckCircle2, Wifi, Fingerprint, Loader2, Camera, CameraOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceAPI } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [permissionStatus, setPermissionStatus] = useState<"not_requested" | "granted" | "denied">("not_requested");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = "reader";

  const markAttendanceMutation = useMutation({
    mutationFn: (qrCode: string) => attendanceAPI.markAttendanceQR(qrCode, "LH-201 (Geofenced)", `AuraMobile-${user?.id}`),
    onSuccess: (resp) => {
      setScannedData(resp.data.data);
      toast.success("Attendance verified and marked!");
      queryClient.invalidateQueries({ queryKey: ["student", "recent-attendance"] });
      stopScanner();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Verification failed. Please scan again.");
      setScanning(false);
    }
  });

  const startScanner = async () => {
    try {
      setScanning(true);
      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5QrCode;

      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success
          html5QrCode.stop();
          setScanning(false);
          markAttendanceMutation.mutate(decodedText);
        },
        (errorMessage) => {
          // parse errors, ignore them
        }
      );
      setPermissionStatus("granted");
    } catch (err: any) {
      console.error("Camera access error:", err);
      setScanning(false);
      if (err?.toString().includes("NotAllowedError")) {
        setPermissionStatus("denied");
        toast.error("Camera permission denied. Please enable it in settings.");
      } else {
        toast.error("Failed to start scanner. Is another app using the camera?");
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold tracking-tighter text-white uppercase italic">Neural QR Authentication</h1>
        <p className="text-sm text-slate-400 font-mono tracking-wider">SECURE BIOMETRIC & SPATIAL ATTENDANCE SCANNER</p>
      </div>

      {/* Scanner Viewfinder */}
      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md overflow-hidden shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <CardContent className="p-0">
          <div className="relative bg-slate-950/40 aspect-square max-h-80 flex items-center justify-center overflow-hidden">
            {/* Real Camera Feed */}
            <div id={SCANNER_ID} className="w-full h-full object-cover" />

            {/* Visual scan effect */}
            {scanning && <div className="absolute inset-x-0 h-1 bg-primary/40 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-20 animate-scan-move" />}

            {!window.isSecureContext && (
              <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Shield className="h-12 w-12 text-red-500" />
                <h3 className="text-white font-bold uppercase tracking-tighter">Insecure Context Detected</h3>
                <p className="text-xs text-slate-300">
                  Browsers block camera access on non-HTTPS sites. <br />
                  Please use <code className="bg-black/40 px-1 rounded">localhost</code> or an <code className="bg-black/40 px-1 rounded">https://</code> tunnel.
                </p>
                <Button variant="outline" size="sm" className="border-red-500 text-red-500" onClick={() => window.open("https://web.dev/media-device-permission-policy/")}>Learn More</Button>
              </div>
            )}

            {!scanning && !scannedData && window.isSecureContext && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-30 transition-all">
                {permissionStatus === "denied" ? (
                  <div className="text-center p-6 space-y-4">
                    <CameraOff className="h-16 w-16 text-red-500 mx-auto" />
                    <p className="text-sm text-slate-400">Camera access is blocked.</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh Page</Button>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <Camera className="h-16 w-16 text-primary mx-auto animate-pulse" />
                    <p className="text-sm text-slate-400">Initialize camera to start scanning</p>
                  </div>
                )}
              </div>
            )}

            <div className={`relative w-64 h-64 z-10 pointer-events-none transition-opacity duration-300 ${scanning ? "opacity-100" : "opacity-20"}`}>
              {/* Corner brackets - Cyberpunk style */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl shadow-[-5px_-5px_15px_rgba(34,211,238,0.2)]" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl shadow-[5px_-5px_15px_rgba(34,211,238,0.2)]" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl shadow-[-5px_5px_15px_rgba(34,211,238,0.2)]" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl shadow-[5px_5px_15px_rgba(34,211,238,0.2)]" />

              <div className="absolute inset-0 flex items-center justify-center">
                {markAttendanceMutation.isPending && (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-20 w-20 text-primary animate-spin" />
                    <span className="text-[10px] font-bold text-primary animate-pulse tracking-widest">VERIFYING...</span>
                  </div>
                )}
                {scannedData && (
                  <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
                    <div className="h-24 w-24 bg-emerald-500/20 rounded-full flex items-center justify-center border-2 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                    </div>
                  </div>
                )}
                {!scanning && !scannedData && !markAttendanceMutation.isPending && (
                  <ScanLine className="h-20 w-20 text-slate-700" />
                )}
              </div>
            </div>

            {/* Background grid */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #22d3ee 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          </div>
        </CardContent>
      </Card>

      {/* Action */}
      <div className="text-center">
        {!scannedData ? (
          <div className="space-y-4">
            <Button
              onClick={scanning ? stopScanner : startScanner}
              disabled={markAttendanceMutation.isPending || !window.isSecureContext}
              size="lg"
              className={`${scanning ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20" : "glow-cyan"} px-12 h-14 text-lg font-black italic tracking-tighter transition-all`}
            >
              {scanning ? (
                <><CameraOff className="mr-3 h-6 w-6" /> TERMINATE SCAN</>
              ) : (
                <><ScanLine className="mr-3 h-6 w-6" /> INITIATE SCAN</>
              )}
            </Button>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] animate-pulse">
              {!window.isSecureContext ? "SECURITY PROTOCOL BLOCKING CAMERA" : scanning ? "SYSTEM ACTIVE • POINT CAMERA AT QR" : "Position QR within viewfinder"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-5">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 backdrop-blur-sm">
              <p className="text-emerald-500 font-black italic text-xl flex items-center justify-center gap-3 uppercase tracking-tighter">
                <CheckCircle2 className="h-6 w-6 stroke-[3px]" /> Authentication Absolute
              </p>
              <div className="mt-4 flex flex-col items-center gap-1 font-mono">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Session Identified</p>
                <p className="text-slate-200 font-bold">{scannedData.attendanceRecord?.course?.name || "Neural Integration"}</p>
                <div className="h-px w-10 bg-slate-800 my-2" />
                <p className="text-[10px] text-primary">{new Date().toLocaleTimeString()} • LATENCY: 42ms</p>
              </div>
            </div>
            <Button variant="outline" className="border-slate-800 text-slate-400 hover:text-white" onClick={() => setScannedData(null)}>Reset Logic</Button>
          </div>
        )}
      </div>

      {/* Debug Info Overlay (Folds away) */}
      <div className="mt-8 pt-8 border-t border-slate-800 opacity-20 hover:opacity-100 transition-opacity">
        <details className="text-[9px] font-mono text-slate-500">
          <summary className="cursor-pointer uppercase tracking-widest mb-2">Diagnostic Data</summary>
          <div className="space-y-1 p-2 bg-black/20 rounded">
            <p>ORIGIN: {window.location.origin}</p>
            <p>SECURE: {window.isSecureContext ? "TRUE" : "FALSE"}</p>
            <p>USER_AGENT: {navigator.userAgent}</p>
          </div>
        </details>
      </div>

      {/* Status Indicators */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Spatial Geofence", status: "LH-201 ACTIVE", icon: MapPin, color: "text-emerald-500" },
          { label: "Aura Network", status: "ENCRYPTED - W5", icon: Wifi, color: "text-emerald-500" },
          { label: "Neural ID", status: "VERIFIED", icon: Fingerprint, color: "text-emerald-500" }
        ].map((item, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-xl">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-xl bg-slate-950 p-2.5 border border-slate-800 shadow-inner">
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                <p className={`text-[11px] font-bold ${item.color} font-mono uppercase`}>{item.status}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grace Period */}
      <Card className="bg-amber-500/5 border-amber-500/20 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="bg-amber-500/20 p-2 rounded-lg">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <p className="text-xs font-black text-amber-500 uppercase tracking-widest italic">Attendance Window</p>
              <p className="text-[10px] font-mono font-bold text-amber-500/60">04:22 REMAINING</p>
            </div>
            <div className="h-1 bg-amber-500/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 w-[60%] animate-pulse" />
            </div>
            <p className="text-[9px] text-slate-500 mt-2 font-medium">MARKING "PRESENT" PROTOCOL ACTIVE. AFTER 10M, STATUS SHIFTS TO "LATE".</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
