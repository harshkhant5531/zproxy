import { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Link2,
  MailCheck,
  Sparkles,
} from "lucide-react";

type ForgotPasswordResponse = {
  data?: {
    resetUrl?: string;
    expiresIn?: string;
  };
};

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [expiresIn, setExpiresIn] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await authAPI.forgotPassword(email);
      const payload = response.data as ForgotPasswordResponse;
      setResetUrl(payload.data?.resetUrl || "");
      setExpiresIn(payload.data?.expiresIn || "");
      toast.success("Reset flow is ready.");
    } catch (error: unknown) {
      toast.error("Unable to generate reset link right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyResetUrl = async () => {
    if (!resetUrl) return;
    await navigator.clipboard.writeText(resetUrl);
    toast.success("Reset link copied");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(hsl(var(--primary)/0.12)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary)/0.12)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="absolute top-[-10%] left-[-5%] h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[24rem] w-[24rem] rounded-full bg-sky-300/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.9fr]">
          <div className="hidden rounded-[2rem] border border-border/50 bg-white/60 p-10 shadow-2xl lg:block">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Account Recovery
            </div>
            <h1 className="max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950">
              Reset access without breaking the rest of your workflow.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Generate a secure reset link, hand it off, and get the account
              back into a healthy state quickly. The experience is optimized for
              the institutional light theme first.
            </p>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                ["Secure token", "Short-lived signed reset link"],
                ["Zero clutter", "One-screen recovery workflow"],
                ["Institution ready", "Works with existing account model"],
                ["Fast recovery", "Copy and open reset link instantly"],
              ].map(([title, subtitle]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm"
                >
                  <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-900">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <Card
            variant="elevated"
            className="border border-border/60 bg-card/85 shadow-2xl"
          >
            <CardHeader className="space-y-3 pb-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
              <CardTitle className="flex items-center gap-3 text-3xl font-black tracking-[-0.03em]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <KeyRound className="h-5 w-5" />
                </div>
                Forgot Password
              </CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                Enter the institutional email address. A reset link will be
                generated for the account if it exists.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                    Institutional Email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="student@darshan.ac.in"
                    className="h-12 rounded-2xl border-border/70 bg-background/80"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-2xl text-sm font-black uppercase tracking-[0.18em] shadow-lg shadow-primary/20"
                >
                  <MailCheck className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Generating..." : "Generate Reset Link"}
                </Button>
              </form>

              {resetUrl && (
                <div className="mt-6 space-y-4 rounded-3xl border border-success/25 bg-success/10 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-600">
                        Reset Link Ready
                      </p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {expiresIn
                          ? `Valid for ${expiresIn}.`
                          : "Use this link to reset the password."}
                      </p>
                    </div>
                    <Link2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="rounded-2xl border border-success/20 bg-white/80 p-4 text-xs leading-6 text-slate-700 shadow-sm dark:bg-background/70 dark:text-slate-200 break-all">
                    {resetUrl}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={copyResetUrl}
                      className="flex-1 rounded-2xl font-black uppercase tracking-[0.14em]"
                    >
                      <Copy className="mr-2 h-4 w-4" /> Copy Link
                    </Button>
                    <Button
                      type="button"
                      asChild
                      variant="outline"
                      className="flex-1 rounded-2xl font-black uppercase tracking-[0.14em]"
                    >
                      <a href={resetUrl}>Open Link</a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
