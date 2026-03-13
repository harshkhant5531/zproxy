import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "@/lib/api";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      toast.error("Reset token is missing.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authAPI.resetPassword(token, newPassword);
      setIsDone(true);
      toast.success("Password updated successfully.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error: unknown) {
      toast.error(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "Reset link is invalid or expired."
          : "Reset link is invalid or expired.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.12),transparent_28%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <Card className="w-full max-w-xl border border-border/60 bg-card/85 shadow-2xl">
          <CardHeader className="space-y-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
                {isDone ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <LockKeyhole className="h-6 w-6" />
                )}
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-[-0.03em]">
                  {isDone ? "Password Updated" : "Set a New Password"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isDone
                    ? "Your account is ready. Redirecting you back to sign-in."
                    : "Use a strong password you will actually remember."}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!isDone ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-3xl border border-primary/15 bg-primary/8 p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                        Security Notice
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Choose a password with at least 6 characters. Longer is
                        better.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    New Password
                  </Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !token}
                  className="h-12 w-full rounded-2xl text-sm font-black uppercase tracking-[0.16em] shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
                {!token && (
                  <p className="text-sm text-destructive">
                    Reset token is missing from the URL.
                  </p>
                )}
              </form>
            ) : (
              <div className="rounded-3xl border border-success/25 bg-success/10 p-6">
                <p className="text-base font-semibold text-emerald-600">
                  Password reset completed successfully.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can now sign in using your new password.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
