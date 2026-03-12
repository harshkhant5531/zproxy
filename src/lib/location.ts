const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

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
