const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_RADIUS_METERS = 60;
const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 200;
const DEFAULT_GPS_TOLERANCE_METERS = 20;
const MAX_GPS_TOLERANCE_METERS = 75;
const DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS = 250;
const MAX_MAX_ACCEPTABLE_ACCURACY_METERS = 400;

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLatitude(value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < -90 || parsed > 90) {
    return null;
  }

  return parsed;
}

function normalizeLongitude(value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null || parsed < -180 || parsed > 180) {
    return null;
  }

  return parsed;
}

function resolveRadiusMeters(session) {
  const radiusCandidate =
    toFiniteNumber(session?.geofenceRadius) ??
    toFiniteNumber(process.env.CAMPUS_RADIUS) ??
    DEFAULT_RADIUS_METERS;

  return Math.min(
    MAX_RADIUS_METERS,
    Math.max(MIN_RADIUS_METERS, Math.round(radiusCandidate)),
  );
}

function resolveReferenceLocation(session, options = {}) {
  const { allowCampusFallback = false } = options;

  const latitude = allowCampusFallback
    ? (normalizeLatitude(session?.facultyLat) ??
      normalizeLatitude(process.env.CAMPUS_LAT))
    : normalizeLatitude(session?.facultyLat);
  const longitude = allowCampusFallback
    ? (normalizeLongitude(session?.facultyLng) ??
      normalizeLongitude(process.env.CAMPUS_LNG))
    : normalizeLongitude(session?.facultyLng);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function haversineDistanceMeters(from, to) {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);

  const a = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
}

function resolveAccuracyToleranceMeters(accuracyMetersInput) {
  const parsedAccuracy = toFiniteNumber(accuracyMetersInput);
  if (parsedAccuracy === null || parsedAccuracy <= 0) {
    return DEFAULT_GPS_TOLERANCE_METERS;
  }

  return Math.min(
    MAX_GPS_TOLERANCE_METERS,
    Math.max(DEFAULT_GPS_TOLERANCE_METERS, Math.round(parsedAccuracy)),
  );
}

function resolveMaxAcceptableAccuracyMeters() {
  const parsed = toFiniteNumber(process.env.MAX_ACCEPTABLE_GPS_ACCURACY);
  if (parsed === null || parsed <= 0) {
    return DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS;
  }

  return Math.min(
    MAX_MAX_ACCEPTABLE_ACCURACY_METERS,
    Math.max(DEFAULT_GPS_TOLERANCE_METERS, Math.round(parsed)),
  );
}

function validateStudentGeofence(session, lat, lng, accuracyMetersInput) {
  const studentLocation = {
    latitude: normalizeLatitude(lat),
    longitude: normalizeLongitude(lng),
  };

  const reportedAccuracyMeters = toFiniteNumber(accuracyMetersInput);
  const maxAcceptableAccuracyMeters = resolveMaxAcceptableAccuracyMeters();
  if (
    reportedAccuracyMeters !== null &&
    reportedAccuracyMeters > maxAcceptableAccuracyMeters
  ) {
    const error = new Error(
      `Your GPS signal is too weak (±${Math.round(reportedAccuracyMeters)}m). Move to an open area and try again.`,
    );
    error.statusCode = 400;
    error.reportedAccuracyMeters = Math.round(reportedAccuracyMeters);
    error.maxAcceptableAccuracyMeters = maxAcceptableAccuracyMeters;
    throw error;
  }

  if (studentLocation.latitude === null || studentLocation.longitude === null) {
    const error = new Error(
      "Location access is required. Please allow GPS/location permission and try again.",
    );
    error.statusCode = 400;
    throw error;
  }

  const referenceLocation = resolveReferenceLocation(session, {
    allowCampusFallback: false,
  });
  if (!referenceLocation) {
    const error = new Error(
      "Faculty location is unavailable for this session. Ask faculty to refresh the session location and try again.",
    );
    error.statusCode = 400;
    throw error;
  }

  const radiusMeters = resolveRadiusMeters(session);
  const rawDistanceMeters = haversineDistanceMeters(
    studentLocation,
    referenceLocation,
  );
  const toleranceMeters = resolveAccuracyToleranceMeters(
    reportedAccuracyMeters,
  );
  const distanceMeters = Math.max(0, rawDistanceMeters - toleranceMeters);

  if (distanceMeters > radiusMeters) {
    const error = new Error(
      `You are ${distanceMeters}m away from the faculty location. Move within ${radiusMeters}m to mark attendance.`,
    );
    error.statusCode = 403;
    error.distanceMeters = distanceMeters;
    error.rawDistanceMeters = rawDistanceMeters;
    error.toleranceMeters = toleranceMeters;
    error.reportedAccuracyMeters = reportedAccuracyMeters;
    error.radiusMeters = radiusMeters;
    throw error;
  }

  return {
    distanceMeters,
    rawDistanceMeters,
    toleranceMeters,
    radiusMeters,
    studentLocation,
    referenceLocation,
  };
}

module.exports = {
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
  haversineDistanceMeters,
  resolveRadiusMeters,
  resolveReferenceLocation,
  validateStudentGeofence,
};
