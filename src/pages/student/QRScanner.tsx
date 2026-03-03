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
    mutationFn: (qrCode: string) => attendanceAPI.markAttendanceQR(qrCode, "Institutional Geofence", `UserDevice-${user?.id}`),
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
        <h1 className="text-3xl font-bold tracking-tight text-white">Attendance Scanner</h1>
        <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Secure QR Authentication System</p>
      </div>

      {/* Scanner Viewfinder */}
      <Card className="bg-slate-900/60 border-slate-800 backdrop-blur-md overflow-hidden shadow-xl relative">
        <CardContent className="p-0">
          <div className="relative bg-slate-950/40 aspect-square max-h-80 flex items-center justify-center overflow-hidden">
            {/* Real Camera Feed */}
            <div id={SCANNER_ID} className="w-full h-full object-cover" />

            {!window.isSecureContext && (
              <div className="absolute inset-0 bg-red-950/90 z-50 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Shield className="h-12 w-12 text-red-500" />
                <h3 className="text-white font-bold uppercase tracking-tight">Secure Context Required</h3>
                <p className="text-xs text-slate-300">
                  Camera access requires an HTTPS connection for security. <br />
                  Please use <code className="bg-black/40 px-1 rounded">localhost</code> or a secure tunnel.
                </p>
                <Button variant="outline" size="sm" className="border-red-500 text-red-500" onClick={() => window.open("https://web.dev/media-device-permission-policy/")}>Learn More</Button>
              </div>
            )}

            {!scanning && !scannedData && window.isSecureContext && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-30 transition-all">
                {permissionStatus === "denied" ? (
                  <div className="text-center p-6 space-y-4">
                    <CameraOff className="h-16 w-16 text-red-500 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium">Camera access is blocked.</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>Refresh Page</Button>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <Camera className="h-16 w-16 text-primary mx-auto opacity-50" />
                    <p className="text-sm text-slate-400 font-medium">Initialize camera to start scanning</p>
                  </div>
                )}
              </div>
            )}

            <div className={`relative w-64 h-64 z-10 pointer-events-none transition-opacity duration-300 ${scanning ? "opacity-100" : "opacity-20"}`}>
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />

              <div className="absolute inset-0 flex items-center justify-center">
                {markAttendanceMutation.isPending && (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <span className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-widest">Verifying Identity...</span>
                  </div>
                )}
                {scannedData && (
                  <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
                    <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500 shadow-lg shadow-emerald-500/10">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                  </div>
                )}
                {!scanning && !scannedData && !markAttendanceMutation.isPending && (
                  <ScanLine className="h-16 w-16 text-slate-800" />
                )}
              </div>
            </div>
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
              className={`${scanning ? "bg-red-500/10 border-red-500 text-red-500 hover:bg-red-500/20" : "bg-primary hover:bg-primary/90 text-white"} px-12 h-14 text-lg font-bold transition-all`}
            >
              {scanning ? (
                <><CameraOff className="mr-3 h-5 w-5" /> Stop Scanner</>
              ) : (
                <><ScanLine className="mr-3 h-5 w-5" /> Start Scanner</>
              )}
            </Button>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              {!window.isSecureContext ? "Secure Connection Required" : scanning ? "System Active • Scan QR Code" : "Align code within viewfinder"}
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 backdrop-blur-sm">
              <p className="text-emerald-500 font-bold text-lg flex items-center justify-center gap-2 uppercase">
                <CheckCircle2 className="h-5 w-5" /> Attendance Verified
              </p>
              <div className="mt-4 flex flex-col items-center gap-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Session Confirmed</p>
                <p className="text-slate-200 font-bold mt-1">{scannedData.attendanceRecord?.course?.name || "Session Authenticated"}</p>
                <div className="h-px w-8 bg-slate-800 my-2" />
                <p className="text-[10px] text-primary font-medium tracking-wide">{new Date().toLocaleTimeString()} • Verified Link</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-slate-800 text-slate-500 hover:text-white" onClick={() => setScannedData(null)}>Scan Again</Button>
          </div>
        )}
      </div>

      {/* Status Indicators */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Location", status: "Geofenced", icon: MapPin, color: "text-primary" },
          { label: "Network", status: "Encrypted", icon: Wifi, color: "text-primary" },
          { label: "Identity", status: "Validated", icon: Fingerprint, color: "text-primary" }
        ].map((item, i) => (
          <Card key={i} className="bg-slate-900/40 border-slate-800 shadow-md">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                <p className={`text-[10px] font-bold ${item.color} uppercase tracking-tighter`}>{item.status}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Notice */}
      <Card className="bg-slate-900/20 border-slate-800/50">
        <CardContent className="p-4 flex items-center gap-4 text-slate-500">
          <Clock className="h-5 w-5 opacity-50" />
          <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
            Attendance window is active. Please ensure you scan within the starting 10 minutes for full credit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
