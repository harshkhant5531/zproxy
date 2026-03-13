import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceAPI } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Radar,
  MapPinned,
  Timer,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGeolocationPermissionState,
  getLocationErrorMessage,
  isGeolocationAvailable,
  requestStabilizedPositionWithRetry,
} from "@/lib/location";

type GeofenceDebug = {
  distanceMeters?: number;
  rawDistanceMeters?: number;
  toleranceMeters?: number;
  driftBufferMeters?: number;
  radiusMeters?: number;
  reportedAccuracyMeters?: number;
  maxAcceptableAccuracyMeters?: number;
};

export default function VerifyAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [geofenceDebug, setGeofenceDebug] = useState<GeofenceDebug | null>(
    null,
  );
  const autoVerifyStartedRef = useRef(false);

  const token = searchParams.get("token");

  const extractErrorMessage = (error: unknown) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object" &&
      (error as { response?: unknown }).response !== null
    ) {
      const response = (error as { response?: { data?: { message?: string } } })
        .response;
      if (response?.data?.message) {
        return response.data.message;
      }
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return "Network Timeout";
  };

  const extractGeofenceDebug = (error: unknown): GeofenceDebug | null => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object" &&
      (error as { response?: unknown }).response !== null
    ) {
      const response = (
        error as {
          response?: { data?: { debug?: { geofence?: GeofenceDebug } } };
        }
      ).response;
      return response?.data?.debug?.geofence || null;
    }

    return null;
  };

  const verifyMutation = useMutation({
    mutationFn: (data: {
      token: string;
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
        data.token,
        data.lat,
        data.lng,
        `AuraSecure-${user?.id}`,
        data.accuracy,
        data.locationCapturedAt,
        data.locationMeta,
      ),
  });

  const handleVerify = async () => {
    if (!token) return;

    if (!isGeolocationAvailable()) {
      setStatus("error");
      setErrorMessage("Location is not supported by your browser.");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");
    setGeofenceDebug(null);

    try {
      const permissionState = await getGeolocationPermissionState();
      if (permissionState === "denied") {
        throw new Error(
          "Location permission is blocked. Enable location access to verify attendance.",
        );
      }

      const location = await requestStabilizedPositionWithRetry({
        timeout: 25000,
        desiredAccuracyMeters: 40,
      });

      await verifyMutation.mutateAsync({
        token,
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
        locationCapturedAt: location.capturedAt,
        locationMeta: {
          sampleCount: location.sampleCount,
          sampleSpreadMeters: location.sampleSpreadMeters,
          source: "stabilized-median",
        },
      });

      setStatus("success");
      setGeofenceDebug(null);
      toast.success("Attendance verified successfully");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
    } catch (error: unknown) {
      setStatus("error");
      setGeofenceDebug(extractGeofenceDebug(error));

      const hasApiResponse =
        typeof error === "object" && error !== null && "response" in error;
      const detail = hasApiResponse
        ? extractErrorMessage(error)
        : getLocationErrorMessage(error);

      setErrorMessage(detail);
      toast.error("Verification failed");
    }
  };

  const handleRetry = () => {
    autoVerifyStartedRef.current = true;
    handleVerify();
  };

  useEffect(() => {
    if (
      !authLoading &&
      user &&
      token &&
      status === "verifying" &&
      !autoVerifyStartedRef.current
    ) {
      autoVerifyStartedRef.current = true;
      handleVerify();
    }
  }, [authLoading, status, token, user]);

  // Handle case where user isn't logged in
  useEffect(() => {
    if (!authLoading && !user) {
      toast.info("Please log in to verify your attendance");
      const redirectPath = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      navigate(`/login?redirect=${redirectPath}`, { replace: true });
    }
  }, [user, authLoading, token, navigate]);

  if (authLoading || (user && status === "verifying")) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 flex items-center justify-center relative overflow-hidden">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm relative motion-scale-in">
          <div className="mx-auto relative h-24 w-24 mb-6">
            <div className="absolute inset-0 rounded-full border-[3px] border-primary/20" />
            <div className="absolute inset-0 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
            <Shield className="absolute inset-0 m-auto h-10 w-10 text-primary" />
          </div>

          <p className="text-2xl font-bold tracking-tight text-foreground">
            {authLoading ? "Validating Identity" : "Verifying Presence"}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {authLoading
              ? "Checking student session and authorization"
              : "Capturing GPS telemetry and confirming geofence"}
          </p>

          {!authLoading && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
              <Radar className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                High Accuracy Scan
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderTelemetry = () => {
    if (!geofenceDebug) return null;

    const chips = [
      {
        icon: MapPinned,
        label: "Raw Distance",
        value:
          geofenceDebug.rawDistanceMeters !== undefined
            ? `${geofenceDebug.rawDistanceMeters}m`
            : null,
      },
      {
        icon: MapPinned,
        label: "Effective",
        value:
          geofenceDebug.distanceMeters !== undefined
            ? `${geofenceDebug.distanceMeters}m`
            : null,
      },
      {
        icon: Timer,
        label: "Tolerance",
        value:
          geofenceDebug.toleranceMeters !== undefined
            ? `${geofenceDebug.toleranceMeters}m`
            : null,
      },
      {
        icon: Timer,
        label: "Drift Buffer",
        value:
          geofenceDebug.driftBufferMeters !== undefined
            ? `${geofenceDebug.driftBufferMeters}m`
            : null,
      },
      {
        icon: Radar,
        label: "Radius",
        value:
          geofenceDebug.radiusMeters !== undefined
            ? `${geofenceDebug.radiusMeters}m`
            : null,
      },
      {
        icon: Radar,
        label: "Accuracy",
        value:
          geofenceDebug.reportedAccuracyMeters !== undefined
            ? `±${geofenceDebug.reportedAccuracyMeters}m`
            : null,
      },
    ].filter((chip) => chip.value !== null);

    if (chips.length === 0) return null;

    return (
      <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Geofence Telemetry
        </p>
        <div className="grid grid-cols-2 gap-2">
          {chips.map((chip) => (
            <div
              key={chip.label}
              className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2 text-left"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <chip.icon className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                  {chip.label}
                </span>
              </div>
              <p className="text-sm font-bold text-foreground">{chip.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">

      <Card className="w-full max-w-xl border-border bg-card shadow-md overflow-hidden motion-page-enter">
        <CardHeader className="text-center pt-8 pb-4 px-6 border-b border-border bg-muted/30">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Session Authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Secure attendance gateway
          </p>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 py-7 text-center">
          {status === "success" ? (
            <div className="space-y-6 motion-slide-up">
              <div className="mx-auto h-28 w-28 rounded-full border-2 border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  Attendance Confirmed
                </h2>
                <p className="text-muted-foreground mt-2">
                  Verification completed successfully for this session.
                </p>
              </div>
              <Button
                onClick={() => navigate("/student/dashboard")}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-widest uppercase rounded-xl motion-press"
              >
                Continue to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-5 motion-slide-up">
              <div className="mx-auto h-28 w-28 rounded-full border-2 border-destructive/30 bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-14 w-14 text-destructive" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-destructive tracking-tight">
                  Verification Failed
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {errorMessage}
                </p>
              </div>

              {renderTelemetry()}

              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleRetry}
                  disabled={verifyMutation.isPending}
                  className="w-full h-12 bg-primary text-primary-foreground font-bold tracking-widest uppercase rounded-xl motion-press"
                >
                  {verifyMutation.isPending
                    ? "Re-verifying..."
                    : "Retry Verification"}
                </Button>
                <Button
                  onClick={() => navigate("/student/scan")}
                  variant="outline"
                  className="w-full h-12 border-border text-foreground rounded-xl motion-press"
                >
                  Open Manual Scanner
                </Button>
                <Button
                  onClick={() => navigate("/student/dashboard")}
                  variant="ghost"
                  className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl motion-press"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <div className="bg-muted/30 px-4 py-3 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground/60 font-mono uppercase tracking-[0.4em]">
            Shielded by Aura-Integrity v4.0
          </p>
        </div>
      </Card>
    </div>
  );
}
