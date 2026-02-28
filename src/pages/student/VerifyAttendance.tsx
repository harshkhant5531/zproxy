import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceAPI } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyAttendance() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
    const [errorMessage, setErrorMessage] = useState("");

    const token = searchParams.get("token");

    const verifyMutation = useMutation({
        mutationFn: (token: string) => attendanceAPI.markAttendanceQR(token, "Mobile Direct (Geofenced)", `AuraBrowser-${user?.id}`),
        onSuccess: () => {
            setStatus("success");
            toast.success("Attendance verified successfully");
            queryClient.invalidateQueries({ queryKey: ["student", "recent-attendance"] });
        },
        onError: (err: any) => {
            setStatus("error");
            setErrorMessage(err.response?.data?.message || "Verification failed. The link may be expired.");
            toast.error("Verification failed");
        }
    });

    useEffect(() => {
        if (!authLoading && user && token && status === "verifying") {
            verifyMutation.mutate(token);
        }
    }, [user, token, authLoading]);

    // Handle case where user isn't logged in
    useEffect(() => {
        if (!authLoading && !user) {
            toast.info("Please log in to verify your attendance");
            const redirectPath = encodeURIComponent(window.location.pathname + window.location.search);
            navigate(`/login?redirect=${redirectPath}`, { replace: true });
        }
    }, [user, authLoading, token, navigate]);

    if (authLoading || (user && status === "verifying")) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative h-20 w-20">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <Shield className="absolute inset-0 m-auto h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black italic uppercase tracking-tighter">Initializing Integrity Check</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.3em]">Authenticating neural link & spatial vector...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-slate-900/60 border-slate-800 backdrop-blur-md shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-black italic uppercase tracking-tighter text-white">
                        Session Authentication
                    </CardTitle>
                    <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase mt-1">
                        Secure Attendance Gateway
                    </p>
                </CardHeader>

                <CardContent className="p-8 space-y-8 text-center">
                    {status === "success" ? (
                        <div className="space-y-6 animate-in zoom-in-95 duration-500">
                            <div className="mx-auto h-24 w-24 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-emerald-500 font-black uppercase tracking-tight text-xl">Verification Absolute</h2>
                                <p className="text-slate-400 text-sm">Your attendance has been recorded in the session ledger.</p>
                            </div>
                            <Button
                                onClick={() => navigate("/student/dashboard")}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-widest"
                            >
                                Return to Dashboard
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <div className="mx-auto h-24 w-24 bg-red-500/10 border-2 border-red-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                <AlertTriangle className="h-12 w-12 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-red-500 font-black uppercase tracking-tight text-xl">Authentication Failure</h2>
                                <p className="text-slate-400 text-sm font-medium">{errorMessage}</p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <Button
                                    onClick={() => navigate("/student/scan")}
                                    variant="outline"
                                    className="w-full border-slate-800 text-slate-300 font-bold uppercase"
                                >
                                    Try Manual Scan
                                </Button>
                                <Button
                                    onClick={() => navigate("/student/dashboard")}
                                    variant="ghost"
                                    className="w-full text-slate-500 hover:text-white flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Go Back
                                </Button>
                            </div>
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
