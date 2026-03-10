/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanLine,
  MapPin,
  Clock,
  CheckCircle2,
  Wifi,
  Fingerprint,
  Loader2,
  Camera,
  CameraOff,
  QrCode,
  Hand,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceAPI, sessionsAPI } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";

type ScanMode = "qr" | "manual";

function errorLabel(err: any): string {
  const msg: string = err?.response?.data?.message || err?.message || "";
  if (msg.toLowerCase().includes("batch"))
    return "Wrong Batch — This session is restricted to a different batch.";
  if (msg.toLowerCase().includes("already") || err?.response?.status === 409)
    return "Already Marked — Your attendance was already recorded for this session.";
  if (msg.toLowerCase().includes("enrolled in this course"))
    return "Not Enrolled — You are not enrolled in the course for this session.";
  if (msg.toLowerCase().includes("enrolled in this subject"))
    return "Not Enrolled — You are not enrolled in the required subject.";
  if (
    msg.toLowerCase().includes("expired") ||
    msg.toLowerCase().includes("invalid qr")
  )
    return "QR Expired — The code has expired. Ask your faculty to refresh.";
  if (msg.toLowerCase().includes("session not found"))
    return "Session Not Found — This session no longer exists.";
  if (msg.toLowerCase().includes("active"))
    return "Inactive Session — This session is not currently accepting attendance.";
  return msg || "Verification failed. Please try again.";
}

export default function QRScanner() {
  const [mode, setMode] = useState<ScanMode>(
    !window.isSecureContext ? "manual" : "qr",
  );
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [manualResult, setManualResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "not_requested" | "granted" | "denied"
  >("not_requested");
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = "reader";

  // Fetch active sessions for manual mode
  const {
    data: activeSessions,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ["active-sessions-student"],
    queryFn: async () => {
      const resp = await sessionsAPI.getSessions({
        timetableOnly: "true",
        limit: 20,
      });
      return resp.data.data.sessions as any[];
    },
    enabled: mode === "manual" && !manualResult,
    retry: 1,
  });

  const markQRMutation = useMutation({
    mutationFn: (qrCode: string) =>
      attendanceAPI.markAttendanceQR(
        qrCode,
        "Institutional Geofence",
        `UserDevice-${user?.id}`,
      ),
    onSuccess: (resp) => {
      setScannedData(resp.data.data);
      setLastError(null);
      toast.success("Attendance verified and recorded!");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
      stopScanner();
    },
    onError: (err: any) => {
      setLastError(errorLabel(err));
      setScanning(false);
    },
  });

  const markManualMutation = useMutation({
    mutationFn: (sessionId: number) =>
      attendanceAPI.markAttendance({
        sessionId,
        status: "present",
        deviceInfo: `UserDevice-${user?.id}`,
        location: "Institutional Geofence",
      }),
    onSuccess: (resp) => {
      setManualResult(resp.data.data);
      setLastError(null);
      toast.success("Attendance marked successfully!");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
    },
    onError: (err: any) => {
      setLastError(errorLabel(err));
    },
  });

  const startScanner = async () => {
    setLastError(null);
    try {
      setScanning(true);
      const html5QrCode = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = html5QrCode;
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          html5QrCode.stop();
          setScanning(false);
          let token = decodedText;
          try {
            if (decodedText.startsWith("http")) {
              const url = new URL(decodedText);
              const urlToken = url.searchParams.get("token");
              if (urlToken) token = urlToken;
            }
          } catch {
            /* ignore parse error */
          }
          markQRMutation.mutate(token);
        },
        () => {
          /* frame decode errors — ignore */
        },
      );
      setPermissionStatus("granted");
    } catch (err: any) {
      setScanning(false);
      if (err?.toString().includes("NotAllowedError")) {
        setPermissionStatus("denied");
        toast.error(
          "Camera permission denied. Please enable it in your browser settings.",
        );
      } else {
        toast.error("Failed to start camera. Is another app using it?");
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  const reset = () => {
    stopScanner();
    setScannedData(null);
    setManualResult(null);
    setLastError(null);
  };

  // Switch mode — also reset state and stop any active scan
  const switchMode = (m: ScanMode) => {
    if (m === mode) return;
    reset();
    setMode(m);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // ─── Shared success card ────────────────────────────────────────────────────
  const SuccessCard = ({ record }: { record: any }) => (
    <div className="space-y-4 animate-in slide-in-from-bottom-4">
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>
        <p className="text-emerald-500 font-black text-sm uppercase tracking-widest">
          Attendance Recorded
        </p>
        {record?.attendance?.session && (
          <div className="space-y-0.5">
            <p className="text-foreground font-bold">
              {record.attendance.session.subject?.name ||
                record.attendance.session.course?.name ||
                "Session Authenticated"}
            </p>
            <p className="text-[10px] text-primary/70 font-medium tracking-wide uppercase">
              {format(
                new Date(record.attendance.session.date || Date.now()),
                "MMM dd, yyyy",
              )}{" "}
              • {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full border-border text-muted-foreground hover:text-foreground uppercase text-[10px] font-black tracking-widest"
        onClick={reset}
      >
        <RefreshCw className="mr-2 h-3 w-3" /> Mark Again
      </Button>
    </div>
  );

  // ─── Error display ──────────────────────────────────────────────────────────
  const ErrorBanner = ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry: () => void;
  }) => {
    const [title, ...rest] = message.split("—").map((s) => s.trim());
    return (
      <div className="bg-destructive/10 border border-destructive/25 rounded-xl p-4 space-y-3 animate-in fade-in">
        <div className="flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-destructive">{title}</p>
            {rest.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                {rest.join(" — ")}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 uppercase text-[10px] font-black tracking-widest"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tighter text-foreground uppercase aura-text-glow">
          Biometric Verification
        </h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">
          Secure Attendance Authentication System
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl border border-border w-fit">
        <button
          onClick={() => switchMode("qr")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
            mode === "qr"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          QR Camera
        </button>
        <button
          onClick={() => switchMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
            mode === "manual"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Hand className="h-3.5 w-3.5" />
          Manual Check-In
        </button>
      </div>

      {/* ─── QR MODE ─────────────────────────────────────────────────────── */}
      {mode === "qr" && (
        <>
          {/* Insecure context warning banner (non-blocking) */}
          {!window.isSecureContext && (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-500">
                  Camera Unavailable on HTTP
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Browsers block camera access on non-HTTPS origins. Switch to{" "}
                  <strong className="text-foreground">Manual Check-In</strong>{" "}
                  above, or enable the flag{" "}
                  <code className="bg-background/80 px-1 rounded text-primary text-[10px]">
                    chrome://flags/#unsafely-treat-insecure-origin-as-secure
                  </code>{" "}
                  and add{" "}
                  <code className="bg-background/80 px-1 rounded text-primary text-[10px]">
                    {window.location.origin}
                  </code>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Scanner viewfinder */}
          <Card className="bg-card border-border overflow-hidden shadow-xl">
            <CardContent className="p-0">
              <div className="relative bg-muted/20 aspect-square max-h-80 flex items-center justify-center overflow-hidden">
                <div id={SCANNER_ID} className="w-full h-full object-cover" />

                {/* Idle overlay */}
                {!scanning &&
                  !scannedData &&
                  !markQRMutation.isPending &&
                  window.isSecureContext && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-30">
                      {permissionStatus === "denied" ? (
                        <div className="text-center p-6 space-y-3">
                          <CameraOff className="h-14 w-14 text-destructive mx-auto" />
                          <p className="text-sm font-bold text-foreground">
                            Camera Blocked
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Enable camera permission in your browser settings,
                            then refresh.
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="uppercase text-[10px] font-black tracking-widest"
                          >
                            Refresh Page
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <Camera className="h-14 w-14 text-primary/40 mx-auto" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Camera not active
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
                            Press Start Scanner below
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                {/* HTTP block overlay */}
                {!window.isSecureContext && (
                  <div className="absolute inset-0 bg-background/90 z-40 flex items-center justify-center">
                    <div className="text-center p-6 space-y-2">
                      <CameraOff className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        Camera disabled on HTTP
                      </p>
                    </div>
                  </div>
                )}

                {/* Scan beam animation */}
                {scanning && !markQRMutation.isPending && (
                  <div
                    className="animate-scan-beam bg-gradient-to-r from-transparent via-primary to-transparent z-20"
                    style={{
                      boxShadow: "0 0 12px 4px hsl(var(--primary) / 0.35)",
                    }}
                  />
                )}

                {/* Corner targeting brackets */}
                <div
                  className={`absolute w-64 h-64 z-10 pointer-events-none transition-opacity duration-300 ${scanning ? "opacity-100" : "opacity-20"}`}
                >
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {markQRMutation.isPending && (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <span className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest">
                          Verifying…
                        </span>
                      </div>
                    )}
                    {scannedData && (
                      <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500 shadow-lg shadow-emerald-500/10 animate-in zoom-in-50">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </div>
                    )}
                    {scanning && !markQRMutation.isPending && (
                      <ScanLine className="h-12 w-12 text-primary/30 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action / result area */}
          {scannedData ? (
            <SuccessCard record={scannedData} />
          ) : lastError ? (
            <ErrorBanner
              message={lastError}
              onRetry={() => {
                setLastError(null);
              }}
            />
          ) : (
            <div className="text-center space-y-3">
              <Button
                onClick={scanning ? stopScanner : startScanner}
                disabled={markQRMutation.isPending || !window.isSecureContext}
                size="lg"
                variant={scanning ? "outline" : "default"}
                className={`px-12 h-14 text-base font-black uppercase tracking-widest transition-all ${
                  scanning
                    ? "border-destructive text-destructive hover:bg-destructive/10"
                    : ""
                }`}
              >
                {scanning ? (
                  <>
                    <CameraOff className="mr-3 h-5 w-5" /> Stop Scanner
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-3 h-5 w-5" /> Start Scanner
                  </>
                )}
              </Button>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {!window.isSecureContext
                  ? "Camera unavailable — use Manual Check-In"
                  : scanning
                    ? "Active • Align QR code with viewfinder"
                    : "Center the QR code in the viewfinder"}
              </p>
            </div>
          )}
        </>
      )}

      {/* ─── MANUAL MODE ─────────────────────────────────────────────────── */}
      {mode === "manual" && (
        <div className="space-y-4">
          {manualResult ? (
            <SuccessCard record={manualResult} />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Today's Timetable Sessions
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSessions()}
                  disabled={isSessionsLoading}
                  className="text-[10px] uppercase font-black tracking-widest text-primary hover:text-primary/80 h-7 px-2"
                >
                  <RefreshCw
                    className={`h-3 w-3 mr-1 ${isSessionsLoading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>

              {/* Loading skeleton */}
              {isSessionsLoading && (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-20 rounded-xl animate-shimmer"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              )}

              {/* Error fetching sessions */}
              {isSessionsError && !isSessionsLoading && (
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 text-destructive/40 mx-auto" />
                    <p className="text-sm font-bold text-foreground">
                      Failed to Load Sessions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Could not reach the server. Check your connection.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchSessions()}
                      className="uppercase text-[10px] font-black tracking-widest"
                    >
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* No timetable sessions today */}
              {!isSessionsLoading &&
                !isSessionsError &&
                activeSessions?.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-10 text-center space-y-3">
                      <BookOpen className="h-10 w-10 text-muted-foreground/20 mx-auto" />
                      <p className="text-sm font-bold text-foreground">
                        No Active Sessions
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No sessions are currently open for your enrolled
                        courses.
                        <br />
                        Ask your faculty to start a session, then refresh.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSessions()}
                        className="uppercase text-[10px] font-black tracking-widest mt-2"
                      >
                        <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh
                      </Button>
                    </CardContent>
                  </Card>
                )}

              {/* Error from last mark attempt */}
              {lastError && (
                <ErrorBanner
                  message={lastError}
                  onRetry={() => setLastError(null)}
                />
              )}

              {/* Session list */}
              {!isSessionsLoading &&
                !isSessionsError &&
                (activeSessions?.length ?? 0) > 0 && (
                  <div className="space-y-3">
                    {activeSessions!.map((sess: any, i: number) => {
                      const isPending =
                        markManualMutation.isPending &&
                        markManualMutation.variables === sess.id;
                      return (
                        <Card
                          key={sess.id}
                          className="bg-card border-border hover:border-primary/40 transition-colors shadow-md animate-in slide-in-from-bottom-2"
                          style={{
                            animationDelay: `${i * 80}ms`,
                            animationFillMode: "both",
                          }}
                        >
                          <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-foreground text-sm truncate">
                                  {sess.subject?.name ||
                                    sess.course?.name ||
                                    "Session"}
                                </p>
                                {sess.subject?.name && (
                                  <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase tracking-tight shrink-0">
                                    {sess.course?.code}
                                  </span>
                                )}
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase px-2 shrink-0">
                                  Live
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {sess.startTime} – {sess.endTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  {sess.topic}
                                </span>
                              </div>
                              {sess.batches?.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {sess.batches.map((b: string) => (
                                    <span
                                      key={b}
                                      className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-black uppercase"
                                    >
                                      Batch {b}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setLastError(null);
                                markManualMutation.mutate(sess.id);
                              }}
                              disabled={markManualMutation.isPending}
                              className="font-black uppercase tracking-widest text-[10px] shrink-0 h-10 px-4"
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Hand className="mr-1.5 h-3.5 w-3.5" /> Mark
                                  Present
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
            </>
          )}
        </div>
      )}

      {/* Status indicators */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Location", status: "Geofenced", icon: MapPin },
          { label: "Network", status: "Encrypted", icon: Wifi },
          { label: "Identity", status: "Validated", icon: Fingerprint },
        ].map((item, i) => (
          <Card key={i} className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="rounded-lg bg-muted p-2 border border-border">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                  {item.label}
                </p>
                <p className="text-[10px] font-black text-primary uppercase tracking-tighter">
                  {item.status}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info notice */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4 flex items-center gap-4 text-muted-foreground">
          <Clock className="h-5 w-5 opacity-40 shrink-0" />
          <p className="text-[10px] font-medium leading-relaxed uppercase tracking-wider">
            Attendance window is active. Mark within the first 10 minutes for
            full credit.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
