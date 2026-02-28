-- Aura Integrity Engine Database Schema
-- MySQL 8.0+

-- =============================================
-- 1. ROLES & USERS
-- =============================================

-- User Roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role_id` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20),
  `department` VARCHAR(100),
  `semester` INT,
  `device_id` VARCHAR(100),
  `parent_phone` VARCHAR(20),
  `parent_email` VARCHAR(255),
  `designation` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. ACADEMIC STRUCTURE
-- =============================================

-- Departments
CREATE TABLE IF NOT EXISTS `departments` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `hod` VARCHAR(255),
  `total_students` INT DEFAULT 0,
  `avg_attendance` DECIMAL(5,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Courses
CREATE TABLE IF NOT EXISTS `courses` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `semester` INT NOT NULL,
  `credits` INT NOT NULL,
  `faculty_id` VARCHAR(50) NOT NULL,
  `total_sessions` INT DEFAULT 0,
  `completed_sessions` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`faculty_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Course Outcomes
CREATE TABLE IF NOT EXISTS `course_outcomes` (
  `id` VARCHAR(50) PRIMARY KEY,
  `course_id` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `bloom_level` VARCHAR(100),
  `attainment` DECIMAL(5,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. SESSIONS & ATTENDANCE
-- =============================================

-- Sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(50) PRIMARY KEY,
  `course_id` VARCHAR(50) NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `co_id` VARCHAR(50),
  `date` DATE NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `room` VARCHAR(100),
  `faculty_id` VARCHAR(50) NOT NULL,
  `status` ENUM('upcoming', 'completed', 'cancelled') DEFAULT 'upcoming',
  `present` INT DEFAULT 0,
  `total` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`co_id`) REFERENCES `course_outcomes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`faculty_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance Logs
CREATE TABLE IF NOT EXISTS `attendance_logs` (
  `id` VARCHAR(50) PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `session_id` VARCHAR(50) NOT NULL,
  `status` ENUM('present', 'late', 'absent') DEFAULT 'absent',
  `timestamp` DATETIME,
  `method` VARCHAR(50),
  `gps_valid` BOOLEAN DEFAULT FALSE,
  `ip_valid` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `unique_attendance` (`student_id`, `session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. LEAVE MANAGEMENT
-- =============================================

-- Leave Applications
CREATE TABLE IF NOT EXISTS `leaves` (
  `id` VARCHAR(50) PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `type` ENUM('Medical', 'On-Duty', 'Personal') NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  `document` VARCHAR(255),
  `approved_by` VARCHAR(50),
  `approved_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. EXAM MANAGEMENT
-- =============================================

-- Exam Permits
CREATE TABLE IF NOT EXISTS `exam_permits` (
  `id` VARCHAR(50) PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `exam_name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `semester` INT NOT NULL,
  `overall_eligible` BOOLEAN DEFAULT FALSE,
  `issued_at` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Exam Permit Courses
CREATE TABLE IF NOT EXISTS `exam_permit_courses` (
  `id` VARCHAR(50) PRIMARY KEY,
  `permit_id` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `attendance` DECIMAL(5,2) DEFAULT 0.00,
  `eligible` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`permit_id`) REFERENCES `exam_permits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `unique_permit_course` (`permit_id`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. TIMETABLE
-- =============================================

-- Timetable
CREATE TABLE IF NOT EXISTS `timetable` (
  `id` VARCHAR(50) PRIMARY KEY,
  `day` VARCHAR(50) NOT NULL,
  `time` VARCHAR(50) NOT NULL,
  `course_id` VARCHAR(50) NOT NULL,
  `room` VARCHAR(100),
  `faculty_id` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`faculty_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `unique_timetable_slot` (`day`, `time`, `course_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. ANALYTICS & REPORTS
-- =============================================

-- Course Analytics
CREATE TABLE IF NOT EXISTS `course_analytics` (
  `id` VARCHAR(50) PRIMARY KEY,
  `course_id` VARCHAR(50) NOT NULL,
  `semester` INT NOT NULL,
  `avg_attendance` DECIMAL(5,2) DEFAULT 0.00,
  `pass_rate` DECIMAL(5,2) DEFAULT 0.00,
  `co_attainment` JSON,
  `total_students` INT DEFAULT 0,
  `last_updated` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Student Analytics
CREATE TABLE IF NOT EXISTS `student_analytics` (
  `id` VARCHAR(50) PRIMARY KEY,
  `student_id` VARCHAR(50) NOT NULL,
  `department` VARCHAR(100),
  `semester` INT,
  `overall_attendance` DECIMAL(5,2) DEFAULT 0.00,
  `course_wise_attendance` JSON,
  `leave_count` INT DEFAULT 0,
  `late_count` INT DEFAULT 0,
  `last_updated` DATETIME,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INDEXES
-- =============================================

-- User indexes
CREATE INDEX `idx_users_role` ON `users`(`role_id`);
CREATE INDEX `idx_users_department` ON `users`(`department`);
CREATE INDEX `idx_users_semester` ON `users`(`semester`);

-- Course indexes
CREATE INDEX `idx_courses_department` ON `courses`(`department`);
CREATE INDEX `idx_courses_semester` ON `courses`(`semester`);
CREATE INDEX `idx_courses_faculty` ON `courses`(`faculty_id`);

-- Session indexes
CREATE INDEX `idx_sessions_course` ON `sessions`(`course_id`);
CREATE INDEX `idx_sessions_faculty` ON `sessions`(`faculty_id`);
CREATE INDEX `idx_sessions_date` ON `sessions`(`date`);
CREATE INDEX `idx_sessions_status` ON `sessions`(`status`);

-- Attendance indexes
CREATE INDEX `idx_attendance_student` ON `attendance_logs`(`student_id`);
CREATE INDEX `idx_attendance_session` ON `attendance_logs`(`session_id`);
CREATE INDEX `idx_attendance_status` ON `attendance_logs`(`status`);

-- Leave indexes
CREATE INDEX `idx_leaves_student` ON `leaves`(`student_id`);
CREATE INDEX `idx_leaves_status` ON `leaves`(`status`);
CREATE INDEX `idx_leaves_date` ON `leaves`(`start_date`, `end_date`);

-- Exam permit indexes
CREATE INDEX `idx_permits_student` ON `exam_permits`(`student_id`);
CREATE INDEX `idx_permits_eligible` ON `exam_permits`(`overall_eligible`);

-- Timetable indexes
CREATE INDEX `idx_timetable_day` ON `timetable`(`day`);
CREATE INDEX `idx_timetable_course` ON `timetable`(`course_id`);
CREATE INDEX `idx_timetable_faculty` ON `timetable`(`faculty_id`);

-- Analytics indexes
CREATE INDEX `idx_course_analytics_course` ON `course_analytics`(`course_id`);
CREATE INDEX `idx_course_analytics_semester` ON `course_analytics`(`semester`);
CREATE INDEX `idx_student_analytics_student` ON `student_analytics`(`student_id`);
CREATE INDEX `idx_student_analytics_semester` ON `student_analytics`(`semester`);

-- =============================================
-- INITIAL SEED DATA
-- =============================================

-- Insert Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
('ROLE_ADMIN', 'Admin', 'Administrator with full system access'),
('ROLE_FACULTY', 'Faculty', 'Faculty member with teaching and course management access'),
('ROLE_STUDENT', 'Student', 'Student with access to their academic records');

-- Insert Departments
INSERT INTO `departments` (`id`, `name`, `hod`, `total_students`, `avg_attendance`) VALUES
('CSE', 'Computer Science & Engineering', 'Dr. Rajesh Kumar', 240, 79.00),
('ECE', 'Electronics & Communication', 'Dr. Anil Prasad', 180, 74.00),
('ME', 'Mechanical Engineering', 'Dr. Kavitha Rajan', 150, 81.00);

-- Insert Faculty
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role_id`, `department`, `designation`) VALUES
('FAC001', 'Dr. Rajesh Kumar', 'rajesh.kumar@nit.edu', '$2a$10$...', 'ROLE_FACULTY', 'CSE', 'Professor'),
('FAC002', 'Dr. Sunita Desai', 'sunita.desai@nit.edu', '$2a$10$...', 'ROLE_FACULTY', 'CSE', 'Associate Professor'),
('FAC003', 'Dr. Anil Prasad', 'anil.prasad@nit.edu', '$2a$10$...', 'ROLE_FACULTY', 'ECE', 'Professor'),
('FAC004', 'Dr. Kavitha Rajan', 'kavitha.rajan@nit.edu', '$2a$10$...', 'ROLE_FACULTY', 'ME', 'Assistant Professor');

-- Insert Students
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role_id`, `department`, `semester`, `phone`, `device_id`, `parent_phone`, `parent_email`) VALUES
('STU001', 'Aarav Sharma', 'aarav.sharma@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'CSE', 5, '9876543210', 'DEV-A1B2C3', '9812345678', 'parent.sharma@gmail.com'),
('STU002', 'Priya Patel', 'priya.patel@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'CSE', 5, '9876543211', 'DEV-D4E5F6', '9812345679', 'parent.patel@gmail.com'),
('STU003', 'Rahul Verma', 'rahul.verma@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'CSE', 5, '9876543212', 'DEV-G7H8I9', '9812345680', 'parent.verma@gmail.com'),
('STU004', 'Sneha Reddy', 'sneha.reddy@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'ECE', 5, '9876543213', 'DEV-J1K2L3', '9812345681', 'parent.reddy@gmail.com'),
('STU005', 'Vikram Singh', 'vikram.singh@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'ECE', 5, '9876543214', 'DEV-M4N5O6', '9812345682', 'parent.singh@gmail.com'),
('STU006', 'Ananya Gupta', 'ananya.gupta@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'ME', 3, '9876543215', 'DEV-P7Q8R9', '9812345683', 'parent.gupta@gmail.com'),
('STU007', 'Karthik Nair', 'karthik.nair@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'CSE', 5, '9876543216', 'DEV-S1T2U3', '9812345684', 'parent.nair@gmail.com'),
('STU008', 'Divya Iyer', 'divya.iyer@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'CSE', 5, '9876543217', 'DEV-V4W5X6', '9812345685', 'parent.iyer@gmail.com'),
('STU009', 'Arjun Mehta', 'arjun.mehta@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'ECE', 3, '9876543218', 'DEV-Y7Z8A1', '9812345686', 'parent.mehta@gmail.com'),
('STU010', 'Meera Joshi', 'meera.joshi@nit.edu', '$2a$10$...', 'ROLE_STUDENT', 'ME', 3, '9876543219', 'DEV-B2C3D4', '9812345687', 'parent.joshi@gmail.com');

-- Insert Courses
INSERT INTO `courses` (`id`, `name`, `department`, `semester`, `credits`, `faculty_id`, `total_sessions`, `completed_sessions`) VALUES
('CS301', 'Data Structures & Algorithms', 'CSE', 5, 4, 'FAC001', 45, 32),
('CS302', 'Database Management Systems', 'CSE', 5, 4, 'FAC002', 40, 28),
('CS303', 'Operating Systems', 'CSE', 5, 3, 'FAC001', 35, 25),
('EC301', 'Digital Signal Processing', 'ECE', 5, 4, 'FAC003', 42, 30),
('ME201', 'Thermodynamics', 'ME', 3, 3, 'FAC004', 38, 26);

-- Insert Course Outcomes
INSERT INTO `course_outcomes` (`id`, `course_id`, `description`, `bloom_level`, `attainment`) VALUES
('CO1', 'CS301', 'Analyze time & space complexity of algorithms', 'Analyze', 72.00),
('CO2', 'CS301', 'Implement tree and graph data structures', 'Apply', 68.00),
('CO3', 'CS301', 'Design efficient sorting & searching algorithms', 'Create', 75.00),
('CO4', 'CS302', 'Design normalized relational database schemas', 'Create', 80.00),
('CO5', 'CS302', 'Write complex SQL queries with joins & subqueries', 'Apply', 65.00),
('CO6', 'CS303', 'Explain process scheduling algorithms', 'Understand', 78.00);

-- Insert Sessions
INSERT INTO `sessions` (`id`, `course_id`, `topic`, `co_id`, `date`, `time`, `room`, `faculty_id`, `status`, `present`, `total`) VALUES
('SES001', 'CS301', 'Binary Search Trees', 'CO2', '2026-02-27', '09:00', 'LH-201', 'FAC001', 'upcoming', 0, 60),
('SES002', 'CS301', 'AVL Tree Rotations', 'CO2', '2026-02-26', '09:00', 'LH-201', 'FAC001', 'completed', 52, 60),
('SES003', 'CS302', 'SQL Joins', 'CO5', '2026-02-27', '11:00', 'LH-305', 'FAC002', 'upcoming', 0, 58),
('SES004', 'CS302', 'Normalization (3NF)', 'CO4', '2026-02-26', '11:00', 'LH-305', 'FAC002', 'completed', 48, 58),
('SES005', 'CS303', 'Round Robin Scheduling', 'CO6', '2026-02-27', '14:00', 'LH-102', 'FAC001', 'upcoming', 0, 55),
('SES006', 'CS301', 'Graph BFS & DFS', 'CO2', '2026-02-25', '09:00', 'LH-201', 'FAC001', 'completed', 55, 60),
('SES007', 'CS302', 'ER Diagrams', 'CO4', '2026-02-24', '11:00', 'LH-305', 'FAC002', 'completed', 50, 58),
('SES008', 'EC301', 'DFT & FFT', 'CO1', '2026-02-27', '10:00', 'LH-401', 'FAC003', 'upcoming', 0, 50);

-- Insert Attendance Logs
INSERT INTO `attendance_logs` (`id`, `student_id`, `session_id`, `status`, `timestamp`, `method`, `gps_valid`, `ip_valid`) VALUES
('ATT001', 'STU001', 'SES002', 'present', '2026-02-26 09:03:22', 'QR', TRUE, TRUE),
('ATT002', 'STU001', 'SES004', 'present', '2026-02-26 11:02:15', 'QR', TRUE, TRUE),
('ATT003', 'STU001', 'SES006', 'present', '2026-02-25 09:01:45', 'QR', TRUE, TRUE),
('ATT004', 'STU001', 'SES007', 'late', '2026-02-24 11:14:30', 'QR', TRUE, TRUE),
('ATT005', 'STU002', 'SES002', 'absent', NULL, '', FALSE, FALSE),
('ATT006', 'STU002', 'SES004', 'present', '2026-02-26 11:05:00', 'QR', TRUE, TRUE),
('ATT007', 'STU003', 'SES002', 'present', '2026-02-26 09:00:55', 'QR', TRUE, TRUE),
('ATT008', 'STU004', 'SES002', 'absent', NULL, '', FALSE, FALSE),
('ATT009', 'STU001', 'SES001', 'present', '2026-02-27 09:02:10', 'QR', TRUE, TRUE),
('ATT010', 'STU005', 'SES002', 'late', '2026-02-26 09:12:30', 'QR', TRUE, FALSE);

-- Insert Leaves
INSERT INTO `leaves` (`id`, `student_id`, `type`, `start_date`, `end_date`, `reason`, `status`, `document`, `approved_by`, `approved_at`) VALUES
('LEA001', 'STU001', 'Medical', '2026-02-20', '2026-02-21', 'Fever and cold', 'approved', 'medical_cert.pdf', 'FAC001', '2026-02-19 14:30:00'),
('LEA002', 'STU002', 'On-Duty', '2026-02-25', '2026-02-25', 'Inter-college hackathon', 'pending', 'od_letter.pdf', NULL, NULL),
('LEA003', 'STU004', 'Medical', '2026-02-22', '2026-02-24', 'Hospitalized for dengue', 'approved', 'hospital_report.pdf', 'FAC003', '2026-02-21 16:45:00'),
('LEA004', 'STU007', 'Personal', '2026-02-18', '2026-02-18', 'Family function', 'rejected', '', 'FAC001', '2026-02-17 11:20:00');

-- Insert Timetable
INSERT INTO `timetable` (`id`, `day`, `time`, `course_id`, `room`, `faculty_id`) VALUES
('TT001', 'Monday', '09:00-10:00', 'CS301', 'LH-201', 'FAC001'),
('TT002', 'Monday', '11:00-12:00', 'CS302', 'LH-305', 'FAC002'),
('TT003', 'Monday', '14:00-15:00', 'CS303', 'LH-102', 'FAC001'),
('TT004', 'Tuesday', '09:00-10:00', 'EC301', 'LH-401', 'FAC003'),
('TT005', 'Tuesday', '11:00-12:00', 'ME201', 'LH-501', 'FAC004'),
('TT006', 'Tuesday', '14:00-15:00', 'CS301', 'LH-201', 'FAC001'),
('TT007', 'Wednesday', '09:00-10:00', 'CS302', 'LH-305', 'FAC002'),
('TT008', 'Wednesday', '11:00-12:00', 'CS303', 'LH-102', 'FAC001'),
('TT009', 'Wednesday', '14:00-15:00', 'EC301', 'LH-401', 'FAC003'),
('TT010', 'Thursday', '09:00-10:00', 'CS301', 'LH-201', 'FAC001'),
('TT011', 'Thursday', '11:00-12:00', 'ME201', 'LH-501', 'FAC004'),
('TT012', 'Thursday', '14:00-15:00', 'CS302', 'LH-305', 'FAC002'),
('TT013', 'Friday', '09:00-10:00', 'CS303', 'LH-102', 'FAC001'),
('TT014', 'Friday', '11:00-12:00', 'EC301', 'LH-401', 'FAC003'),
('TT015', 'Friday', '14:00-15:00', 'ME201', 'LH-501', 'FAC004');

-- Insert Exam Permits
INSERT INTO `exam_permits` (`id`, `student_id`, `exam_name`, `department`, `semester`, `overall_eligible`, `issued_at`) VALUES
('PERMIT001', 'STU001', 'End Semester Examination — Feb 2026', 'Computer Science & Engineering', 5, TRUE, '2026-02-01 10:00:00');

-- Insert Exam Permit Courses
INSERT INTO `exam_permit_courses` (`id`, `permit_id`, `course_id`, `attendance`, `eligible`) VALUES
('PERMITCOURSE001', 'PERMIT001', 'CS301', 87.00, TRUE),
('PERMITCOURSE002', 'PERMIT001', 'CS302', 86.00, TRUE),
('PERMITCOURSE003', 'PERMIT001', 'CS303', 88.00, TRUE);

-- =============================================
-- CREATE ADMIN USER
-- =============================================

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role_id`, `department`, `designation`) VALUES
('ADMIN001', 'System Administrator', 'admin@nit.edu', '$2a$10$...', 'ROLE_ADMIN', 'Administration', 'Administrator');

-- Note: The passwords are placeholders and should be replaced with actual hashed passwords
-- using a secure hashing algorithm (bcrypt recommended)
