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
  Camera,
  CameraOff,
  QrCode,
  Hand,
  AlertTriangle,
  BookOpen,
  RefreshCw,
  XCircle,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { attendanceAPI, sessionsAPI } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import {
  getGeolocationPermissionState,
  getLocationErrorMessage,
  requestStabilizedPositionWithRetry,
} from "@/lib/location";

type ScanMode = "qr" | "manual";
type OverlayType =
  | "qr-verify"
  | "manual-mark"
  | "load-sessions"
  | "locating"
  | null;

type GeofenceDebug = {
  distanceMeters?: number;
  rawDistanceMeters?: number;
  toleranceMeters?: number;
  retryBandMeters?: number;
  radiusMeters?: number;
  reportedAccuracyMeters?: number;
  maxAcceptableAccuracyMeters?: number;
  locationAgeMs?: number;
  maxLocationAgeMs?: number;
  decisionReason?: string;
};

function errorLabel(err: any): string {
  const msg: string = err?.response?.data?.message || err?.message || "";
  const decisionReason =
    err?.response?.data?.debug?.geofence?.decisionReason || err?.decisionReason;

  if (decisionReason === "outside_geofence") {
    const distance = err?.response?.data?.debug?.geofence?.distanceMeters;
    const radius = err?.response?.data?.debug?.geofence?.radiusMeters;
    if (typeof distance === "number" && typeof radius === "number") {
      return `Outside Geofence — You are ${Math.round(distance)}m away. Move within ${Math.round(radius)}m of faculty and retry.`;
    }
    return "Outside Geofence — Move closer to faculty and retry.";
  }

  if (decisionReason === "borderline_retry") {
    return "GPS Unstable — Hold still for a few seconds and retry. We will auto-retry shortly.";
  }

  if (decisionReason === "gps_accuracy_too_low") {
    return "Weak GPS Signal — Move to an open area (balcony/window) and retry.";
  }

  if (decisionReason === "stale_location_sample") {
    return "Stale Location Sample — Refresh location and scan again.";
  }

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

// ── Main component ───────────────────────────────────────────────────────────
export default function QRScanner() {
  const [mode, setMode] = useState<ScanMode>(
    !window.isSecureContext ? "manual" : "qr",
  );
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [manualResult, setManualResult] = useState<any>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastGeofenceDebug, setLastGeofenceDebug] =
    useState<GeofenceDebug | null>(null);
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
    mutationFn: ({
      qrCode,
      lat,
      lng,
      accuracy,
      locationCapturedAt,
      locationMeta,
    }: {
      qrCode: string;
      lat: number;
      lng: number;
      accuracy?: number;
      locationCapturedAt?: string;
      locationMeta?: {
        sampleCount?: number;
        sampleSpreadMeters?: number;
        source?: string;
      };
    }) =>
      attendanceAPI.markAttendanceQR(
        qrCode,
        lat,
        lng,
        `ScannerDevice-${user?.id}`,
        accuracy,
        locationCapturedAt,
        locationMeta,
      ),
    onSuccess: (resp) => {
      setScannedData(resp.data.data);
      setLastError(null);
      setLastGeofenceDebug(null);
      toast.success("Attendance verified and recorded!");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
      stopScanner();
    },
    onError: (err: any) => {
      setLastError(errorLabel(err));
      setLastGeofenceDebug(err?.response?.data?.debug?.geofence || null);
      setScanning(false);
    },
  });

  const markManualMutation = useMutation({
    mutationFn: ({
      sessionId,
      lat,
      lng,
      accuracy,
      locationCapturedAt,
      locationMeta,
    }: {
      sessionId: number;
      lat: number;
      lng: number;
      accuracy?: number;
      locationCapturedAt?: string;
      locationMeta?: {
        sampleCount?: number;
        sampleSpreadMeters?: number;
        source?: string;
      };
    }) =>
      attendanceAPI.markAttendance({
        sessionId,
        status: "present",
        deviceInfo: `ManualDevice-${user?.id}`,
        lat,
        lng,
        accuracy,
        locationCapturedAt,
        locationMeta,
      }),
    onSuccess: (resp) => {
      setManualResult(resp.data.data);
      setLastError(null);
      setLastGeofenceDebug(null);
      toast.success("Attendance marked successfully!");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
    },
    onError: (err: any) => {
      setLastError(errorLabel(err));
      setLastGeofenceDebug(err?.response?.data?.debug?.geofence || null);
    },
  });

  const shouldAutoRetryGeofence = (reason?: string) =>
    reason === "borderline_retry" ||
    reason === "gps_accuracy_too_low" ||
    reason === "stale_location_sample";

  const shouldRetryOutsideGeofence = (geofenceDebug?: GeofenceDebug | null) => {
    if (!geofenceDebug) return false;
    const rawDistance = geofenceDebug.rawDistanceMeters;
    const radius = geofenceDebug.radiusMeters;
    const retryBand = geofenceDebug.retryBandMeters ?? 0;

    if (typeof rawDistance !== "number" || typeof radius !== "number") {
      return false;
    }

    // Allow one recovery pass when the device is just outside practical GPS drift.
    return rawDistance <= radius + retryBand + 80;
  };

  const markQrWithAdaptiveRetry = async (qrCode: string) => {
    const maxAttempts = 3;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const stabilized = await requestStabilizedPositionWithRetry({
        sampleCount: 4 + attempt,
        maxRetries: 3,
        desiredAccuracyMeters: 45,
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      const payload = {
        qrCode,
        lat: stabilized.latitude,
        lng: stabilized.longitude,
        accuracy: stabilized.accuracy,
        locationCapturedAt: stabilized.capturedAt,
        locationMeta: {
          sampleCount: stabilized.sampleCount,
          sampleSpreadMeters: stabilized.sampleSpreadMeters,
          source: "stabilized-median",
        },
      };

      try {
        await markQRMutation.mutateAsync(payload);
        return;
      } catch (err: any) {
        lastErr = err;

        const reason =
          err?.response?.data?.debug?.geofence?.decisionReason ||
          err?.decisionReason;
        const debug = err?.response?.data?.debug?.geofence || null;
        const canAutoRetry =
          shouldAutoRetryGeofence(reason) ||
          (reason === "outside_geofence" && shouldRetryOutsideGeofence(debug));

        if (attempt < maxAttempts && canAutoRetry) {
          setLastError(
            "Improving GPS fix... keep your phone steady for a moment.",
          );
          await new Promise((resolve) => setTimeout(resolve, 900));
          continue;
        }

        throw err;
      }
    }

    if (lastErr) {
      throw lastErr;
    }
  };

  const handleMarkWithLocation = async (
    type: "qr" | "manual",
    id: string | number,
  ) => {
    setLastError(null);
    setLastGeofenceDebug(null);
    setLocating(true);

    try {
      const permissionState = await getGeolocationPermissionState();
      if (permissionState === "denied") {
        throw new Error(
          "Location permission is blocked. Enable GPS/location access and try again.",
        );
      }

      if (type === "qr") {
        await markQrWithAdaptiveRetry(id as string);
      } else {
        const stabilized = await requestStabilizedPositionWithRetry({
          sampleCount: 4,
          maxRetries: 3,
          desiredAccuracyMeters: 50,
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });

        await markManualMutation.mutateAsync({
          sessionId: id as number,
          lat: stabilized.latitude,
          lng: stabilized.longitude,
          accuracy: stabilized.accuracy,
          locationCapturedAt: stabilized.capturedAt,
          locationMeta: {
            sampleCount: stabilized.sampleCount,
            sampleSpreadMeters: stabilized.sampleSpreadMeters,
            source: "stabilized-median",
          },
        });
      }
      setLocating(false);
    } catch (err: any) {
      setLocating(false);
      const isApiError = Boolean(err?.response?.status);
      const msg = isApiError ? errorLabel(err) : getLocationErrorMessage(err);
      setLastError(msg);
      setLastGeofenceDebug(err?.response?.data?.debug?.geofence || null);
      toast.error(msg);
      setScanning(false);
    }
  };

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
              const urlToken =
                url.searchParams.get("token") ||
                url.searchParams.get("qrCode") ||
                url.searchParams.get("code");
              if (urlToken) token = urlToken;
            }
          } catch {
            /* ignore parse error */
          }
          void handleMarkWithLocation("qr", token);
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
    setLastGeofenceDebug(null);
  };

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

  // Determine which full-screen overlay to show
  const [locating, setLocating] = useState(false);
  const overlayType: OverlayType = markQRMutation.isPending
    ? "qr-verify"
    : markManualMutation.isPending
      ? "manual-mark"
      : locating
        ? "locating"
        : mode === "manual" && activeSessions === undefined && isSessionsLoading
          ? "load-sessions"
          : null;

  // ─── Success card with ripple ───────────────────────────────────────────
  const SuccessCard = ({ record }: { record: any }) => (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative bg-success/10 border border-success/25 rounded-2xl p-8 text-center space-y-4 overflow-hidden">
        {/* Ripple rings behind icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-success/15 animate-success-ripple" />
          <div className="absolute inset-0 rounded-full bg-success/10 animate-success-ripple-late" />
          <div className="relative w-20 h-20 rounded-full bg-success/20 border-2 border-success/40 flex items-center justify-center shadow-lg shadow-success/20">
            <CheckCircle2 className="h-9 w-9 text-success animate-in zoom-in-50 duration-500" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p className="text-success font-semibold text-xs tracking-wide">
            Attendance Recorded
          </p>
          {record?.attendance?.session && (
            <div className="space-y-1 pt-1">
              <p className="text-foreground font-semibold text-base">
                {record.attendance.session.subject?.name ||
                  record.attendance.session.course?.name ||
                  "Session Authenticated"}
              </p>
              <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                {format(
                  new Date(record.attendance.session.date || Date.now()),
                  "MMM dd, yyyy",
                )}{" "}
                · {new Date().toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>

        {/* Subtle background grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full border-border text-muted-foreground hover:text-foreground text-[11px] font-medium tracking-wide h-10 rounded-xl transition-all hover:border-primary/40"
        onClick={reset}
      >
        <RefreshCw className="mr-2 h-3 w-3" /> Mark Another Session
      </Button>
    </div>
  );

  // ─── Error banner ───────────────────────────────────────────────────────
  const ErrorBanner = ({
    message,
    geofenceDebug,
    onRetry,
  }: {
    message: string;
    geofenceDebug?: GeofenceDebug | null;
    onRetry: () => void;
  }) => {
    const [title, ...rest] = message.split("—").map((s) => s.trim());
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-destructive/15 border border-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
            <XCircle className="h-4 w-4 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">{title}</p>
            {rest.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {rest.join(" — ")}
              </p>
            )}
          </div>
        </div>
        {geofenceDebug && (
          <div className="rounded-xl border border-border/70 bg-background/70 p-3 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              Geofence Telemetry
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {geofenceDebug.rawDistanceMeters !== undefined && (
                <p>Raw: {geofenceDebug.rawDistanceMeters}m</p>
              )}
              {geofenceDebug.toleranceMeters !== undefined && (
                <p>Tolerance: {geofenceDebug.toleranceMeters}m</p>
              )}
              {geofenceDebug.distanceMeters !== undefined && (
                <p>Effective: {geofenceDebug.distanceMeters}m</p>
              )}
              {geofenceDebug.radiusMeters !== undefined && (
                <p>Radius: {geofenceDebug.radiusMeters}m</p>
              )}
              {geofenceDebug.reportedAccuracyMeters !== undefined && (
                <p>Accuracy: ±{geofenceDebug.reportedAccuracyMeters}m</p>
              )}
              {geofenceDebug.maxAcceptableAccuracyMeters !== undefined && (
                <p>
                  Max Allowed: ±{geofenceDebug.maxAcceptableAccuracyMeters}m
                </p>
              )}
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 text-[11px] font-medium tracking-wide h-9 rounded-xl"
          onClick={onRetry}
        >
          Try Again
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Full-screen operation overlay */}
      <FullScreenLoader
        show={overlayType !== null}
        operation={overlayType ?? "loading"}
      />

      <div className="app-page max-w-3xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-aura-pulse shrink-0">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Attendance Verification
            </h1>
            <p className="text-sm text-muted-foreground">
              Secure attendance verification.
            </p>
          </div>
        </div>

        {/* ─── Mode toggle with sliding indicator ─────────────────────────── */}
        <div className="relative flex p-1 bg-muted/50 rounded-xl border border-border w-full max-w-[270px]">
          {/* Sliding pill */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-6px)] rounded-lg bg-background shadow border border-border transition-transform duration-300 ease-in-out pointer-events-none ${
              mode === "manual"
                ? "translate-x-[calc(100%+4px)]"
                : "translate-x-0"
            }`}
          />
          <button
            onClick={() => switchMode("qr")}
            className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-2 text-xs font-medium tracking-wide transition-colors duration-200 ${
              mode === "qr"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            QR Camera
          </button>
          <button
            onClick={() => switchMode("manual")}
            className={`relative z-10 flex items-center justify-center gap-2 flex-1 py-2 text-xs font-medium tracking-wide transition-colors duration-200 ${
              mode === "manual"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hand className="h-3.5 w-3.5" />
            Manual
          </button>
        </div>

        {/* ─── QR MODE ─────────────────────────────────────────────────────── */}
        {mode === "qr" && (
          <>
            {/* Insecure context warning */}
            {!window.isSecureContext && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/15 border border-warning/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-warning">
                    Camera Unavailable on HTTP
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Browsers block camera access on non-HTTPS origins. Switch to{" "}
                    <strong className="text-foreground">Manual</strong> above,
                    or enable the insecure-origin flag in{" "}
                    <code className="bg-background/80 px-1 rounded text-primary text-[10px]">
                      chrome://flags
                    </code>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* Scanner card */}
            <Card className="bg-card border-border overflow-hidden shadow-2xl rounded-2xl">
              {/* Card header strip */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
                    Camera Viewfinder
                  </span>
                </div>
                {scanning && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success animate-live-blink" />
                    <span className="text-[10px] font-medium text-success tracking-wide">
                      Live
                    </span>
                  </div>
                )}
              </div>

              <CardContent className="p-0">
                <div className="relative bg-black aspect-square max-h-[20rem] sm:max-h-80 flex items-center justify-center overflow-hidden">
                  <div id={SCANNER_ID} className="w-full h-full object-cover" />

                  {/* Idle overlay */}
                  {!scanning &&
                    !scannedData &&
                    !markQRMutation.isPending &&
                    window.isSecureContext && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-30">
                        {permissionStatus === "denied" ? (
                          <div className="text-center p-6 space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                              <CameraOff className="h-8 w-8 text-destructive" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">
                                Camera Blocked
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                Enable camera permission in browser settings,
                                then refresh.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.location.reload()}
                              className="text-[11px] font-medium tracking-wide rounded-xl"
                            >
                              Refresh Page
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center p-6 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-border flex items-center justify-center mx-auto">
                              <QrCode className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              Camera Inactive
                            </p>
                            <p className="text-[11px] text-muted-foreground tracking-wide">
                              Press Start Scanner below
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  {/* HTTP block overlay */}
                  {!window.isSecureContext && (
                    <div className="absolute inset-0 bg-background/95 z-40 flex items-center justify-center">
                      <div className="text-center p-6 space-y-3">
                        <CameraOff className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                        <p className="text-[11px] text-muted-foreground tracking-wide font-medium">
                          Camera disabled on HTTP
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Scan beam */}
                  {scanning && !markQRMutation.isPending && (
                    <div
                      className="animate-scan-beam bg-gradient-to-r from-transparent via-primary to-transparent z-20"
                      style={{
                        boxShadow: "0 0 14px 6px hsl(var(--primary) / 0.4)",
                      }}
                    />
                  )}

                  {/* Corner brackets — pulsing when scanning */}
                  <div
                    className={`absolute w-52 h-52 sm:w-60 sm:h-60 z-10 pointer-events-none transition-opacity duration-500 ${
                      scanning
                        ? "opacity-100 animate-bracket-pulse"
                        : "opacity-20"
                    }`}
                  >
                    <div className="absolute top-0 left-0 w-9 h-9 border-t-2 border-l-2 border-primary rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-9 h-9 border-t-2 border-r-2 border-primary rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-9 h-9 border-b-2 border-l-2 border-primary rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-9 h-9 border-b-2 border-r-2 border-primary rounded-br-xl" />
                    {scanning && (
                      <>
                        <div className="absolute top-0 left-0 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_2px_hsl(var(--primary)/0.8)]" />
                        <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_2px_hsl(var(--primary)/0.8)]" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_2px_hsl(var(--primary)/0.8)]" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-full shadow-[0_0_6px_2px_hsl(var(--primary)/0.8)]" />
                      </>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {scannedData && (
                        <div className="h-16 w-16 bg-success/20 rounded-full flex items-center justify-center border-2 border-success shadow-xl shadow-success/20 animate-in zoom-in-50 duration-400">
                          <CheckCircle2 className="h-8 w-8 text-success" />
                        </div>
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
                geofenceDebug={lastGeofenceDebug}
                onRetry={() => {
                  setLastError(null);
                  setLastGeofenceDebug(null);
                }}
              />
            ) : (
              <div className="text-center space-y-3">
                <Button
                  onClick={scanning ? stopScanner : startScanner}
                  disabled={markQRMutation.isPending || !window.isSecureContext}
                  size="lg"
                  variant={scanning ? "outline" : "default"}
                  className={`w-full sm:w-auto px-6 sm:px-12 h-14 text-sm font-medium tracking-wide rounded-xl transition-all duration-200 shadow-lg ${
                    scanning
                      ? "border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive"
                      : "shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl"
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
                <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
                  {!window.isSecureContext
                    ? "Camera unavailable — use Manual mode"
                    : scanning
                      ? "Active · Align QR code within the frame"
                      : "Position the QR code inside the viewfinder"}
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
                {/* Section header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                    <p className="text-[11px] font-medium text-muted-foreground tracking-wide">
                      Today's Timetable Sessions
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchSessions()}
                    disabled={isSessionsLoading}
                    className="text-[11px] font-medium tracking-wide text-primary hover:text-primary/80 h-7 px-2 rounded-lg"
                  >
                    <RefreshCw
                      className={`h-3 w-3 mr-1 ${isSessionsLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </Button>
                </div>

                {/* Loading state indicator (replaces skeleton) */}
                {isSessionsLoading && activeSessions !== undefined && (
                  <div className="py-8 text-center bg-card rounded-2xl border border-border">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin mx-auto mb-3" />
                    <p className="text-xs font-medium text-muted-foreground tracking-wide">
                      Loading latest sessions...
                    </p>
                  </div>
                )}

                {/* Error fetching sessions */}
                {isSessionsError && !isSessionsLoading && (
                  <Card className="bg-card border-border rounded-2xl">
                    <CardContent className="p-8 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/15 flex items-center justify-center mx-auto">
                        <AlertTriangle className="h-7 w-7 text-destructive/50" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Failed to Load Sessions
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Could not reach the server. Check your connection.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetchSessions()}
                        className="text-[11px] font-medium tracking-wide rounded-xl"
                      >
                        Retry
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* No sessions today */}
                {!isSessionsLoading &&
                  !isSessionsError &&
                  activeSessions?.length === 0 && (
                    <Card className="bg-card border-border rounded-2xl">
                      <CardContent className="p-10 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto">
                          <BookOpen className="h-7 w-7 text-muted-foreground/30" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            No Active Sessions
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed max-w-xs mx-auto">
                            No sessions are currently open for your enrolled
                            courses. Ask your faculty to start a session.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetchSessions()}
                          className="text-[11px] font-medium tracking-wide rounded-xl"
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
                    geofenceDebug={lastGeofenceDebug}
                    onRetry={() => {
                      setLastError(null);
                      setLastGeofenceDebug(null);
                    }}
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
                            className="bg-card border-border rounded-2xl hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 animate-in slide-in-from-bottom-2 overflow-hidden"
                            style={{
                              animationDelay: `${i * 80}ms`,
                              animationFillMode: "both",
                            }}
                          >
                            <div className="flex">
                              {/* Colored accent bar */}
                              <div className="w-1 bg-gradient-to-b from-primary/80 to-primary/20 shrink-0" />
                              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-1">
                                <div className="flex-1 min-w-0 space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-foreground text-sm truncate">
                                      {sess.subject?.name ||
                                        sess.course?.name ||
                                        "Session"}
                                    </p>
                                    {sess.subject?.name && (
                                      <span className="text-[9px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md uppercase tracking-tight shrink-0">
                                        {sess.course?.code}
                                      </span>
                                    )}
                                    <Badge className="bg-success/10 text-success border-success/20 text-[9px] font-semibold uppercase px-2 shrink-0 gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-live-blink inline-block" />
                                      Live
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {sess.startTime} – {sess.endTime}
                                    </span>
                                    {sess.topic && (
                                      <span className="flex items-center gap-1 truncate max-w-[160px]">
                                        <BookOpen className="h-3 w-3 shrink-0" />
                                        {sess.topic}
                                      </span>
                                    )}
                                  </div>
                                  {sess.batches?.length > 0 && (
                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {sess.batches.map((b: string) => (
                                        <span
                                          key={b}
                                          className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md font-medium"
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
                                    handleMarkWithLocation("manual", sess.id);
                                  }}
                                  disabled={
                                    markManualMutation.isPending || locating
                                  }
                                  className="w-full sm:w-auto font-medium tracking-wide text-[11px] shrink-0 h-10 px-4 rounded-xl shadow-md shadow-primary/20 hover:shadow-primary/35 transition-all hover:scale-[1.03] active:scale-[0.97]"
                                >
                                  {isPending ? (
                                    <span className="flex items-center gap-1">
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce-dot"
                                        style={{ animationDelay: "0s" }}
                                      />
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce-dot"
                                        style={{ animationDelay: "0.22s" }}
                                      />
                                      <span
                                        className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-bounce-dot"
                                        style={{ animationDelay: "0.44s" }}
                                      />
                                    </span>
                                  ) : (
                                    <>
                                      <Hand className="mr-1.5 h-3.5 w-3.5" />
                                      Mark Present
                                    </>
                                  )}
                                </Button>
                              </CardContent>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {/* ─── Security indicators ─────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Location",
              status: "Geofenced",
              icon: MapPin,
              color: "text-info",
              iconBg: "bg-info/10 border-info/20",
              dot: "bg-info",
            },
            {
              label: "Network",
              status: "Encrypted",
              icon: Wifi,
              color: "text-info",
              iconBg: "bg-info/10 border-info/20",
              dot: "bg-info",
            },
            {
              label: "Identity",
              status: "Validated",
              icon: Fingerprint,
              color: "text-success",
              iconBg: "bg-success/10 border-success/20",
              dot: "bg-success",
            },
          ].map((item, i) => (
            <Card
              key={i}
              className="bg-card border-border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 animate-in fade-in slide-in-from-bottom-2"
              style={{
                animationDelay: `${i * 60}ms`,
                animationFillMode: "both",
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-xl ${item.iconBg} border p-2.5`}>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="space-y-0.5 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground tracking-wide leading-none">
                    {item.label}
                  </p>
                  <p
                    className={`text-[11px] font-medium tracking-wide ${item.color}`}
                  >
                    {item.status}
                  </p>
                </div>
                <span
                  className={`block w-1.5 h-1.5 rounded-full ${item.dot} animate-live-blink shrink-0`}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Info notice ─────────────────────────────────────────────────── */}
        <Card className="bg-muted/30 border-border/50 rounded-xl">
          <CardContent className="p-4 flex items-center gap-4 text-muted-foreground">
            <Clock className="h-4 w-4 opacity-40 shrink-0" />
            <p className="text-[11px] font-medium leading-relaxed tracking-wide">
              Attendance window is active. Mark within the first 10 minutes for
              full credit.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
