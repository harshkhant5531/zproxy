import { useCallback, useEffect, useState } from "react";
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
  Loader2,
  ArrowLeft,
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
    }) =>
      attendanceAPI.markAttendanceQR(
        data.token,
        data.lat,
        data.lng,
        `AuraSecure-${user?.id}`,
        data.accuracy,
      ),
    onSuccess: () => {
      setStatus("success");
      setGeofenceDebug(null);
      toast.success("Attendance verified successfully");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
    },
    onError: (err: unknown) => {
      setStatus("error");
      setGeofenceDebug(extractGeofenceDebug(err));
      const detail = extractErrorMessage(err);
      setErrorMessage(
        detail.includes("Spatial")
          ? detail
          : `${detail}. Please ensure your device is on the campus network.`,
      );
      console.error("Verification error details:", err);
      toast.error("Verification failed");
    },
  });

  const handleVerify = useCallback(() => {
    if (!token) return;

    if (!isGeolocationAvailable()) {
      setStatus("error");
      setErrorMessage("Location is not supported by your browser.");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");
    setGeofenceDebug(null);

    const attemptVerification = () => {
      getGeolocationPermissionState()
        .then((permissionState) => {
          if (permissionState === "denied") {
            throw new Error(
              "Location permission is blocked. Enable location access to verify attendance.",
            );
          }

          return requestStabilizedPositionWithRetry({
            timeout: 25000,
            desiredAccuracyMeters: 40,
          });
        })
        .then((location) => {
          const { latitude, longitude, accuracy } = location;
          console.log(
            `Presence confirmed at: ${latitude}, ${longitude} (±${accuracy}m)`,
          );

          verifyMutation.mutate({
            token,
            lat: latitude,
            lng: longitude,
            accuracy,
          });
        })
        .catch((error: unknown) => {
          setStatus("error");
          setErrorMessage(getLocationErrorMessage(error));
        });
    };

    attemptVerification();
  }, [token, verifyMutation]);

  const handleRetry = () => {
    handleVerify();
  };

  useEffect(() => {
    if (!authLoading && user && token && status === "verifying") {
      handleVerify();
    }
  }, [authLoading, handleVerify, status, token, user]);

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
      <div className="flex h-screen items-center justify-center bg-background text-foreground px-4">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-24 w-24">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <Shield className="absolute inset-0 m-auto h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-medium tracking-tight text-foreground">
              {authLoading ? "Identity Check" : "Spatial Verification"}
            </p>
            <p className="text-sm text-muted-foreground animate-pulse">
              {authLoading
                ? "Authenticating neural link..."
                : "Triangulating presence in faculty grid..."}
            </p>
            {!authLoading && (
              <p className="text-[10px] text-muted-foreground/50 font-mono italic">
                Keep device stable. Searching for high-accuracy telemetry...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6">
      <Card className="app-surface w-full max-w-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <CardHeader className="text-center pb-2 pt-6 sm:pt-7">
          <CardTitle className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
            Session Authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Secure Attendance Gateway
          </p>
        </CardHeader>

        <CardContent className="p-5 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 text-center">
          {status === "success" ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="mx-auto h-28 w-28 bg-success/10 border-2 border-success rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-14 w-14 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-success font-medium tracking-tight text-2xl">
                  Verification Complete
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Your attendance has been recorded for this session.
                </p>
              </div>
              <Button
                onClick={() => navigate("/student/dashboard")}
                className="w-full h-12 bg-success hover:bg-emerald-600 text-black font-medium text-base"
              >
                Return to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="mx-auto h-28 w-28 bg-destructive/10 border-2 border-destructive rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="h-14 w-14 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-destructive font-medium tracking-tight text-2xl">
                  Verification Failed
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base font-medium">
                  {errorMessage}
                </p>
                {geofenceDebug && (
                  <div className="mt-3 rounded-xl border border-border/70 bg-background/70 p-3 text-left space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                      Geofence Telemetry
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
                        <p>
                          Accuracy: ±{geofenceDebug.reportedAccuracyMeters}m
                        </p>
                      )}
                      {geofenceDebug.maxAcceptableAccuracyMeters !==
                        undefined && (
                        <p>
                          Max Allowed: ±
                          {geofenceDebug.maxAcceptableAccuracyMeters}m
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <Button
                onClick={handleRetry}
                disabled={verifyMutation.isPending}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-base"
              >
                {verifyMutation.isPending
                  ? "Re-verifying..."
                  : "Retry Verification"}
              </Button>
              <Button
                onClick={() => navigate("/student/scan")}
                variant="outline"
                className="w-full h-12 border-border text-muted-foreground font-medium text-base transition-all hover:bg-muted"
              >
                Manual QR Scan
              </Button>
              <Button
                onClick={() => navigate("/student/dashboard")}
                variant="ghost"
                className="w-full h-11 text-muted-foreground hover:text-foreground text-base flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Go Back
              </Button>
            </div>
          )}
        </CardContent>

        <div className="bg-muted/35 p-3 sm:p-4 border-t border-border/60 text-center">
          <p className="text-[9px] text-muted-foreground/70 font-mono uppercase tracking-[0.32em]">
            Shielded by Aura-Integrity v4.0
          </p>
        </div>
      </Card>
    </div>
  );
}
