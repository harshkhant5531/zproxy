/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const normalizeApiUrl = (value?: string) => {
  if (!value) {
    return "";
  }

  let url = value.trim();
  if (!url) {
    return "";
  }

  if (!url.endsWith("/api") && !url.includes("/api/")) {
    url = url.replace(/\/$/, "") + "/api";
  }

  return url;
};

export const getApiBaseUrl = () => {
  const configuredUrl =
    normalizeApiUrl(import.meta.env.VITE_API_URL as string) ||
    normalizeApiUrl(import.meta.env.VITE_PUBLIC_API_URL as string);

  if (configuredUrl) {
    return configuredUrl;
  }

  // Production/Vercel fallback only works if the backend is deployed behind the same origin.
  if (window.location.hostname.includes("vercel.app")) {
    return `${window.location.origin}/api`;
  }

  // Otherwise, use the current host but with the backend port.
  return `${window.location.protocol}//${window.location.hostname}:3001/api`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_HEALTH_URL = `${API_BASE_URL.replace(/\/$/, "")}/health`;

// Create API instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const hadAuthHeader = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && hadAuthHeader) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

// Authentication API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  loginWithGoogle: (idToken: string) => api.post("/auth/google", { idToken }),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, newPassword }),

  register: (username: string, email: string, password: string, role: string) =>
    api.post("/auth/register", { username, email, password, role }),

  getProfile: () => api.get("/auth/me"),

  updateProfile: (data: any) => api.put("/auth/me", data),

  updatePassword: (currentPassword: string, newPassword: string) =>
    api.put("/auth/me/password", { currentPassword, newPassword }),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) => api.get("/users", { params }),

  getFaculty: () => api.get("/users/faculty"),

  getUser: (id: string | number) => api.get(`/users/${id}`),

  createUser: (data: any) => api.post("/users", data),

  createFaculty: (data: any) => api.post("/users/faculty", data),

  createStudent: (data: any) => api.post("/users/students", data),

  updateUser: (id: string | number, data: any) => api.put(`/users/${id}`, data),

  updateStudentProfile: (id: string | number, data: any) =>
    api.put(`/users/${id}/profile`, data),

  updateStudentEnrollment: (
    id: string | number,
    courseIds: number[],
    subjectIds: number[],
  ) => api.put(`/users/students/${id}/enrollment`, { courseIds, subjectIds }),

  deleteUser: (id: string | number) => api.delete(`/users/${id}`),
};

// Courses API
export const coursesAPI = {
  getCourses: (params?: any) => api.get("/courses", { params }),

  getCourse: (id: string | number) => api.get(`/courses/${id}`),

  createCourse: (data: any) => api.post("/courses", data),

  updateCourse: (id: string | number, data: any) =>
    api.put(`/courses/${id}`, data),

  deleteCourse: (id: string | number) => api.delete(`/courses/${id}`),

  createSubject: (courseId: string | number, data: any) =>
    api.post(`/courses/${courseId}/subjects`, data),

  deleteSubject: (id: string | number) => api.delete(`/subjects/${id}`),
};

// Subjects API
export const subjectsAPI = {
  getSubjects: (params?: any) => api.get("/subjects", { params }),

  getSubject: (id: string | number) => api.get(`/subjects/${id}`),
};

// Sessions API
export const sessionsAPI = {
  getSessions: (params?: any) => api.get("/sessions", { params }),

  getSession: (id: string | number) => api.get(`/sessions/${id}`),

  createSession: (data: any) => api.post("/sessions", data),

  updateSession: (id: string | number, data: any) =>
    api.put(`/sessions/${id}`, data),

  deleteSession: (id: string | number) => api.delete(`/sessions/${id}`),

  getSessionAttendance: (id: string | number) =>
    api.get(`/sessions/${id}/attendance`),

  finalizeSession: (id: string | number) =>
    api.post(`/sessions/${id}/finalize`),
};

// Attendance API
export const attendanceAPI = {
  getAttendance: (params?: any) => api.get("/attendance", { params }),

  getProxyAudit: (params?: any) =>
    api.get("/attendance/proxy-audit", { params }),

  getAttendanceBySession: (sessionId: string | number) =>
    api.get(`/attendance/session/${sessionId}`),

  getAttendanceByStudent: (studentId: string | number) =>
    api.get(`/attendance/student/${studentId}`),

  markAttendance: (data: any) => api.post("/attendance", data),

  updateAttendance: (id: string | number, data: any) =>
    api.put(`/attendance/${id}`, data),

  deleteAttendance: (id: string | number) => api.delete(`/attendance/${id}`),
};

// Exams API
export const examsAPI = {
  getExams: () => api.get("/exams"),

  getExam: (id: string) => api.get(`/exams/${id}`),

  createExam: (data: any) => api.post("/exams", data),

  updateExam: (id: string, data: any) => api.put(`/exams/${id}`, data),

  deleteExam: (id: string) => api.delete(`/exams/${id}`),
};

// Leaves API
export const leavesAPI = {
  getLeaves: (params?: any) => api.get("/leaves", { params }),

  getLeave: (id: string) => api.get(`/leaves/${id}`),

  createLeave: (data: any) => api.post("/leaves", data),

  updateLeave: (id: string, data: any) => api.put(`/leaves/${id}`, data),

  deleteLeave: (id: string) => api.delete(`/leaves/${id}`),
};

// Timetable API
export const timetableAPI = {
  getTimetable: (params?: any) => api.get("/timetable", { params }),

  getTimetableByCourse: (courseId: string) =>
    api.get(`/timetable/course/${courseId}`),

  getTimetableByFaculty: (facultyId: string) =>
    api.get(`/timetable/faculty/${facultyId}`),

  getTimetableByStudent: (studentId: string) =>
    api.get(`/timetable/student/${studentId}`),

  createTimetableEntry: (data: any) => api.post("/timetable", data),

  updateTimetableEntry: (id: string, data: any) =>
    api.put(`/timetable/${id}`, data),

  deleteTimetableEntry: (id: string) => api.delete(`/timetable/${id}`),
};

// Grades API
export const gradesAPI = {
  getGrades: () => api.get("/grades"),

  getGradesByCourse: (courseId: string) =>
    api.get(`/grades/course/${courseId}`),

  getGradesByStudent: (studentId: string) =>
    api.get(`/grades/student/${studentId}`),

  createGrade: (data: any) => api.post("/grades", data),

  updateGrade: (id: string, data: any) => api.put(`/grades/${id}`, data),

  deleteGrade: (id: string) => api.delete(`/grades/${id}`),
};

// Reports API
export const reportsAPI = {
  getReports: () => api.get("/reports"),

  getReport: (id: string | number) => api.get(`/reports/${id}`),

  generateReport: (data: any) => api.post("/reports/generate", data),

  attendance: (params?: any) => api.get("/reports/attendance", { params }),

  grades: (params?: any) => api.get("/reports/grades", { params }),

  leaves: (params?: any) => api.get("/reports/leaves", { params }),

  performance: (params?: any) => api.get("/reports/performance", { params }),

  getDepartmentReports: (params?: any) =>
    api.get("/reports/department", { params }),

  downloadReport: (id: string | number) =>
    api.get(`/reports/download/${id}`, { responseType: "blob" }),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: () => api.get("/notifications"),

  getNotification: (id: string) => api.get(`/notifications/${id}`),

  createNotification: (data: any) => api.post("/notifications", data),

  updateNotification: (id: string, data: any) =>
    api.put(`/notifications/${id}`, data),

  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),

  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
};

export const settingsAPI = {
  getGeofenceSecurity: () => api.get("/settings/geofence-security"),

  updateGeofenceSecurity: (data: any) =>
    api.put("/settings/geofence-security", data),

  getGeofenceSecurityHistory: (params?: any) =>
    api.get("/settings/geofence-security/history", { params }),
};

export default api;
