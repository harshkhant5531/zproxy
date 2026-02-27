

# Aura-Attendance Pro 2026 — Frontend Plan

A dark-themed, professional PWA-style attendance management system with all three role modules, fully populated with mock data. Think Vercel/GitHub aesthetic: dark backgrounds, neon/cyan accents, crisp typography, data-dense dashboards.

---

## 1. App Shell & Navigation

- **Dark theme** with cyan/blue accent colors, subtle borders, and card-based layouts
- **Sidebar navigation** (collapsible) with role-based menu items
- **Role switcher** in the sidebar header — toggle between Student, Faculty, and Admin views (since no auth backend, this lets you demo all roles)
- **Top header** with sidebar trigger, breadcrumbs, and user avatar

---

## 2. Student Module

### Dashboard
- **Attendance overview cards**: Overall %, today's classes, upcoming sessions
- **OBE Progress Tracker**: Visual bars/radials showing attendance mapped per Course Outcome (CO)
- **Recent attendance log**: Table of last 10 sessions with status (Present/Late/Absent)

### QR Scanner Page
- Simulated QR scanner UI with a viewfinder frame and "Scan" button (mock scan result)
- Geofence status indicator (green = in range, red = out of range — mocked)
- Grace period timer display

### What-If Simulator
- Interactive calculator: select courses, input planned absences, see projected attendance % with pass/fail threshold indicator

### Leave Management
- Submit leave form (type, dates, upload placeholder, reason)
- Leave history table with status badges (Pending / Approved / Rejected)

### Exam Permit
- Hall ticket card that shows green "Download" or red "Locked" based on mock attendance data

---

## 3. Faculty Module

### Dashboard
- **Today's sessions** card list with quick "Start Session" action
- **Attainment analytics**: Charts showing CO attainment across courses (recharts bar/radar charts)
- **Recent activity** feed

### Session Management
- **Create Session** wizard: Select Course → Topic → CO → Generate QR
- Simulated QR code display with rotating timer animation
- **Live Pulse Counter**: Real-time-style counter showing "42/60 students present" with an animated progress ring

### Attendance Records
- Sortable/filterable table of all sessions with attendance counts
- Drill into a session to see individual student check-ins with timestamps
- **Manual Override**: Mark student present with mandatory reason text field (audit log)

### Substitution
- UI to transfer session control to another faculty member from a dropdown

---

## 4. Admin / HOD Module

### Dashboard
- **Institution-wide stats**: Total students, active courses, average attendance %, flagged students
- **Department breakdown** cards with mini sparkline charts
- **Shortage alerts** panel: List of students below 75% threshold with severity indicators

### Student & Course Management
- Data tables for students and courses with search, filter, pagination
- Bulk import UI with drag-and-drop file zone and validation preview table

### Timetable View
- Weekly grid/calendar view showing scheduled sessions per department

### Reports & Compliance
- Report generator UI: Select department, date range, report type (NAAC/ABET/NEP-2020)
- Preview cards of generated reports with "Export PDF" / "Export Excel" buttons

### Shortage Escalation
- Table of students in "Red Zone" with parent contact info and "Send Alert" action buttons

---

## 5. Shared Components

- **Attendance charts** (recharts): Bar charts, line trends, radar charts for CO mapping
- **Data tables** with sorting, filtering, and pagination
- **Status badges**: Present (green), Late (amber), Absent (red), Pending (blue)
- **Stat cards** with icons, values, and trend indicators
- **Empty states** with illustrations for sections with no data

---

## 6. Security Feature UI (Visual Only)

- **Device binding indicator** in student profile (shows "Verified Device" badge)
- **Liveness check modal** mockup: Camera viewfinder with "Blink to verify" instruction
- **Anti-proxy indicators** on faculty session view: VPN detection badge, device fingerprint status

---

## 7. Pages & Routing

| Route | Page |
|---|---|
| `/` | Role-aware dashboard (redirects based on selected role) |
| `/student/dashboard` | Student dashboard |
| `/student/scan` | QR scanner |
| `/student/simulator` | What-if calculator |
| `/student/leaves` | Leave management |
| `/student/permit` | Exam permit |
| `/faculty/dashboard` | Faculty dashboard |
| `/faculty/session/new` | Create session |
| `/faculty/session/:id` | Live session view |
| `/faculty/records` | Attendance records |
| `/faculty/analytics` | Attainment analytics |
| `/admin/dashboard` | Admin dashboard |
| `/admin/students` | Student management |
| `/admin/courses` | Course management |
| `/admin/timetable` | Timetable view |
| `/admin/reports` | Reports & compliance |
| `/admin/alerts` | Shortage escalation |

All data will be hardcoded mock data — realistic Indian university names, course codes (like CS301, MA201), student names, and attendance records.

