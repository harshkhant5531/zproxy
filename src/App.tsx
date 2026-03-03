import { lazy, Suspense } from "react";
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

// Lazy load pages
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const QRScanner = lazy(() => import("./pages/student/QRScanner"));
const VerifyAttendance = lazy(() => import("./pages/student/VerifyAttendance"));
const Leaves = lazy(() => import("./pages/student/Leaves"));
const ExamPermit = lazy(() => import("./pages/student/ExamPermit"));

const FacultyDashboard = lazy(() => import("./pages/faculty/Dashboard"));
const CreateSession = lazy(() => import("./pages/faculty/CreateSession"));
const LiveSession = lazy(() => import("./pages/faculty/LiveSession"));
const Records = lazy(() => import("./pages/faculty/Records"));
const Analytics = lazy(() => import("./pages/faculty/Analytics"));
const FacultyTimetable = lazy(() => import("./pages/faculty/Timetable"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const StudentManagement = lazy(() => import("./pages/admin/Students"));
const CourseManagement = lazy(() => import("./pages/admin/Courses"));
const FacultyManagement = lazy(() => import("./pages/admin/FacultyManagement"));
const Timetable = lazy(() => import("./pages/admin/Timetable"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const ShortageAlerts = lazy(() => import("./pages/admin/Alerts"));

const PageLoader = () => (
  <div className="flex h-[60vh] items-center justify-center bg-transparent">
    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
  </div>
);

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-sm font-medium">Initializing Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />} />
        <Route path="/student/verify" element={<VerifyAttendance />} />

        {/* Protected Routes Wrapper */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            {/* Student Routes */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/scan" element={<QRScanner />} />
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
              <Route path="/faculty/timetable" element={<FacultyTimetable />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/faculty" element={<FacultyManagement />} />
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/admin/courses" element={<CourseManagement />} />
              <Route path="/admin/timetable" element={<Timetable />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/alerts" element={<ShortageAlerts />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const queryClient = new QueryClient();

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="aura-theme">
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
