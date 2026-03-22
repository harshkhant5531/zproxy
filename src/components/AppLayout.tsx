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
    faculty: "Faculty Management",
    students: "Student Registry",
    courses: "Course Management",
    reports: "Reports",
    alerts: "Attendance Alerts",
    new: "New Session",
    profile: "Profile",
    grades: "Grades",
    notifications: "Notifications",
    "proxy-audit": "Proxy audit",
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
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-5" />
            <h1 className="text-sm font-medium text-foreground">{pageTitle}</h1>
            <div className="ml-auto">
              <ModeToggle />
            </div>
          </header>
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-screen-xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
