function normalizeOrigin(url?: string | null) {
  const normalized = String(url || "")
    .trim()
    .replace(/\/$/, "");
  if (!normalized) {
    return "";
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (
    /^(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/i.test(normalized)
  ) {
    return `http://${normalized}`;
  }

  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(normalized)) {
    return `https://${normalized}`;
  }

  return "";
}

export function getPublicAppOrigin(fallbackOrigin = window.location.origin) {
  return (
    normalizeOrigin(import.meta.env.VITE_PUBLIC_FRONTEND_URL as string) ||
    normalizeOrigin(import.meta.env.PUBLIC_FRONTEND_URL as string) ||
    normalizeOrigin(fallbackOrigin) ||
    window.location.origin
  );
}
