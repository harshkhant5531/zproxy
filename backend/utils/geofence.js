const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_RADIUS_METERS = 25;
const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 200;

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

function resolveReferenceLocation(session) {
  const latitude =
    normalizeLatitude(session?.facultyLat) ??
    normalizeLatitude(process.env.CAMPUS_LAT);
  const longitude =
    normalizeLongitude(session?.facultyLng) ??
    normalizeLongitude(process.env.CAMPUS_LNG);

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

function validateStudentGeofence(session, lat, lng) {
  const studentLocation = {
    latitude: normalizeLatitude(lat),
    longitude: normalizeLongitude(lng),
  };

  if (studentLocation.latitude === null || studentLocation.longitude === null) {
    const error = new Error(
      "Location access is required. Please allow GPS/location permission and try again.",
    );
    error.statusCode = 400;
    throw error;
  }

  const referenceLocation = resolveReferenceLocation(session);
  if (!referenceLocation) {
    const error = new Error(
      "Faculty location is unavailable for this session. Ask faculty to refresh the session location and try again.",
    );
    error.statusCode = 400;
    throw error;
  }

  const radiusMeters = resolveRadiusMeters(session);
  const distanceMeters = haversineDistanceMeters(
    studentLocation,
    referenceLocation,
  );

  if (distanceMeters > radiusMeters) {
    const error = new Error(
      `You are ${distanceMeters}m away from the faculty location. Move within ${radiusMeters}m to mark attendance.`,
    );
    error.statusCode = 403;
    error.distanceMeters = distanceMeters;
    error.radiusMeters = radiusMeters;
    throw error;
  }

  return {
    distanceMeters,
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
