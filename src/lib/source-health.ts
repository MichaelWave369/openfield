import type { SourceHealthSample, SourceRegistration } from "@/domain/evidence";

export type SourceHealthState = "healthy" | "degraded" | "stale" | "offline" | "unknown" | "disabled";

export type SourceHealthAssessment = {
  state: SourceHealthState;
  freshness: number;
  ageSeconds: number | null;
  reasons: string[];
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function assessSourceHealth(
  source: SourceRegistration,
  sample: SourceHealthSample | null,
  now: Date = new Date()
): SourceHealthAssessment {
  if (!source.enabled) {
    return { state: "disabled", freshness: 0, ageSeconds: null, reasons: ["source registration is disabled"] };
  }

  if (!sample) {
    return { state: "unknown", freshness: 0, ageSeconds: null, reasons: ["no health sample has been recorded"] };
  }

  if (sample.consecutiveFailures >= 3) {
    return {
      state: "offline",
      freshness: 0,
      ageSeconds: sample.lastSuccessAt
        ? Math.max(0, (now.getTime() - new Date(sample.lastSuccessAt).getTime()) / 1000)
        : null,
      reasons: [`${sample.consecutiveFailures} consecutive collection failures`]
    };
  }

  if (!sample.lastSuccessAt) {
    return { state: "unknown", freshness: 0, ageSeconds: null, reasons: ["source has not completed a successful collection"] };
  }

  const ageSeconds = Math.max(0, (now.getTime() - new Date(sample.lastSuccessAt).getTime()) / 1000);
  const ratio = ageSeconds / source.expectedRefreshSeconds;
  const freshness = clamp01(Math.exp(-Math.LN2 * ratio));

  if (ratio <= 1.5) {
    return { state: "healthy", freshness, ageSeconds, reasons: [] };
  }

  if (ratio <= 3) {
    return {
      state: "degraded",
      freshness,
      ageSeconds,
      reasons: ["last successful collection exceeded the expected refresh interval"]
    };
  }

  return {
    state: "stale",
    freshness,
    ageSeconds,
    reasons: ["source data is too old to present as current"]
  };
}
