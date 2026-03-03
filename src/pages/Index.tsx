import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Github, Mail, Lock, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectParams = searchParams.get("redirect");
  const from = redirectParams || location.state?.from || (user ? `/${user.role}/dashboard` : null);

  // If already logged in and not in the middle of a submission, redirect away
  if (user && !isSubmitting) {
    navigate(from || `/${user.role}/dashboard`, { replace: true });
    return null;
  }

  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const checkApi = async () => {
      try {
        console.log("Checking API health...");
        // Use a simple endpoint like /auth/me or a root health check if available
        // For now, we'll try to reach the API base URL
        await fetch(import.meta.env.VITE_API_URL || `${window.location.origin.replace(":8080", ":3001")}/api/auth/me`);
        setApiStatus("online");
        console.log("API status: ONLINE");
      } catch (err) {
        setApiStatus("offline");
        console.error("API status: OFFLINE", err);
      }
    };
    checkApi();
  }, []);

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
      toast.error(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-[#020817]">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />

      {/* Left Section - Hero */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-12 z-10">
        <div className="max-w-lg">
          <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-left duration-700">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tighter text-white">AURA INTEGRITY</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6 animate-in fade-in slide-in-from-left duration-700 delay-100">
            The Next-Gen <span className="text-primary italic">Attendance</span> Engine.
          </h1>
          <p className="text-lg text-slate-400 mb-8 animate-in fade-in slide-in-from-left duration-700 delay-200">
            Secure, transparent, and seamless. Monitor academic integrity with real-time analytics and decentralized proof of presence.
          </p>
          <div className="flex gap-4 animate-in fade-in slide-in-from-left duration-700 delay-300">
            <p className="text-sm text-slate-400 self-center italic">
              Empowering academic excellence through transparency.
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 z-10">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800/50 backdrop-blur-xl animate-in zoom-in duration-500">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4 lg:hidden">
              <ShieldCheck className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">Secure Sign In</CardTitle>
            <div className="flex justify-center items-center gap-2 mt-2">
              <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${apiStatus === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" :
                apiStatus === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" : "bg-slate-500"
                }`} />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                Backend {apiStatus}
              </span>
            </div>
            <CardDescription className="text-center text-slate-400 mt-2">
              Enter your institutional credentials to continue
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@nit.edu"
                    className="pl-10 bg-slate-950/50 border-slate-800 text-white focus:ring-primary"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" title="password" className="text-slate-300">Password</Label>
                  <Button variant="link" className="px-0 font-normal text-xs text-primary/70 hover:text-primary">
                    Forgot passphrase?
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10 bg-slate-950/50 border-slate-800 text-white focus:ring-primary"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-11" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating...</>
                ) : (
                  <><ShieldCheck className="mr-2 h-4 w-4" /> Initialize Engine</>
                )}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#020817] px-2 text-slate-500 italic">Integrity Protocol Verified</span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500">
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
