const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000,
  maximumAge: 0,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const EARTH_RADIUS_METERS = 6371000;

// Improved Haversine formula with better numerical stability
function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const lat1Rad = (a.latitude * Math.PI) / 180;
  const lat2Rad = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const x =
    sinLat * sinLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinLng * sinLng;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(EARTH_RADIUS_METERS * y);
}

// More accurate distance calculation for small distances (< 1km)
// Uses equirectangular approximation which is faster and more accurate for short distances
function equirectangularDistanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const x = deltaLng * Math.cos((lat1 + lat2) / 2);
  const y = deltaLat;
  return Math.round(EARTH_RADIUS_METERS * Math.sqrt(x * x + y * y));
}

// Weighted average using accuracy as weight (lower accuracy = higher weight)
// This gives more importance to more accurate GPS readings
function weightedAverage(values: number[], accuracies: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let totalWeight = 0;
  let weightedSum = 0;

  for (let i = 0; i < values.length; i++) {
    // Weight is inverse of accuracy (better accuracy = higher weight)
    // Add 1 to avoid division by zero and give minimum weight
    const weight = 1 / (accuracies[i] + 1);
    weightedSum += values[i] * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : values[0];
}

// Simple median as fallback
function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }
  return sorted[midpoint];
}

// Filter outliers using Interquartile Range (IQR) method
function filterOutliers(
  positions: Array<{ lat: number; lng: number; accuracy: number }>,
): Array<{ lat: number; lng: number; accuracy: number }> {
  if (positions.length <= 2) return positions;

  // Calculate IQR for latitudes
  const lats = positions.map((p) => p.lat).sort((a, b) => a - b);
  const lngs = positions.map((p) => p.lng).sort((a, b) => a - b);

  const q1Lat = lats[Math.floor(lats.length * 0.25)];
  const q3Lat = lats[Math.floor(lats.length * 0.75)];
  const iqrLat = q3Lat - q1Lat;

  const q1Lng = lngs[Math.floor(lngs.length * 0.25)];
  const q3Lng = lngs[Math.floor(lngs.length * 0.75)];
  const iqrLng = q3Lng - q1Lng;

  // Filter out values outside 1.5 * IQR
  const lowerLat = q1Lat - 1.5 * iqrLat;
  const upperLat = q3Lat + 1.5 * iqrLat;
  const lowerLng = q1Lng - 1.5 * iqrLng;
  const upperLng = q3Lng + 1.5 * iqrLng;

  return positions.filter(
    (p) =>
      p.lat >= lowerLat &&
      p.lat <= upperLat &&
      p.lng >= lowerLng &&
      p.lng <= upperLng,
  );
}

export type StabilizedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  sampleCount: number;
  sampleSpreadMeters: number;
  isHighAccuracy: boolean;
  method: "weighted" | "median";
};

type StabilizedLocationOptions = PositionOptions & {
  sampleCount?: number;
  intervalMs?: number;
  desiredAccuracyMeters?: number;
};

export async function requestStabilizedPosition(
  input: StabilizedLocationOptions = {},
): Promise<StabilizedLocation> {
  const {
    sampleCount = 5,
    intervalMs = 350,
    desiredAccuracyMeters = 35,
    ...options
  } = input;

  const targetSampleCount = Math.min(10, Math.max(3, sampleCount));
  const samples: GeolocationPosition[] = [];
  let bestAccuracy = Number.POSITIVE_INFINITY;

  for (let i = 0; i < targetSampleCount; i++) {
    try {
      const sample = await requestCurrentPosition(options);
      samples.push(sample);
      bestAccuracy = Math.min(bestAccuracy, sample.coords.accuracy);
    } catch (err) {
      // Continue trying even if some samples fail
      console.warn(`GPS sample ${i + 1} failed:`, err);
    }

    if (samples.length >= 3 && bestAccuracy <= desiredAccuracyMeters * 0.75) {
      break;
    }

    // Don't exit early - collect all samples for better accuracy
    if (i < targetSampleCount - 1) {
      await delay(intervalMs);
    }
  }

  if (samples.length === 0) {
    throw new Error("Unable to get GPS location. Please try again.");
  }

  if (samples.length === 1) {
    return {
      latitude: samples[0].coords.latitude,
      longitude: samples[0].coords.longitude,
      accuracy: Math.round(samples[0].coords.accuracy),
      capturedAt: new Date().toISOString(),
      sampleCount: 1,
      sampleSpreadMeters: 0,
      isHighAccuracy: samples[0].coords.accuracy <= desiredAccuracyMeters,
      method: "median",
    };
  }

  // Extract coordinates and accuracies
  const positions = samples.map((s) => ({
    lat: s.coords.latitude,
    lng: s.coords.longitude,
    accuracy: s.coords.accuracy,
  }));

  // Filter outliers
  const filteredPositions = filterOutliers(positions);

  // Use weighted average for better accuracy
  const latitudes = filteredPositions.map((p) => p.lat);
  const longitudes = filteredPositions.map((p) => p.lng);
  const accuracies = filteredPositions.map((p) => p.accuracy);

  const weightedLatitude = weightedAverage(latitudes, accuracies);
  const weightedLongitude = weightedAverage(longitudes, accuracies);

  // Calculate median accuracy as representative
  const medianAccuracy = Math.round(median(accuracies));

  // Calculate spread from weighted center
  const spreadMeters = Math.max(
    ...filteredPositions.map((p) =>
      equirectangularDistanceMeters(
        { latitude: weightedLatitude, longitude: weightedLongitude },
        { latitude: p.lat, longitude: p.lng },
      ),
    ),
  );

  return {
    latitude: weightedLatitude,
    longitude: weightedLongitude,
    accuracy: medianAccuracy,
    capturedAt: new Date().toISOString(),
    sampleCount: samples.length,
    sampleSpreadMeters: spreadMeters,
    isHighAccuracy: medianAccuracy <= desiredAccuracyMeters,
    method: "weighted",
  };
}

type RetryLocationOptions = StabilizedLocationOptions & {
  maxRetries?: number;
  minSamplesRequired?: number;
};

export async function requestStabilizedPositionWithRetry(
  input: RetryLocationOptions = {},
): Promise<StabilizedLocation> {
  const {
    maxRetries = 3,
    desiredAccuracyMeters = 35,
    minSamplesRequired = 2,
    ...rest
  } = input;

  let latestLocation: StabilizedLocation | null = null;
  let bestAccuracy = Infinity;

  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      latestLocation = await requestStabilizedPosition({
        ...rest,
        desiredAccuracyMeters,
      });

      // Track best accuracy achieved
      if (latestLocation.accuracy < bestAccuracy) {
        bestAccuracy = latestLocation.accuracy;
      }

      // If we got good enough accuracy, return it
      if (latestLocation.accuracy <= desiredAccuracyMeters) {
        return latestLocation;
      }

      // If we have enough samples and a materially better fix than prior attempt, accept it.
      if (
        latestLocation.sampleCount >= minSamplesRequired &&
        latestLocation.accuracy < bestAccuracy * 0.8
      ) {
        return latestLocation;
      }
    } catch (err) {
      console.warn(`Location attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries - 1) throw err;
    }

    if (attempt < maxRetries - 1) {
      const backoffMs = 450 * Math.pow(1.35, attempt) + Math.random() * 180;
      await delay(backoffMs);
    }
  }

  if (!latestLocation) {
    throw new Error("Unable to collect location samples. Please retry.");
  }

  return latestLocation;
}

export function isGeolocationAvailable() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function requestCurrentPosition(
  options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS,
) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      ...DEFAULT_GEOLOCATION_OPTIONS,
      ...options,
    });
  });
}

export async function getGeolocationPermissionState() {
  if (!("permissions" in navigator) || !navigator.permissions?.query) {
    return "prompt" as PermissionState;
  }

  try {
    const permission = await navigator.permissions.query({
      name: "geolocation" as PermissionName,
    });
    return permission.state;
  } catch {
    return "prompt" as PermissionState;
  }
}

export function getLocationErrorMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  ) {
    if (error.code === 1) {
      return "Location permission was denied. Allow GPS/location access and try again.";
    }

    if (error.code === 2) {
      return "Location could not be determined. Move to an open area and try again.";
    }

    if (error.code === 3) {
      return "Location request timed out. Make sure GPS is enabled and retry.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to read your location. Allow location access and try again.";
}
