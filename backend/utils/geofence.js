const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_RADIUS_METERS = 60;
const MIN_RADIUS_METERS = 10;
const MAX_RADIUS_METERS = 200;
const { getGeofenceSecuritySettings } = require("./geofenceSecuritySettings");

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
  const settings = getGeofenceSecuritySettings();
  const minTolerance = settings.baseToleranceMeters;
  const maxTolerance = settings.maxToleranceMeters;
  const factor = settings.toleranceAccuracyFactor;
  const parsedAccuracy = toFiniteNumber(accuracyMetersInput);
  if (parsedAccuracy === null || parsedAccuracy <= 0) {
    return minTolerance;
  }

  return Math.min(
    maxTolerance,
    Math.max(minTolerance, Math.round(parsedAccuracy * factor)),
  );
}

function resolveMaxAcceptableAccuracyMeters() {
  const settings = getGeofenceSecuritySettings();
  const parsed = toFiniteNumber(process.env.MAX_ACCEPTABLE_GPS_ACCURACY);
  if (parsed === null || parsed <= 0) {
    return settings.maxAcceptableAccuracyMeters;
  }

  return Math.min(200, Math.max(20, Math.round(parsed)));
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
  const settings = getGeofenceSecuritySettings();
  const parsedAccuracy = toFiniteNumber(accuracyMetersInput);
  if (parsedAccuracy === null || parsedAccuracy <= 0) {
    return settings.retryBandMinMeters;
  }

  return Math.min(
    settings.retryBandMaxMeters,
    Math.max(
      settings.retryBandMinMeters,
      Math.round(parsedAccuracy * settings.retryBandAccuracyFactor),
    ),
  );
}

function resolveMaxSampleSpreadMeters(radiusMeters) {
  const settings = getGeofenceSecuritySettings();
  return Math.min(
    settings.sampleSpreadMaxMeters,
    Math.max(
      settings.sampleSpreadMinMeters,
      Math.round(radiusMeters * settings.sampleSpreadFactor),
    ),
  );
}

function validateStudentGeofence(
  session,
  lat,
  lng,
  accuracyMetersInput,
  options = {},
) {
  const settings = getGeofenceSecuritySettings();
  const { capturedAt, locationMeta } = options;
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

  if (locationAgeMs > settings.maxLocationAgeMs) {
    const error = new Error(
      "Location sample is stale. Keep the device steady and retry.",
    );
    error.statusCode = 400;
    error.locationAgeMs = locationAgeMs;
    error.maxLocationAgeMs = settings.maxLocationAgeMs;
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
    error.maxLocationAgeMs = settings.maxLocationAgeMs;
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
  const sampleSpreadMeters = toFiniteNumber(locationMeta?.sampleSpreadMeters);
  const maxSampleSpreadMeters = resolveMaxSampleSpreadMeters(radiusMeters);

  if (
    sampleSpreadMeters !== null &&
    sampleSpreadMeters > maxSampleSpreadMeters
  ) {
    const error = new Error(
      `Location signal is unstable (${Math.round(sampleSpreadMeters)}m spread). Hold still and retry.`,
    );
    error.statusCode = 409;
    error.sampleSpreadMeters = Math.round(sampleSpreadMeters);
    error.maxSampleSpreadMeters = maxSampleSpreadMeters;
    error.radiusMeters = radiusMeters;
    error.decisionReason = "location_spread_too_high";
    throw error;
  }

  if (
    reportedAccuracyMeters !== null &&
    radiusMeters <= settings.smallRadiusThresholdMeters &&
    reportedAccuracyMeters > settings.smallRadiusMaxAccuracyMeters
  ) {
    const error = new Error(
      `GPS accuracy (±${Math.round(reportedAccuracyMeters)}m) is not sufficient for a ${radiusMeters}m radius. Move to open sky and retry.`,
    );
    error.statusCode = 409;
    error.reportedAccuracyMeters = Math.round(reportedAccuracyMeters);
    error.radiusMeters = radiusMeters;
    error.maxAcceptableAccuracyForRadius =
      settings.smallRadiusMaxAccuracyMeters;
    error.decisionReason = "gps_accuracy_too_low_for_small_radius";
    throw error;
  }

  const rawDistanceMeters = calculateDistanceMeters(
    studentLocation,
    referenceLocation,
  );
  const toleranceMeters = resolveAccuracyToleranceMeters(
    reportedAccuracyMeters,
  );
  const distanceMeters = rawDistanceMeters;
  const effectiveThresholdMeters = radiusMeters + toleranceMeters;
  const retryBandMeters = resolveRetryBandMeters(reportedAccuracyMeters);

  if (distanceMeters > effectiveThresholdMeters) {
    if (rawDistanceMeters <= effectiveThresholdMeters + retryBandMeters) {
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
      error.effectiveThresholdMeters = effectiveThresholdMeters;
      error.locationAgeMs = locationAgeMs;
      error.maxLocationAgeMs = settings.maxLocationAgeMs;
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
    error.effectiveThresholdMeters = effectiveThresholdMeters;
    error.locationAgeMs = locationAgeMs;
    error.maxLocationAgeMs = settings.maxLocationAgeMs;
    error.decisionReason = "outside_geofence";
    throw error;
  }

  return {
    decisionReason: "accepted",
    distanceMeters,
    rawDistanceMeters,
    toleranceMeters,
    effectiveThresholdMeters,
    retryBandMeters,
    radiusMeters,
    reportedAccuracyMeters,
    sampleSpreadMeters,
    maxSampleSpreadMeters,
    locationAgeMs,
    maxLocationAgeMs: settings.maxLocationAgeMs,
    studentLocation,
    referenceLocation,
  };
}

module.exports = {
  DEFAULT_RADIUS_METERS,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
  haversineDistanceMeters,
  equirectangularDistanceMeters,
  calculateDistanceMeters,
  resolveRadiusMeters,
  resolveReferenceLocation,
  validateStudentGeofence,
};
