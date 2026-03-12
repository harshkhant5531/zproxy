import { useEffect, useState } from "react";
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
  requestCurrentPosition,
} from "@/lib/location";

export default function VerifyAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  const verifyMutation = useMutation({
    mutationFn: (data: { token: string; lat: number; lng: number }) =>
      attendanceAPI.markAttendanceQR(
        data.token,
        data.lat,
        data.lng,
        `AuraSecure-${user?.id}`,
      ),
    onSuccess: () => {
      setStatus("success");
      toast.success("Attendance verified successfully");
      queryClient.invalidateQueries({
        queryKey: ["student", "recent-attendance"],
      });
    },
    onError: (err: any) => {
      setStatus("error");
      const detail =
        err.response?.data?.message || err.message || "Network Timeout";
      setErrorMessage(
        detail.includes("Spatial")
          ? detail
          : `${detail}. Please ensure your device is on the campus network.`,
      );
      console.error("Verification error details:", err);
      toast.error("Verification failed");
    },
  });

  const handleVerify = (retryWithLowAccuracy = false) => {
    if (!token) return;

    if (!isGeolocationAvailable()) {
      setStatus("error");
      setErrorMessage("Location is not supported by your browser.");
      return;
    }

    setStatus("verifying");
    setErrorMessage("");

    const geoOptions = {
      enableHighAccuracy: !retryWithLowAccuracy,
      timeout: 25000, // Increased to 25s for difficult environments
      maximumAge: 5000, // Only allow coordinates from the last 5s
    };

    getGeolocationPermissionState()
      .then((permissionState) => {
        if (permissionState === "denied") {
          throw new Error(
            "Location permission is blocked. Enable location access to verify attendance.",
          );
        }

        return requestCurrentPosition(geoOptions);
      })
      .then((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(
          `Presence confirmed at: ${latitude}, ${longitude} (±${accuracy}m)`,
        );

        verifyMutation.mutate({
          token,
          lat: latitude,
          lng: longitude,
        });
      })
      .catch((error: any) => {
        if (!retryWithLowAccuracy && error.code === 3) {
          // Timeout occurred with high accuracy, retry with standard accuracy
          console.warn(
            "High accuracy timeout, retrying with standard accuracy...",
          );
          handleVerify(true);
          return;
        }

        setStatus("error");
        setErrorMessage(getLocationErrorMessage(error));
      });
  };

  const handleRetry = () => {
    handleVerify();
  };

  useEffect(() => {
    if (!authLoading && user && token && status === "verifying") {
      handleVerify();
    }
  }, [user, token, authLoading]);

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
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white px-4">
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
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-5 sm:p-8">
      <Card className="w-full max-w-xl bg-slate-900/65 border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <CardHeader className="text-center pb-3 pt-7">
          <CardTitle className="text-3xl font-medium tracking-tight text-foreground">
            Session Authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Secure Attendance Gateway
          </p>
        </CardHeader>

        <CardContent className="p-10 space-y-8 text-center">
          {status === "success" ? (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="mx-auto h-28 w-28 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-emerald-500 font-medium tracking-tight text-2xl">
                  Verification Complete
                </h2>
                <p className="text-slate-300 text-base">
                  Your attendance has been recorded for this session.
                </p>
              </div>
              <Button
                onClick={() => navigate("/student/dashboard")}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-medium text-base"
              >
                Return to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="mx-auto h-28 w-28 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="h-14 w-14 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-red-500 font-medium tracking-tight text-2xl">
                  Verification Failed
                </h2>
                <p className="text-slate-300 text-base font-medium">
                  {errorMessage}
                </p>
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
                className="w-full h-12 border-slate-800 text-slate-300 font-medium text-base transition-all hover:bg-slate-800"
              >
                Manual QR Scan
              </Button>
              <Button
                onClick={() => navigate("/student/dashboard")}
                variant="ghost"
                className="w-full h-11 text-slate-400 hover:text-white text-base flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Go Back
              </Button>
            </div>
          )}
        </CardContent>

        <div className="bg-slate-950/80 p-4 border-t border-slate-800 text-center">
          <p className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.4em]">
            Shielded by Aura-Integrity v4.0
          </p>
        </div>
      </Card>
    </div>
  );
}
