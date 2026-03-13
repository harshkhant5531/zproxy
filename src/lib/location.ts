const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const EARTH_RADIUS_METERS = 6371000;

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const deltaLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const deltaLng = ((b.longitude - a.longitude) * Math.PI) / 180;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const x = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return Math.round(EARTH_RADIUS_METERS * y);
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
}

export type StabilizedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  sampleCount: number;
  sampleSpreadMeters: number;
  isHighAccuracy: boolean;
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
    sampleCount = 4,
    intervalMs = 700,
    desiredAccuracyMeters = 50,
    ...options
  } = input;

  const targetSampleCount = Math.min(6, Math.max(2, sampleCount));
  const samples: GeolocationPosition[] = [];

  for (let i = 0; i < targetSampleCount; i++) {
    const sample = await requestCurrentPosition(options);
    samples.push(sample);

    // If we already hit a very good accuracy, we can stop early if we have at least 2 samples
    if (samples.length >= 2 && sample.coords.accuracy <= desiredAccuracyMeters) {
      break;
    }

    if (i < targetSampleCount - 1) {
      await delay(intervalMs);
    }
  }

  const latitudes = samples.map((sample) => sample.coords.latitude);
  const longitudes = samples.map((sample) => sample.coords.longitude);
  const accuracies = samples.map((sample) => sample.coords.accuracy);

  const medianLatitude = median(latitudes);
  const medianLongitude = median(longitudes);
  const medianAccuracy = Math.round(median(accuracies));

  const spreadMeters = Math.max(
    ...samples.map((sample) =>
      haversineMeters(
        {
          latitude: sample.coords.latitude,
          longitude: sample.coords.longitude,
        },
        {
          latitude: medianLatitude,
          longitude: medianLongitude,
        },
      ),
    ),
  );

  return {
    latitude: medianLatitude,
    longitude: medianLongitude,
    accuracy: medianAccuracy,
    capturedAt: new Date().toISOString(),
    sampleCount: samples.length,
    sampleSpreadMeters: spreadMeters,
    isHighAccuracy: medianAccuracy <= desiredAccuracyMeters,
  };
}

type RetryLocationOptions = StabilizedLocationOptions & {
  maxRetries?: number;
};

export async function requestStabilizedPositionWithRetry(
  input: RetryLocationOptions = {},
): Promise<StabilizedLocation> {
  const { maxRetries = 3, desiredAccuracyMeters = 60, ...rest } = input;

  let latestLocation: StabilizedLocation | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt += 1) {
    try {
      latestLocation = await requestStabilizedPosition({
        ...rest,
        desiredAccuracyMeters,
      });

      if (latestLocation.accuracy <= desiredAccuracyMeters) {
        return latestLocation;
      }
    } catch (err) {
      console.warn(`Location attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries - 1) throw err;
    }

    if (attempt < maxRetries - 1) {
      await delay(1500);
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
