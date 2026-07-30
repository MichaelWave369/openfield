import type { SourceHealthSample, SourceRegistration } from "@/domain/evidence";

export const syntheticDataCenterSource: SourceRegistration = {
  sourceId: "fixture.data-center-watch.planning.v1",
  version: 1,
  displayName: "Synthetic Data Center Planning Fixture",
  owner: "Parallax OpenField",
  description: "A non-live fixture used to validate custody, temporal, and source-health behavior.",
  accessMode: "fixture",
  expectedRefreshSeconds: 86_400,
  geographicCoverage: ["synthetic-east-site"],
  missions: ["data-center-watch"],
  privacyClass: "public",
  license: {
    name: "OpenField Synthetic Fixture License",
    attributionRequired: true,
    redistributionAllowed: true
  },
  synthetic: true,
  enabled: true,
  approvedAt: "2026-07-30T16:00:00.000Z"
};

export const syntheticDataCenterHealth: SourceHealthSample = {
  healthId: "health:fixture.data-center-watch.planning.v1:2026-07-30",
  sourceId: syntheticDataCenterSource.sourceId,
  checkedAt: "2026-07-30T16:00:00.000Z",
  lastAttemptAt: "2026-07-30T16:00:00.000Z",
  lastSuccessAt: "2026-07-30T16:00:00.000Z",
  consecutiveFailures: 0,
  latencyMs: 1,
  recordsObserved: 1,
  upstreamStatus: 200,
  message: "Synthetic fixture loaded locally; no external source contacted."
};

export const builtInSources = [syntheticDataCenterSource] as const;
