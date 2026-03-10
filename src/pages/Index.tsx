import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const { login, user, loading } = useAuth();
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
    <div className="flex min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Subtle background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      {/* Left Section - Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 z-10 relative">
        <div className="max-w-lg">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tighter text-foreground uppercase">
              Aura Integrity
            </span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]">
            Next-Generation
            <br />
            <span className="text-primary">Attendance</span> Engine
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Secure, transparent, and seamless attendance management. Monitor
            academic integrity with real-time analytics and verified proof of
            presence.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Real-time", sub: "Live tracking" },
              { label: "Secure", sub: "End-to-end" },
              { label: "Analytics", sub: "Deep insights" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4"
              >
                <p className="text-sm font-bold text-foreground">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 z-10 relative">
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl">
          <CardHeader className="space-y-3 pb-4">
            <div className="flex justify-center mb-2 lg:hidden">
              <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center tracking-tight">
              Sign In
            </CardTitle>
            <div className="flex justify-center items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full transition-colors ${
                  apiStatus === "online"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : apiStatus === "offline"
                      ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                      : "bg-muted-foreground/40 animate-pulse"
                }`}
              />
              <span
                className={`text-xs font-medium capitalize ${
                  apiStatus === "online"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : apiStatus === "offline"
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                Backend {apiStatus}
              </span>
            </div>
            <CardDescription className="text-center text-muted-foreground">
              Enter your institutional credentials to continue
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@institution.ac.in"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    variant="link"
                    className="px-0 font-normal text-xs text-muted-foreground hover:text-primary h-auto"
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10"
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
                className="w-full font-semibold h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    in...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" /> Sign In
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground/60">
                Unauthorized access is strictly prohibited and logged.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Index;
