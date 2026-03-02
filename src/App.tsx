import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import NotFound from "./pages/NotFound";
import Login from "./pages/Index";

// Student pages
import StudentDashboard from "./pages/student/Dashboard";
import QRScanner from "./pages/student/QRScanner";
import VerifyAttendance from "./pages/student/VerifyAttendance";
import Leaves from "./pages/student/Leaves";
import ExamPermit from "./pages/student/ExamPermit";

// Faculty pages
import FacultyDashboard from "./pages/faculty/Dashboard";
import CreateSession from "./pages/faculty/CreateSession";
import LiveSession from "./pages/faculty/LiveSession";
import Records from "./pages/faculty/Records";
import Analytics from "./pages/faculty/Analytics";
import FacultyTimetable from "./pages/faculty/Timetable";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import StudentManagement from "./pages/admin/Students";
import CourseManagement from "./pages/admin/Courses";
import FacultyManagement from "./pages/admin/FacultyManagement";
import Timetable from "./pages/admin/Timetable";
import Reports from "./pages/admin/Reports";
import ShortageAlerts from "./pages/admin/Alerts";

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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to={user ? `/${user.role}/dashboard` : "/login"} replace />} />
      <Route path="/student/verify" element={<VerifyAttendance />} />

      <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
        {/* Student */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/scan" element={<QRScanner />} />
        <Route path="/student/leaves" element={<Leaves />} />
        <Route path="/student/permit" element={<ExamPermit />} />
        {/* Faculty */}
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
        <Route path="/faculty/session/new" element={<CreateSession />} />
        <Route path="/faculty/session/:id" element={<LiveSession />} />
        <Route path="/faculty/records" element={<Records />} />
        <Route path="/faculty/analytics" element={<Analytics />} />
        <Route path="/faculty/timetable" element={<FacultyTimetable />} />
        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/faculty" element={<FacultyManagement />} />
        <Route path="/admin/students" element={<StudentManagement />} />
        <Route path="/admin/courses" element={<CourseManagement />} />
        <Route path="/admin/timetable" element={<Timetable />} />
        <Route path="/admin/reports" element={<Reports />} />
        <Route path="/admin/alerts" element={<ShortageAlerts />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
