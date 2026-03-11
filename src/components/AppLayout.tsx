import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { ModeToggle } from "@/components/ModeToggle";
import { Separator } from "@/components/ui/separator";

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
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/40 bg-background/90 backdrop-blur-md sticky top-0 z-20 px-4 gap-3">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <Separator orientation="vertical" className="h-5 bg-border/60" />
            <div className="flex-1 flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground tracking-tight">
                {pageTitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/8 border border-primary/15 motion-press">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-live-blink" />
                <span className="text-[10px] font-mono text-primary/80 uppercase tracking-widest">
                  Live
                </span>
              </div>
              <ModeToggle />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto relative isolate">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-16 right-[6%] h-48 w-48 rounded-full bg-primary/10 blur-3xl motion-float" />
              <div className="absolute top-[34%] -left-12 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl motion-float-delayed" />
              <div className="absolute -bottom-20 right-[28%] h-56 w-56 rounded-full bg-primary/8 blur-3xl motion-drift" />
            </div>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
