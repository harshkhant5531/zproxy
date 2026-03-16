# Aura Integrity Engine - Detailed Features and Functionality

## 1. Platform Overview

Aura Integrity Engine is a role-based academic attendance and administration platform with:

- Geofenced attendance capture
- Anti-proxy and risk analytics
- Course, faculty, student, timetable, and leave workflows
- Grade and exam permit management
- Report generation and downloads
- Multi-role dashboards for admin, faculty, and student users

The system is split into:

- Frontend: React + TypeScript + Vite + TanStack Query + shadcn/ui
- Backend: Express + Prisma + PostgreSQL + JWT auth

## 2. Core Architecture and Technical Capabilities

### Frontend stack

- React 18 with React Router role-based protected routes
- TanStack Query for API data-fetching, caching, retries, and stale-time controls
- Axios API client with:
  - Dynamic base URL resolution for local and production deployments
  - Automatic Bearer token injection
  - 401 interceptor that clears auth state and redirects to login
- shadcn/radix UI component system
- Recharts for analytics and charts
- Theme provider with persisted theme preference
- Toast systems for user feedback

### Backend stack

- Express API with route-level modularization
- Prisma ORM with PostgreSQL schema-driven models
- JWT authentication middleware
- Role authorization via requireRole guards
- express-validator input validation on write operations
- Audit logs for security-sensitive actions
- CORS enforcement with private-network support controls
- Health endpoint for uptime checks

## 3. Authentication, Authorization, and Security Features

### Authentication features

- Email/password registration
- Email/password login
- Google SSO login endpoint
- Password reset request and reset completion flow
- Current user profile fetch/update
- Password change endpoint for authenticated users

### Password and identity security

- Argon2 password hashing and verification
- JWT token-based session auth
- Token parsing from Authorization Bearer header
- Account status enforcement: inactive/suspended users are blocked
- Default password detection support and requiresPasswordChange handling

### Role-based authorization model

- Admin: full administration and settings authority
- Faculty: academic operations for owned/related entities
- Student: self-service access to own attendance/academic records
- Route guards enforce role access both server-side and client-side

### Geolocation and anti-proxy security

- Geofence validation using GPS coordinates
- Distance calculations using optimized geodesic algorithms
- Accuracy tolerance logic based on reported GPS accuracy
- Stale location sample rejection
- Borderline retry behavior for uncertain GPS scenarios
- Configurable anti-proxy controls:
  - strictProxyMode
  - blockMockLocation
  - requireDeviceFingerprint
  - blockDuplicateLocationReplay
  - duplicateLocationReplayWindowSeconds
- Device fingerprint normalization and duplicate checks
- Risk tags such as:
  - GEO_RISK:MOCK_LOCATION_SIGNAL
  - GEO_RISK:IMPOSSIBLE_JUMP
  - GEO_RISK:COORD_CLUSTER
  - PROXY_DETECTED

### Audit logging

- ATTENDANCE_ATTEMPT logging with metadata
- Geofence setting update audit trails with previous and updated values
- Client IP extraction with proxy/header normalization

## 4. Frontend Functional Modules by Role

## 4.1 Public pages

- Login page with credential login and Google login option
- Forgot password page for reset link generation workflow
- Reset password page for token-driven password update
- 404 not found page

## 4.2 Shared authenticated pages

- Profile page for account info updates
- Password update controls
- First-login/default-password change enforcement handling

## 4.3 Student module

- Student dashboard:
  - Attendance KPIs
  - Attendance trend visualizations
  - Weekly/subject-level summary views
- Timetable view:
  - Weekly schedule presentation
  - Subject/faculty/room details
- Leave requests:
  - Leave application creation
  - Status tracking (pending/approved/rejected)
- Exam permit view:
  - Permit and eligibility-oriented student-facing display

## 4.4 Faculty module

- Faculty dashboard:
  - Daily overview and academic activity insights
- Create Session workflow:
  - Session metadata capture
  - Geolocation setup for attendance
- Live Session workflow:
  - Session attendance operations and in-progress controls
- Attendance records:
  - Historical record browsing and filtering
- Analytics page:
  - Performance and attendance charting for faculty scope
- Proxy audit page:
  - Suspicious attendance insights and visual analytics
- Faculty timetable
- Faculty leave approval operations

## 4.5 Admin module

- Admin dashboard:
  - System-level academic metrics and trends
- Faculty management:
  - Create/list/update/delete faculty users and profiles
- Student management:
  - Create/list/update/delete students
  - Enrollment and profile controls
- Course management:
  - Course CRUD
  - Subject assignment and management inside courses
- Timetable management:
  - Timetable entry CRUD and scheduling controls
- Leave approvals:
  - Review, approve, reject leave applications
- Reports:
  - Generate and download report files
- Alerts:
  - Attendance shortage and operational alerting interfaces
- Proxy audit:
  - Risk patterns and anomaly reporting
- Geofence security settings:
  - Fine-grained security parameter management
  - Settings change history review

## 4.6 Navigation and UX platform features

- Role-aware sidebar menus and module counts
- Protected routes with allowedRoles guards
- App layout with reusable shell and navigation
- Theme toggling and persistent UI mode
- Full-screen loaders and status badges
- Responsive dashboard/card/chart patterns

## 5. Backend API Functionality (Detailed Endpoint Matrix)

All protected routes require JWT auth unless explicitly marked public.

## 5.1 Health

- GET /api/health
  - Service liveness and timestamp

## 5.2 Auth routes (/api/auth)

- POST /register
  - Register user with role
- POST /login
  - Authenticate and issue token
- POST /google
  - Google token-based login workflow
- GET /me
  - Get authenticated user profile
- PUT /me
  - Update current user profile
- PUT /me/password
  - Change password
- POST /forgot-password
  - Generate reset link/token workflow
- POST /reset-password
  - Complete password reset with token

## 5.3 Users routes (/api/users)

- POST /students
  - Admin creates student + profile
- POST /faculty
  - Admin creates faculty + profile
- GET /
  - List users (filter/search/pagination behavior)
- GET /students
  - List students
- GET /faculty
  - List faculty
- GET /:id
  - Get single user details
- PUT /:id
  - Update user
- DELETE /:id
  - Delete user
- PUT /:id/profile
  - Update user profile record
- PUT /students/:id/enrollment
  - Update student course/subject enrollment

## 5.4 Courses routes (/api/courses)

- GET /
  - List courses
- GET /:id
  - Course detail
- POST /
  - Create course (admin)
- PUT /:id
  - Update course (admin)
- DELETE /:id
  - Delete course (admin)
- GET /:id/subjects
  - List subjects under course
- POST /:id/subjects
  - Create subject under course
- PUT /:courseId/subjects/:subjectId
  - Update subject under course
- DELETE /:courseId/subjects/:subjectId
  - Delete subject under course
- GET /:id/students
  - List students in course

## 5.5 Subjects routes (/api/subjects)

- GET /
  - List subjects with filtering support
- GET /:id
  - Subject details

## 5.6 Sessions routes (/api/sessions)

- GET /
  - List sessions with role-based scoping
- GET /:id
  - Session detail
- POST /
  - Create session
- PUT /:id
  - Update session
- DELETE /:id
  - Delete session
- POST /:id/finalize
  - Finalize session and close attendance workflow
- GET /:id/attendance
  - Session attendance listing

## 5.7 Attendance routes (/api/attendance)

- GET /
  - List attendance records by role scope
- GET /proxy-audit
  - Proxy and geolocation risk analytics
- GET /:id
  - Single attendance record
- POST /
  - Mark attendance with geofence and anti-proxy checks
- PUT /:id
  - Update attendance record
- DELETE /:id
  - Delete attendance record

## 5.8 Timetable routes (/api/timetable)

- GET /
  - List timetable entries
- GET /:id
  - Get timetable entry
- POST /
  - Create entry
- PUT /:id
  - Update entry
- DELETE /:id
  - Delete entry
- GET /daily
  - Daily timetable view
- GET /weekly
  - Weekly timetable view

## 5.9 Grades routes (/api/grades)

- GET /
  - List grades
- GET /:id
  - Get grade
- POST /
  - Create grade
- PUT /:id
  - Update grade
- DELETE /:id
  - Delete grade
- GET /report
  - Grade report endpoint

## 5.10 Exams routes (/api/exams)

- GET /permit
  - List exam permits
- GET /permit/:id
  - Permit detail
- POST /permit
  - Create permit
- PUT /permit/:id
  - Update permit
- DELETE /permit/:id
  - Delete permit
- GET /permit/:id/download
  - Download exam permit document

## 5.11 Leaves routes (/api/leaves)

- GET /
  - List leave applications
- GET /:id
  - Leave application detail
- POST /
  - Create leave application
- PUT /:id
  - Update leave application
- DELETE /:id
  - Delete leave application
- POST /:id/approve
  - Approve leave
- POST /:id/reject
  - Reject leave

## 5.12 Notifications routes (/api/notifications)

- GET /
  - List notifications
- GET /:id
  - Notification detail
- POST /
  - Create notification
- PUT /:id
  - Update notification
- DELETE /:id
  - Delete notification
- PUT /:id/read
  - Mark specific notification as read
- PUT /read-all
  - Mark all notifications as read
- GET /unread
  - Get unread notifications summary/list

## 5.13 Reports routes (/api/reports)

- GET /attendance
  - Attendance reporting dataset
- GET /grades
  - Grade reporting dataset
- GET /leaves
  - Leave reporting dataset
- GET /performance
  - Performance reporting dataset
- GET /department
  - Department-level reporting dataset
- GET /
  - List generated reports
- POST /generate
  - Generate report output file (CSV flow implemented)
- GET /download/:fileName
  - Download generated report file

## 5.14 Settings routes (/api/settings)

- GET /geofence-security
  - Get geofence security settings
- PUT /geofence-security
  - Update geofence security settings (audited)
- GET /geofence-security/history
  - Get settings change history from audit logs

## 6. Geofence and Anti-Proxy Engine (Deep Detail)

### Geofence validation pipeline

- Normalizes and validates latitude/longitude ranges
- Resolves faculty reference location per session
- Resolves session radius with enforced min/max bounds
- Computes distance using equirectangular or haversine strategy
- Computes effective threshold as radius + tolerance
- Enforces stale location max age
- Enforces max acceptable GPS accuracy
- Enforces sample spread stability checks
- Emits user-facing retry/error reasons for borderline cases

### Security settings model

Persisted geofence settings include:

- maxAcceptableAccuracyMeters
- maxLocationAgeMs
- baseToleranceMeters
- maxToleranceMeters
- toleranceAccuracyFactor
- retryBandMinMeters
- retryBandMaxMeters
- retryBandAccuracyFactor
- smallRadiusThresholdMeters
- smallRadiusMaxAccuracyMeters
- sampleSpreadFactor
- sampleSpreadMinMeters
- sampleSpreadMaxMeters
- strictProxyMode
- blockMockLocation
- requireDeviceFingerprint
- blockDuplicateLocationReplay
- duplicateLocationReplayWindowSeconds

### Proxy analytics and heuristics

- Shared device fingerprint detection
- Shared IP behavioral clustering
- Duplicate location replay window checks
- Coordinate cluster identification within sessions
- Impossible jump speed signal generation
- Risk note tagging and audit event logging

## 7. Reporting and Export Functionality

- Report generation endpoint supports type-driven report payload creation
- CSV file generation is implemented in backend route logic
- Generated files saved in backend/generated/reports
- Download endpoint serves generated files to authorized users
- Metadata persisted in report records with type, filters, status, format, file path/url

## 8. Domain Data Model Coverage (Prisma)

Primary modeled entities:

- Users
- AdminProfile
- FacultyProfile
- StudentProfile
- Course
- Subject
- Session
- Attendance
- ExamPermit
- LeaveApplication
- Grade
- Timetable
- Notification
- Report
- AuditLog

Key data capabilities:

- Multi-profile user architecture by role
- Many-to-many enrollment and subject assignment relations
- Session-attendance lifecycle linkage
- Academic performance data with course/subject/student relationships
- Security observability via audit logs

## 9. Operations, Environment, and Tooling Features

### Frontend scripts

- dev: sync environment + run Vite
- build and preview flows
- lint and vitest test flows
- seed and wipe helper commands
- optional ngrok tunnel helper

### Backend scripts

- start/dev bootstrapping with environment sync
- Prisma generate/migrate/studio commands
- Seed and optimized seed workflows

### Runtime/network operations

- Automatic local-network IP detection for CORS origin construction
- Configurable trust-proxy support for hosted reverse-proxy setups
- Health endpoint for deployment monitoring

## 10. End-to-End Functional Story

At runtime, the application delivers:

- Secure user authentication and role-scoped access
- Daily academic operations for students, faculty, and admins
- Geofence-validated attendance with anti-proxy safeguards
- Session lifecycle management from creation to finalization
- Leave, grades, timetable, permits, and notifications workflows
- Operational and academic analytics through dashboards and reports
- Auditable security controls and configurable geofence policy settings

## 11. Notes on Coverage

This document is generated from the current codebase implementation in frontend pages, API client modules, backend route handlers, middleware, geofence utilities, and Prisma schema. It reflects implemented functionality and endpoint surface in the present workspace state.
