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
  // Use the session date but override hours/minutes in IST.
  // We format the date to a string in Asia/Kolkata to extract the base date components.
  const d = new Date(sessionDate);
  const istDateStr = d.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  }); // YYYY-MM-DD
  const parts = String(timeStr || "0:0").trim().split(":");
  const hh = String(parts[0]).padStart(2, "0");
  const mm = String(parts[1] || "0").padStart(2, "0");

  // Create a new date string that represents this time IN IST
  // Then parse it. Since we want the result in epoch MS.
  return new Date(`${istDateStr}T${hh}:${mm}:00+05:30`).getTime();
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
