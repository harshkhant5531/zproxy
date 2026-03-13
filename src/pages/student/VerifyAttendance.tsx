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
        <div className="absolute -top-20 -left-16 h-72 w-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-80 w-80 bg-info/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/90 backdrop-blur-xl p-8 text-center shadow-xl relative">
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
              <span className="app-caption text-primary font-semibold uppercase">
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
      <div className="mt-5 rounded-2xl border border-border/80 bg-background/80 p-4">
        <p className="app-kicker text-left mb-3">
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
                <span className="app-kicker normal-case tracking-wide font-semibold">
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
      <div className="absolute top-0 left-0 h-80 w-80 bg-primary/10 blur-3xl rounded-full -translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 right-0 h-96 w-96 bg-info/10 blur-3xl rounded-full translate-x-1/4 translate-y-1/4" />

      <Card className="w-full max-w-xl border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <CardHeader className="text-center pt-8 pb-4 px-6 border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent">
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Session Authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Secure attendance gateway
          </p>
        </CardHeader>

        <CardContent className="px-6 sm:px-8 py-7 text-center">
          {status === "success" ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="mx-auto h-28 w-28 rounded-full border-2 border-success/40 bg-success/10 flex items-center justify-center shadow-[0_0_36px_hsl(var(--success)/0.22)]">
                <CheckCircle2 className="h-14 w-14 text-success" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-success tracking-tight">
                  Attendance Confirmed
                </h2>
                <p className="text-muted-foreground mt-2">
                  Verification completed successfully for this session.
                </p>
              </div>
              <Button
                onClick={() => navigate("/student/dashboard")}
                className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold"
              >
                Continue to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-5 animate-in fade-in duration-500">
              <div className="mx-auto h-28 w-28 rounded-full border-2 border-destructive/40 bg-destructive/10 flex items-center justify-center shadow-[0_0_36px_hsl(var(--destructive)/0.18)]">
                <AlertTriangle className="h-14 w-14 text-destructive" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-destructive tracking-tight">
                  Verification Failed
                </h2>
                <p className="app-body-copy mt-2">
                  {errorMessage}
                </p>
              </div>

              {renderTelemetry()}

              <div className="space-y-3 pt-1">
                <Button
                  onClick={handleRetry}
                  disabled={verifyMutation.isPending}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {verifyMutation.isPending
                    ? "Re-verifying..."
                    : "Retry Verification"}
                </Button>
                <Button
                  onClick={() => navigate("/student/scan")}
                  variant="outline"
                  className="w-full h-12 border-border text-foreground"
                >
                  Open Manual Scanner
                </Button>
                <Button
                  onClick={() => navigate("/student/dashboard")}
                  variant="ghost"
                  className="w-full h-11 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <div className="bg-muted/30 px-4 py-3 border-t border-border/60 text-center">
          <p className="text-[9px] text-muted-foreground/70 font-mono uppercase tracking-[0.3em]">
            Shielded by Aura-Integrity v4.0
          </p>
        </div>
      </Card>
    </div>
  );
}
