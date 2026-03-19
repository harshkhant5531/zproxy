import {
  GraduationCap,
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
  Network,
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
      { title: "Proxy Audit", url: "/faculty/proxy-audit", icon: Network },
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
      { title: "Proxy Audit", url: "/admin/proxy-audit", icon: Network },
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
      className="border-r border-sidebar-border/80 bg-sidebar"
    >
      <SidebarHeader className="p-3 pb-2">
        {!collapsed ? (
          <div className="mb-2 flex items-center gap-2 px-2 py-1">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary/12 border border-sidebar-primary/30 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground leading-none">
                Aura Royal
              </h1>
              <p className="text-[10px] text-sidebar-foreground/70 mt-0.5 uppercase tracking-[0.12em]">
                {config.label}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-2 h-8 w-8 rounded-md bg-sidebar-primary/15 border border-sidebar-primary/25 flex items-center justify-center text-sidebar-primary font-semibold text-xs">
            A
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator className="mx-3 bg-sidebar-border/80" />

      <SidebarContent>
        {config.sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.1em] text-sidebar-foreground/55 px-3">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2 pb-0.5">
              <SidebarMenu>
                {section.items.map((item, idx) => {
                  return (
                    <SidebarMenuItem
                      key={item.url}
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink
                          to={item.url}
                          end
                          className="group/sidebar-link flex items-center gap-2.5 px-3 py-2 rounded-md text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors duration-150 text-sm font-medium border border-transparent"
                          activeClassName="bg-sidebar-primary/12 text-sidebar-primary font-semibold border border-sidebar-primary/35 shadow-sm"
                        >
                          <span className="inline-flex items-center justify-center text-sidebar-foreground/65 group-hover/sidebar-link:text-sidebar-primary transition-colors duration-150 flex-shrink-0">
                            <item.icon className="h-[15px] w-[15px]" />
                          </span>
                          {!collapsed && (
                            <span className="truncate">{item.title}</span>
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

      <SidebarFooter className="p-2 border-t border-sidebar-border/80">
        {!collapsed && user ? (
          <div className="rounded-md bg-sidebar-accent/35 border border-sidebar-border/70 p-2.5">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-sidebar-primary/15 flex items-center justify-center text-[10px] font-semibold text-sidebar-primary border border-sidebar-primary/25 flex-shrink-0">
                {(user.profile?.fullName || user.username)
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-sidebar-foreground">
                  {user.profile?.fullName || user.username}
                </p>
                <p className="text-[10px] text-sidebar-foreground/70 truncate font-mono">
                  {user.profile?.department ||
                    (role === "admin" ? "Administration" : "Unassigned")}
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-sidebar-primary/10 transition-colors flex-shrink-0"
                title="Profile"
              >
                <Link to="/profile">
                  <UserCircle2 className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-sidebar-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors flex-shrink-0"
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
            className="h-9 w-9 mx-auto text-sidebar-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
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
