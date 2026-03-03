import {
  GraduationCap, ScanLine, Calculator, FileText, Ticket,
  LayoutDashboard, Plus, ClipboardList, BarChart3, ArrowLeftRight,
  Users, BookOpen, Calendar, FileBarChart, AlertTriangle, Settings, LogOut,
  Shield
} from "lucide-react";
import { Role } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import React from "react";

const studentMenu = [
  { title: "Performance Hub", url: "/student/dashboard", icon: LayoutDashboard },
  { title: "Academic Schedule", url: "/student/timetable", icon: Calendar },
  { title: "Biometric Verification", url: "/student/verify-attendance", icon: ScanLine },
  { title: "Leave Management", url: "/student/leaves", icon: FileText },
  { title: "Exam Permit", url: "/student/permit", icon: Ticket },
];

const facultyMenu = [
  { title: "Executive Dashboard", url: "/faculty/dashboard", icon: LayoutDashboard },
  { title: "Active Session", url: "/faculty/session/new", icon: Plus },
  { title: "Biometric Registry", url: "/faculty/records", icon: ClipboardList },
  { title: "Lecture Schedule", url: "/faculty/timetable", icon: Calendar },
  { title: "Institutional Analytics", url: "/faculty/analytics", icon: BarChart3 },
];

const adminMenu = [
  { title: "Command Center", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Faculty Registry", url: "/admin/faculty", icon: Shield },
  { title: "Student Database", url: "/admin/students", icon: Users },
  { title: "Curriculum Matrix", url: "/admin/courses", icon: BookOpen },
  { title: "Institutional Timetable", url: "/admin/timetable", icon: Calendar },
  { title: "Audit Reports", url: "/admin/reports", icon: FileBarChart },
  { title: "Risk Compliance", url: "/admin/alerts", icon: AlertTriangle },
];

const roleConfig: Record<Role, { label: string; menu: typeof studentMenu; icon: React.ElementType }> = {
  student: { label: "Student", menu: studentMenu, icon: GraduationCap },
  faculty: { label: "Faculty", menu: facultyMenu, icon: BookOpen },
  admin: { label: "Admin / HOD", menu: adminMenu, icon: Settings },
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const role = user?.role || "student";
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const config = roleConfig[role];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        {!collapsed && (
          <div className="mb-3">
            <h1 className="text-lg font-bold tracking-tighter uppercase italic">
              <span className="text-primary aura-text-glow">Aura</span>
              <span className="text-white ml-1">Integrity</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-slate-500 font-mono">Engine v1.0 // S6</p>
          </div>
        )}
        {collapsed && <div className="mb-2 h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">A</div>}
        {!collapsed && (
          <div className="px-2 py-1.5 rounded-md bg-primary/5 border border-primary/10 mb-2">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> {config.label} Access
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {config.label} Module
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {config.menu.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-accent/50 text-muted-foreground" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <div className="rounded-lg bg-secondary/30 border border-border/30 p-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/30">
                {(user.profile?.fullName || user.username).split(" ").map((n: string) => n[0]).join("").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate text-slate-200">
                  {user.profile?.fullName || user.username}
                </p>
                <p className="text-[9px] text-muted-foreground truncate uppercase tracking-tighter">
                  {user.profile?.department || (role === "admin" ? "Institutional Oversight" : "Unassigned Sector")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                onClick={() => logout()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
