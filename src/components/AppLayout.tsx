import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/ModeToggle";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Orbit, Command } from "lucide-react";

function getPageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1];
  const titles: Record<string, string> = {
    dashboard: "Dashboard",
    timetable: "Schedule",
    "verify-attendance": "Verify Attendance",
    leaves: "Leave Management",
    permit: "Exam Permit",
    session: "Session",
    records: "Records",
    analytics: "Analytics",
    faculty: "Faculty",
    students: "Students",
    courses: "Courses",
    reports: "Reports",
    alerts: "Alerts",
    "geofence-security": "Geofence Security",
    new: "New Session",
    profile: "Profile Center",
  };
  return (
    titles[last] ||
    last?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "Dashboard"
  );
}

export function AppLayout() {
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-transparent">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="h-14 sm:h-16 flex items-center border-b border-border/70 bg-background/80 backdrop-blur sticky top-0 z-20 px-3 sm:px-6 gap-2 sm:gap-4">
            <SidebarTrigger className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors" />
            <Separator orientation="vertical" className="h-6 bg-border/70" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 font-semibold">
                Operations Console
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
                  {pageTitle}
                </h1>
                <Badge
                  variant="outline"
                  className="hidden md:inline-flex rounded-full border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-[10px]"
                >
                  <Orbit className="h-3 w-3 mr-1" />
                  Adaptive UI
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-card border border-border/80 motion-press shadow-sm">
                <Command className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Cmd/Ctrl + B
                </span>
              </div>
              <ModeToggle />
            </div>
          </header>
          <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-7 overflow-auto overflow-x-hidden relative isolate">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-20 right-[4%] h-56 w-56 rounded-full bg-primary/14 blur-3xl motion-float" />
              <div className="absolute top-[28%] -left-14 h-52 w-52 rounded-full bg-warning/15 blur-3xl motion-float-delayed" />
              <div className="absolute -bottom-20 right-[26%] h-60 w-60 rounded-full bg-info/15 blur-3xl motion-float" />
            </div>
            <div className="app-main-shell rounded-2xl border border-border/60 bg-card/50 p-3 sm:p-4 lg:p-5 shadow-[0_20px_70px_-45px_rgba(17,24,39,0.45)]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
