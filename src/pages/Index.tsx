import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  Zap,
  BarChart3,
  Shield,
  Chrome,
} from "lucide-react";
import { toast } from "sonner";
import { FullScreenLoader } from "@/components/FullScreenLoader";

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
        // Use a simple endpoint like /auth/me or a root health check if available
        // For now, we'll try to reach the API base URL
        await fetch(
          import.meta.env.VITE_API_URL ||
            `${window.location.origin.replace(":8080", ":3001")}/api/auth/me`,
        );
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
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "signin_with",
          width: 360,
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

  if (loading) return null;

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
      <FullScreenLoader
        show={isSubmitting}
        operation="authenticating"
        position="absolute"
      />

      <div className="flex min-h-screen relative overflow-hidden bg-background text-foreground">
        {/* Background grid + orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-[40%] left-[30%] w-[25%] h-[25%] bg-primary/5 rounded-full blur-[100px]" />
        </div>

        {/* Left Section - Hero */}
        <div className="hidden lg:flex flex-1 flex-col justify-center px-16 z-10 relative">
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-10 animate-in fade-in slide-in-from-left-4 duration-700">
              <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 animate-aura-pulse">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <span className="text-xl font-black tracking-tighter text-foreground uppercase">
                Aura Integrity
              </span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground mb-6 leading-[1.1] animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              Attendance Management
              <br />
              Platform
            </h1>
            <p className="text-base text-muted-foreground mb-10 leading-relaxed animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
              Secure, transparent, and seamless attendance management. Monitor
              academic integrity with real-time analytics and verified proof of
              presence.
            </p>
            <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              {[
                { label: "Real-time", sub: "Live tracking", icon: Zap },
                { label: "Secure", sub: "End-to-end", icon: Shield },
                { label: "Analytics", sub: "Deep insights", icon: BarChart3 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 group hover:border-primary/30 hover:bg-card/60 transition-all duration-200"
                >
                  <item.icon className="h-4 w-4 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">
                    {item.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.sub}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 z-10 relative">
          <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex justify-center mb-2 lg:hidden">
                <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 animate-aura-pulse">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-center tracking-tighter uppercase">
                Sign In
              </CardTitle>
              <div className="flex justify-center items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full transition-colors ${
                    apiStatus === "online"
                      ? "bg-success shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-live-blink"
                      : apiStatus === "offline"
                        ? "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        : "bg-muted-foreground/40 animate-pulse"
                  }`}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    apiStatus === "online"
                      ? "text-success"
                      : apiStatus === "offline"
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  Backend {apiStatus}
                </span>
              </div>
              <CardDescription className="text-center text-muted-foreground text-[11px] uppercase tracking-wider">
                Enter your institutional credentials to continue
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="email"
                    className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
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
                      className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground"
                    >
                      Password
                    </Label>
                    <Link
                      to="/forgot-password"
                      className="text-[10px] font-black uppercase tracking-[0.12em] text-primary hover:text-primary/80 transition-colors"
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
                  className="w-full font-black h-12 rounded-xl uppercase tracking-[0.15em] text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:shadow-xl transition-all"
                  disabled={isSubmitting}
                >
                  <ArrowRight className="mr-2 h-4 w-4" /> Sign In
                </Button>
                <div className="w-full flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  <div className="h-px flex-1 bg-border" />
                  Or continue with
                  <div className="h-px flex-1 bg-border" />
                </div>
                {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
                  <div
                    id="google-signin-button"
                    className="w-full min-h-[42px] flex items-center justify-center"
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
                <p className="text-center text-xs text-muted-foreground/60">
                  Unauthorized access is strictly prohibited and logged.
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
