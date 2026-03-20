import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { API_HEALTH_URL } from "@/lib/api";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Radar,
  BarChart3,
  Shield,
  Chrome,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const { login, loginWithGoogle, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectParams = searchParams.get("redirect");
  const from =
    redirectParams ||
    location.state?.from ||
    (user ? `/${user.role}/dashboard` : null);

  // If already logged in and auth is resolved, redirect away
  useEffect(() => {
    if (!loading && user) {
      navigate(from || `/${user.role}/dashboard`, { replace: true });
    }
  }, [user, loading, from, navigate]);

  useEffect(() => {
    const checkApi = async () => {
      try {
        console.log("Checking API health...");
        const response = await fetch(API_HEALTH_URL, { method: "GET" });
        if (!response.ok) {
          throw new Error(`Health check failed with status ${response.status}`);
        }
        setApiStatus("online");
        console.log("API status: ONLINE");
      } catch (err) {
        setApiStatus("offline");
        console.error("API status: OFFLINE", err);
      }
    };
    checkApi();
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const scriptId = "google-identity-service";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp: { credential?: string }) => {
          if (!resp.credential) {
            toast.error("Google sign-in failed");
            return;
          }

          setIsSubmitting(true);
          try {
            await loginWithGoogle(resp.credential);
            toast.success("Google sign-in successful! Redirecting...");
          } catch (error: any) {
            toast.error(
              error.response?.data?.message ||
                "Google sign-in is unavailable for this account.",
            );
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      const container = document.getElementById("google-signin-button");
      if (container) {
        container.innerHTML = "";
        const width = Math.min(360, container.clientWidth || 360);
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width,
        });
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      document.head.appendChild(script);
    } else {
      initializeGoogle();
    }
  }, [loginWithGoogle]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Checking session...
          </span>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      toast.success("Login successful! Redirecting...");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="min-h-screen relative overflow-hidden bg-transparent text-foreground">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-28 h-80 w-80 rounded-full bg-warning/18 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-info/16 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col p-4 sm:p-6 lg:p-8">
          <header className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-tight">
                  Aura Grid
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em] border-primary/30 bg-primary/10 text-primary"
            >
              Secure Access
            </Badge>
          </header>

          <div className="mt-5 grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-3xl border border-border/70 bg-card/70 p-6 sm:p-8 lg:p-10 backdrop-blur">
              <div className="max-w-2xl">
                <Badge className="mb-4 rounded-full bg-primary/15 text-primary border border-primary/25">
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Attendance Portal
                </Badge>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                  Campus Attendance
                  <br />
                  Command Center
                </h1>
                <p className="mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                  One secure place to run attendance, sessions, reports, and
                  daily academic operations.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      label: "Realtime",
                      sub: "Sessions",
                      icon: Radar,
                    },
                    {
                      label: "Integrity",
                      sub: "Security",
                      icon: Shield,
                    },
                    {
                      label: "Insights",
                      sub: "Reports",
                      icon: BarChart3,
                    },
                  ].map((item) => (
                    <Card
                      key={item.label}
                      className="px-4 py-3"
                    >
                      <item.icon className="h-4 w-4 text-primary mb-2" />
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.sub}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            </section>

            <section className="flex items-center">
              <Card className="w-full rounded-3xl border-border/80 bg-card">
                <CardHeader className="space-y-3 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl tracking-tight">
                      Sign In
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          apiStatus === "online"
                            ? "bg-success animate-live-blink"
                            : apiStatus === "offline"
                              ? "bg-destructive"
                              : "bg-muted-foreground/40 animate-pulse"
                        }`}
                      />
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          apiStatus === "online"
                            ? "text-success"
                            : apiStatus === "offline"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        API {apiStatus}
                      </span>
                    </div>
                  </div>
                  <CardDescription className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                    Use institutional credentials
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                  <CardContent className="grid gap-4 pt-2">
                    {isSubmitting && (
                      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Authenticating...
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label
                        htmlFor="email"
                        className="text-xs uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="student@institution.ac.in"
                          className="pl-10 h-11 rounded-xl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="password"
                          className="text-xs uppercase tracking-[0.08em] text-muted-foreground"
                        >
                          Password
                        </Label>
                        <Link
                          to="/forgot-password"
                          className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          Forgot Password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          className="pl-10 h-11 rounded-xl"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex flex-col gap-4 pt-2">
                    <Button
                      type="submit"
                      className="w-full font-semibold h-11 rounded-xl text-sm shadow-sm hover:shadow-md transition-shadow"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                      )}
                      Enter Workspace
                    </Button>

                    <div className="w-full flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                      <div className="h-px flex-1 bg-border" />
                      Or
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                      <div
                        id="google-signin-button"
                        className="w-full min-h-[42px] flex items-center justify-center overflow-hidden"
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 rounded-xl"
                        disabled
                      >
                        <Chrome className="mr-2 h-4 w-4" /> Google Sign-In
                        Unavailable
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </Card>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
