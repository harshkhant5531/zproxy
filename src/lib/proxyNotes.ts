export type ProxySignal = "detected" | "suspect" | "none";

export type ProxyNotesParseResult = {
  signal: ProxySignal;
  detected: boolean;
  suspect: boolean;
  autoAbsentDetected: boolean;
};

/**
 * Parses backend `attendance.notes` tags into a stable UI signal.
 *
 * Backend tags used:
 * - [PROXY_DETECTED...]
 * - [PROXY_SUSPECT...]
 * - [AUTO_ABSENT:PROXY_DETECTED]
 *
 * We also tolerate legacy `[AUTO_ABSENT:PROXY_SUSPECT]` for old records.
 */
export function parseProxyNotes(notes?: string | null): ProxyNotesParseResult {
  const noteStr = typeof notes === "string" ? notes : "";

  const detected =
    noteStr.includes("[PROXY_DETECTED") ||
    noteStr.includes("[AUTO_ABSENT:PROXY_DETECTED");

  const suspect =
    noteStr.includes("[PROXY_SUSPECT") ||
    noteStr.includes("[AUTO_ABSENT:PROXY_SUSPECT"); // legacy

  const autoAbsentDetected = noteStr.includes("[AUTO_ABSENT:PROXY_DETECTED");

  const signal: ProxySignal = detected ? "detected" : suspect ? "suspect" : "none";

  return {
    signal,
    detected,
    suspect,
    autoAbsentDetected,
  };
}

