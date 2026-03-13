import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Login from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import StudentDashboard from "./pages/student/Dashboard";
import StudentTimetable from "./pages/student/Timetable";
import Leaves from "./pages/student/Leaves";
import ExamPermit from "./pages/student/ExamPermit";
import ProfilePage from "./pages/Profile";

import FacultyDashboard from "./pages/faculty/Dashboard";
import CreateSession from "./pages/faculty/CreateSession";
import LiveSession from "./pages/faculty/LiveSession";
import Records from "./pages/faculty/Records";
import Analytics from "./pages/faculty/Analytics";
import ProxyAuditPage from "./pages/shared/ProxyAuditPage";
import FacultyTimetable from "./pages/faculty/Timetable";
import FacultyLeaves from "./pages/faculty/Leaves";
import AdminLeaves from "./pages/admin/Leaves";

import AdminDashboard from "./pages/admin/Dashboard";
import StudentManagement from "./pages/admin/Students";
import CourseManagement from "./pages/admin/Courses";
import FacultyManagement from "./pages/admin/FacultyManagement";
import Timetable from "./pages/admin/Timetable";
import Reports from "./pages/admin/Reports";
import ShortageAlerts from "./pages/admin/Alerts";
import GeofenceSecurity from "./pages/admin/GeofenceSecurity";

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground motion-page-enter">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-14 w-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-primary/25 motion-orbit" />
            <div className="absolute inset-[8px] rounded-full border border-primary/30 border-dashed motion-orbit-slow" />
            <div className="h-4 w-4 rounded-full bg-primary motion-float" />
          </div>
          <p className="text-sm font-medium">Initializing Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />
        }
      />
      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/timetable" element={<StudentTimetable />} />
            <Route path="/student/leaves" element={<Leaves />} />
            <Route path="/student/permit" element={<ExamPermit />} />
          </Route>

          {/* Faculty Routes */}
          <Route element={<ProtectedRoute allowedRoles={["faculty"]} />}>
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
            <Route path="/faculty/session/new" element={<CreateSession />} />
            <Route path="/faculty/session/:id" element={<LiveSession />} />
            <Route path="/faculty/records" element={<Records />} />
            <Route path="/faculty/analytics" element={<Analytics />} />
            <Route path="/faculty/proxy-audit" element={<ProxyAuditPage />} />
            <Route path="/faculty/timetable" element={<FacultyTimetable />} />
            <Route path="/faculty/leaves" element={<FacultyLeaves />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/faculty" element={<FacultyManagement />} />
            <Route path="/admin/students" element={<StudentManagement />} />
            <Route path="/admin/courses" element={<CourseManagement />} />
            <Route path="/admin/timetable" element={<Timetable />} />
            <Route path="/admin/leaves" element={<AdminLeaves />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/alerts" element={<ShortageAlerts />} />
            <Route path="/admin/proxy-audit" element={<ProxyAuditPage />} />
            <Route
              path="/admin/geofence-security"
              element={<GeofenceSecurity />}
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="aura-theme"
    >
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
