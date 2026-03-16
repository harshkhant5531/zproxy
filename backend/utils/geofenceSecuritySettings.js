const fs = require("node:fs");
const path = require("node:path");

const SETTINGS_PATH = path.resolve(
  __dirname,
  "..",
  "data",
  "geofence-security.json",
);

const DEFAULT_GEOFENCE_SECURITY_SETTINGS = {
  maxAcceptableAccuracyMeters: 200,
  maxLocationAgeMs: 15000,
  baseToleranceMeters: 4,
  maxToleranceMeters: 12,
  toleranceAccuracyFactor: 0.2,
  retryBandMinMeters: 5,
  retryBandMaxMeters: 15,
  retryBandAccuracyFactor: 0.2,
  smallRadiusThresholdMeters: 40,
  smallRadiusMaxAccuracyMeters: 25,
  sampleSpreadFactor: 0.4,
  sampleSpreadMinMeters: 18,
  sampleSpreadMaxMeters: 40,
  strictProxyMode: true,
  blockMockLocation: true,
  requireDeviceFingerprint: true,
  blockDuplicateLocationReplay: true,
  duplicateLocationReplayWindowSeconds: 120,
};

function ensureSettingsFile() {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_PATH)) {
    fs.writeFileSync(
      SETTINGS_PATH,
      JSON.stringify(DEFAULT_GEOFENCE_SECURITY_SETTINGS, null, 2) + "\n",
      "utf8",
    );
  }
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampInt(value, min, max, fallback) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampFloat(value, min, max, fallback, precision = 3) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return fallback;
  const clamped = Math.min(max, Math.max(min, parsed));
  return Number(clamped.toFixed(precision));
}

function normalizeSettings(raw = {}) {
  const base = {
    ...DEFAULT_GEOFENCE_SECURITY_SETTINGS,
    ...raw,
  };

  return {
    maxAcceptableAccuracyMeters: clampInt(
      base.maxAcceptableAccuracyMeters,
      20,
      200,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.maxAcceptableAccuracyMeters,
    ),
    maxLocationAgeMs: clampInt(
      base.maxLocationAgeMs,
      5000,
      60000,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.maxLocationAgeMs,
    ),
    baseToleranceMeters: clampInt(
      base.baseToleranceMeters,
      0,
      20,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.baseToleranceMeters,
    ),
    maxToleranceMeters: clampInt(
      base.maxToleranceMeters,
      1,
      40,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.maxToleranceMeters,
    ),
    toleranceAccuracyFactor: clampFloat(
      base.toleranceAccuracyFactor,
      0,
      1,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.toleranceAccuracyFactor,
    ),
    retryBandMinMeters: clampInt(
      base.retryBandMinMeters,
      0,
      40,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.retryBandMinMeters,
    ),
    retryBandMaxMeters: clampInt(
      base.retryBandMaxMeters,
      0,
      60,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.retryBandMaxMeters,
    ),
    retryBandAccuracyFactor: clampFloat(
      base.retryBandAccuracyFactor,
      0,
      1,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.retryBandAccuracyFactor,
    ),
    smallRadiusThresholdMeters: clampInt(
      base.smallRadiusThresholdMeters,
      10,
      100,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.smallRadiusThresholdMeters,
    ),
    smallRadiusMaxAccuracyMeters: clampInt(
      base.smallRadiusMaxAccuracyMeters,
      5,
      50,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.smallRadiusMaxAccuracyMeters,
    ),
    sampleSpreadFactor: clampFloat(
      base.sampleSpreadFactor,
      0,
      1,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.sampleSpreadFactor,
    ),
    sampleSpreadMinMeters: clampInt(
      base.sampleSpreadMinMeters,
      5,
      80,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.sampleSpreadMinMeters,
    ),
    sampleSpreadMaxMeters: clampInt(
      base.sampleSpreadMaxMeters,
      10,
      120,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.sampleSpreadMaxMeters,
    ),
    strictProxyMode: Boolean(base.strictProxyMode),
    blockMockLocation: Boolean(base.blockMockLocation),
    requireDeviceFingerprint: Boolean(base.requireDeviceFingerprint),
    blockDuplicateLocationReplay: Boolean(base.blockDuplicateLocationReplay),
    duplicateLocationReplayWindowSeconds: clampInt(
      base.duplicateLocationReplayWindowSeconds,
      10,
      600,
      DEFAULT_GEOFENCE_SECURITY_SETTINGS.duplicateLocationReplayWindowSeconds,
    ),
  };
}

function getGeofenceSecuritySettings() {
  ensureSettingsFile();
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8"));
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_GEOFENCE_SECURITY_SETTINGS };
  }
}

function updateGeofenceSecuritySettings(partial = {}) {
  const current = getGeofenceSecuritySettings();
  const merged = normalizeSettings({ ...current, ...partial });
  fs.writeFileSync(
    SETTINGS_PATH,
    JSON.stringify(merged, null, 2) + "\n",
    "utf8",
  );
  return merged;
}

module.exports = {
  SETTINGS_PATH,
  DEFAULT_GEOFENCE_SECURITY_SETTINGS,
  getGeofenceSecuritySettings,
  updateGeofenceSecuritySettings,
};
