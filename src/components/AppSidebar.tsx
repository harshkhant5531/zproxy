import {
  GraduationCap,
  ScanLine,
  FileText,
  Ticket,
  LayoutDashboard,
  Plus,
  ClipboardList,
  BarChart3,
  Users,
  BookOpen,
  Calendar,
  FileBarChart,
  AlertTriangle,
  Settings,
  LogOut,
  Shield,
  UserCircle2,
} from "lucide-react";
import { Role } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import React from "react";
import { Link } from "react-router-dom";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ElementType;
};

type MenuSection = {
  label: string;
  items: MenuItem[];
};

const studentSections: MenuSection[] = [
  {
    label: "Academic",
    items: [
      { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
      { title: "Timetable", url: "/student/timetable", icon: Calendar },
      { title: "Attendance Scan", url: "/student/scan", icon: ScanLine },
      { title: "Leave Requests", url: "/student/leaves", icon: FileText },
      { title: "Exam Permit", url: "/student/permit", icon: Ticket },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Profile", url: "/profile", icon: UserCircle2 }],
  },
];

const facultySections: MenuSection[] = [
  {
    label: "Academic",
    items: [
      { title: "Dashboard", url: "/faculty/dashboard", icon: LayoutDashboard },
      { title: "Create Session", url: "/faculty/session/new", icon: Plus },
      {
        title: "Attendance Records",
        url: "/faculty/records",
        icon: ClipboardList,
      },
      { title: "Timetable", url: "/faculty/timetable", icon: Calendar },
      { title: "Analytics", url: "/faculty/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Profile", url: "/profile", icon: UserCircle2 }],
  },
];

const adminSections: MenuSection[] = [
  {
    label: "Administration",
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Faculty", url: "/admin/faculty", icon: Shield },
      { title: "Students", url: "/admin/students", icon: Users },
      { title: "Courses", url: "/admin/courses", icon: BookOpen },
      { title: "Timetable", url: "/admin/timetable", icon: Calendar },
      { title: "Leave Approvals", url: "/admin/leaves", icon: FileText },
      { title: "Reports", url: "/admin/reports", icon: FileBarChart },
      { title: "Alerts", url: "/admin/alerts", icon: AlertTriangle },
    ],
  },
  {
    label: "Account",
    items: [{ title: "Profile", url: "/profile", icon: UserCircle2 }],
  },
];

const roleConfig: Record<
  Role,
  { label: string; sections: MenuSection[]; icon: React.ElementType }
> = {
  student: { label: "Student", sections: studentSections, icon: GraduationCap },
  faculty: { label: "Faculty", sections: facultySections, icon: BookOpen },
  admin: { label: "Admin / HOD", sections: adminSections, icon: Settings },
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const role = user?.role || "student";
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const config = roleConfig[role];

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 glass-panel shadow-2xl"
    >
      <SidebarHeader className="p-4 pb-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 motion-float-delayed motion-press">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground leading-none">
                <span className="text-primary">Aura</span> Integrity
              </h1>
              <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                Attendance Platform
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-3 h-9 w-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-semibold text-sm">
            A
          </div>
        )}
        {!collapsed && (
          <div className="px-3 py-2 rounded-lg bg-primary/8 border border-primary/15 mb-1 motion-surface">
            <p className="text-xs font-semibold text-primary tracking-wide flex items-center gap-1.5">
              <config.icon className="h-3 w-3" /> {config.label} Portal
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className="mx-3" />

      <SidebarContent>
        {config.sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-muted-foreground/60 px-3">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end
                          className="group/sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/85 hover:text-foreground hover:bg-accent/65 transition-all duration-200 text-sm font-medium motion-press"
                          activeClassName="bg-primary/12 text-primary hover:bg-primary/15 font-semibold border border-primary/25 shadow-[0_8px_22px_-18px_hsl(var(--primary)/0.6)]"
                        >
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/15 flex-shrink-0 motion-icon-hover group-hover/sidebar-link:bg-primary/15">
                            <item.icon className="h-4 w-4" />
                          </span>
                          {!collapsed && (
                            <span className="truncate group-hover/sidebar-link:translate-x-[1px] transition-transform duration-200">
                              {item.title}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-border/30">
        {!collapsed && user ? (
          <div className="rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border/50 p-3 motion-surface">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-[11px] font-semibold text-primary border border-primary/20 flex-shrink-0">
                {(user.profile?.fullName || user.username)
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">
                  {user.profile?.fullName || user.username}
                </p>
                <p className="text-[10px] text-muted-foreground/70 truncate font-mono">
                  {user.profile?.department ||
                    (role === "admin" ? "Administration" : "Unassigned")}
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                title="Profile"
              >
                <Link to="/profile">
                  <UserCircle2 className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0"
                onClick={() => logout()}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ) : collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mx-auto text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
