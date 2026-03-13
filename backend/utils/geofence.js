const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_RADIUS_METERS = 60;
const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 200;
const DEFAULT_GPS_TOLERANCE_METERS = 20;
const MAX_GPS_TOLERANCE_METERS = 75;
const DEFAULT_MAX_ACCEPTABLE_ACCURACY_METERS = 250;
const MAX_MAX_ACCEPTABLE_ACCURACY_METERS = 400;
const MAX_LOCATION_AGE_MS = 15000;

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

// More accurate for short distances (< 1km) using equirectangular projection
function equirectangularDistanceMeters(from, to) {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const deltaLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const deltaLng = ((to.longitude - from.longitude) * Math.PI) / 180;

  const x = deltaLng * Math.cos((lat1 + lat2) / 2);
  const y = deltaLat;
  return Math.round(EARTH_RADIUS_METERS * Math.sqrt(x * x + y * y));
}

// Smart distance calculation - uses best formula based on distance
function calculateDistanceMeters(from, to) {
  // Check if coordinates are close enough for equirectangular
  const approxLatDiff = Math.abs(to.latitude - from.latitude);
  const approxLngDiff = Math.abs(to.longitude - from.longitude);

  // For small distances (< ~10km), equirectangular is more accurate
  if (approxLatDiff < 0.1 && approxLngDiff < 0.1) {
    return equirectangularDistanceMeters(from, to);
  }

  return haversineDistanceMeters(from, to);
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

function resolveLocationAgeMs(capturedAtInput) {
  if (
    capturedAtInput === null ||
    capturedAtInput === undefined ||
    capturedAtInput === ""
  ) {
    return null;
  }

  const capturedAt =
    capturedAtInput instanceof Date
      ? capturedAtInput
      : new Date(capturedAtInput);

  if (!Number.isFinite(capturedAt.getTime())) {
    return null;
  }

  const ageMs = Date.now() - capturedAt.getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0;
  }

  return Math.round(ageMs);
}

function resolveRetryBandMeters(accuracyMetersInput) {
  const parsedAccuracy = toFiniteNumber(accuracyMetersInput);
  if (parsedAccuracy === null || parsedAccuracy <= 0) {
    return 10;
  }

  return Math.min(60, Math.max(10, Math.round(parsedAccuracy * 0.5)));
}

function validateStudentGeofence(
  session,
  lat,
  lng,
  accuracyMetersInput,
  options = {},
) {
  const { capturedAt } = options;
  const studentLocation = {
    latitude: normalizeLatitude(lat),
    longitude: normalizeLongitude(lng),
  };

  const reportedAccuracyMeters = toFiniteNumber(accuracyMetersInput);
  let locationAgeMs = resolveLocationAgeMs(capturedAt);

  // Backward compatibility for older/cached clients that don't send timestamp.
  if (locationAgeMs === null) {
    locationAgeMs = 0;
  }

  if (locationAgeMs > MAX_LOCATION_AGE_MS) {
    const error = new Error(
      "Location sample is stale. Keep the device steady and retry.",
    );
    error.statusCode = 400;
    error.locationAgeMs = locationAgeMs;
    error.maxLocationAgeMs = MAX_LOCATION_AGE_MS;
    error.decisionReason = "stale_location_sample";
    throw error;
  }

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
    error.locationAgeMs = locationAgeMs;
    error.maxLocationAgeMs = MAX_LOCATION_AGE_MS;
    error.decisionReason = "gps_accuracy_too_low";
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
  const rawDistanceMeters = calculateDistanceMeters(
    studentLocation,
    referenceLocation,
  );
  const toleranceMeters = resolveAccuracyToleranceMeters(
    reportedAccuracyMeters,
  );
  const distanceMeters = Math.max(0, rawDistanceMeters - toleranceMeters);
  const retryBandMeters = resolveRetryBandMeters(reportedAccuracyMeters);

  if (distanceMeters > radiusMeters) {
    if (rawDistanceMeters <= radiusMeters + retryBandMeters) {
      const error = new Error(
        "Location is borderline due to GPS uncertainty. Hold still for a few seconds and retry.",
      );
      error.statusCode = 409;
      error.distanceMeters = distanceMeters;
      error.rawDistanceMeters = rawDistanceMeters;
      error.toleranceMeters = toleranceMeters;
      error.retryBandMeters = retryBandMeters;
      error.reportedAccuracyMeters = reportedAccuracyMeters;
      error.radiusMeters = radiusMeters;
      error.locationAgeMs = locationAgeMs;
      error.maxLocationAgeMs = MAX_LOCATION_AGE_MS;
      error.decisionReason = "borderline_retry";
      throw error;
    }

    const error = new Error(
      `You are ${distanceMeters}m away from the faculty location. Move within ${radiusMeters}m to mark attendance.`,
    );
    error.statusCode = 403;
    error.distanceMeters = distanceMeters;
    error.rawDistanceMeters = rawDistanceMeters;
    error.toleranceMeters = toleranceMeters;
    error.retryBandMeters = retryBandMeters;
    error.reportedAccuracyMeters = reportedAccuracyMeters;
    error.radiusMeters = radiusMeters;
    error.locationAgeMs = locationAgeMs;
    error.maxLocationAgeMs = MAX_LOCATION_AGE_MS;
    error.decisionReason = "outside_geofence";
    throw error;
  }

  return {
    decisionReason: "accepted",
    distanceMeters,
    rawDistanceMeters,
    toleranceMeters,
    retryBandMeters,
    radiusMeters,
    reportedAccuracyMeters,
    locationAgeMs,
    maxLocationAgeMs: MAX_LOCATION_AGE_MS,
    studentLocation,
    referenceLocation,
  };
}

module.exports = {
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
  MAX_LOCATION_AGE_MS,
  haversineDistanceMeters,
  equirectangularDistanceMeters,
  calculateDistanceMeters,
  resolveRadiusMeters,
  resolveReferenceLocation,
  validateStudentGeofence,
};
