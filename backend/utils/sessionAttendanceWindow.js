/**
 * Student self check-in must fall within session start/end (with grace).
 * Times are combined with session.date using the server's local timezone
 * (set TZ on Render, e.g. TZ=Asia/Kolkata, if faculty enters local class times).
 */

const openGraceMs = () =>
  Number(process.env.ATTENDANCE_OPEN_GRACE_MINUTES || 15) * 60 * 1000;

const closeGraceMs = () =>
  Number(process.env.ATTENDANCE_CLOSE_GRACE_MINUTES || 30) * 60 * 1000;

function combineSessionDateAndTime(sessionDate, timeStr) {
  const d = new Date(sessionDate);
  const parts = String(timeStr || "0:0").trim().split(":");
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) || 0;
  const hours = Number.isFinite(hh) ? hh : 0;
  const minutes = Number.isFinite(mm) ? mm : 0;
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

function sessionStartEndMs(session) {
  const start = combineSessionDateAndTime(session.date, session.startTime);
  let end = combineSessionDateAndTime(session.date, session.endTime);
  if (end < start) {
    end += 24 * 60 * 60 * 1000;
  }
  return { start, end };
}

function isStudentCheckInWindowOpen(session) {
  if (!session) return false;
  if (session.status === "completed" || session.status === "cancelled") {
    return false;
  }
  const now = Date.now();
  const { start, end } = sessionStartEndMs(session);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  const openAt = start - openGraceMs();
  const closeAt = end + closeGraceMs();
  return now >= openAt && now <= closeAt;
}

function assertStudentCheckInWindowOpen(session) {
  if (session.status === "completed") {
    const e = new Error("This session is no longer accepting attendance.");
    e.statusCode = 403;
    throw e;
  }
  if (session.status === "cancelled") {
    const e = new Error("This session was cancelled.");
    e.statusCode = 403;
    throw e;
  }
  const now = Date.now();
  const { start, end } = sessionStartEndMs(session);
  const openAt = start - openGraceMs();
  const closeAt = end + closeGraceMs();
  if (now < openAt) {
    const e = new Error("Check-in has not opened yet for this session.");
    e.statusCode = 403;
    throw e;
  }
  if (now > closeAt) {
    const e = new Error("Check-in has closed for this session.");
    e.statusCode = 403;
    throw e;
  }
}

module.exports = {
  combineSessionDateAndTime,
  isStudentCheckInWindowOpen,
  assertStudentCheckInWindowOpen,
};
