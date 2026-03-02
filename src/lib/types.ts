export type Role = "admin" | "faculty" | "student";

export type AttendanceStatus = "present" | "late" | "absent";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface User {
    id: number;
    username: string;
    email: string;
    role: Role;
    avatar?: string;
    profile?: {
        fullName: string;
        department?: string;
        enrollmentNumber?: string;
        studentId?: string;
        semester?: number;
        parentPhone?: string;
        parentEmail?: string;
    };
}
