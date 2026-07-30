export const recordKinds = [
  "observation",
  "claim",
  "inference",
  "forecast",
  "contradiction",
  "unknown"
] as const;

export type RecordKind = (typeof recordKinds)[number];
export type IsoTimestamp = string;
export type Sha256Digest = `sha256:${string}`;

export type ConfidenceVector = {
  sourceReliability: number;
  directness: number;
  corroboration: number;
  independence: number;
  freshness: number;
  contradictionPenalty: number;
  uncertainty: number;
};

export type GeographicPoint = {
  type: "Point";
  coordinates: [longitude: number, latitude: number];
};

export type TransformationStep = {
  name: string;
  version: string;
  performedAt: IsoTimestamp;
  inputHash: Sha256Digest;
  outputHash: Sha256Digest;
  parameters?: Record<string, string | number | boolean | null>;
};

export type SourceLicense = {
  name: string;
  url?: string;
  attributionRequired: boolean;
  redistributionAllowed: boolean;
};

export type SourceRegistration = {
  sourceId: string;
  version: number;
  displayName: string;
  owner: string;
  description: string;
  accessMode: "fixture" | "api" | "feed" | "document" | "manual";
  expectedRefreshSeconds: number;
  geographicCoverage: string[];
  missions: string[];
  privacyClass: "public" | "restricted";
  license: SourceLicense;
  synthetic: boolean;
  enabled: boolean;
  approvedAt: IsoTimestamp;
};

export type SourceHealthSample = {
  healthId: string;
  sourceId: string;
  checkedAt: IsoTimestamp;
  lastAttemptAt: IsoTimestamp;
  lastSuccessAt: IsoTimestamp | null;
  consecutiveFailures: number;
  latencyMs: number | null;
  recordsObserved: number;
  upstreamStatus: number | null;
  message?: string;
};

export type EvidenceArtifact = {
  artifactHash: Sha256Digest;
  mediaType: string;
  byteLength: number;
  collectedAt: IsoTimestamp;
  storageUri: string | null;
  contentBase64?: string;
};

export type ReceiptPayload = {
  receiptVersion: "openfield.receipt.v1";
  receiptId: string;
  artifactHash: Sha256Digest;
  sourceId: string;
  sourceRecordId: string | null;
  collectedAt: IsoTimestamp;
  observedAt: IsoTimestamp | null;
  validFrom: IsoTimestamp;
  validTo: IsoTimestamp | null;
  recordedAt: IsoTimestamp;
  mediaType: string;
  byteLength: number;
  transformations: TransformationStep[];
  license: SourceLicense;
  synthetic: boolean;
  collector: {
    connectorId: string;
    connectorVersion: string;
    nodeId: string;
  };
};

export type ReceiptSignature = {
  algorithm: "Ed25519";
  keyId: string;
  valueBase64: string;
};

export type SignedReceipt = {
  payload: ReceiptPayload;
  payloadHash: Sha256Digest;
  signature: ReceiptSignature | null;
};

export type EvidenceRecord = {
  recordId: string;
  recordKey: string;
  missionId: string;
  kind: RecordKind;
  title: string;
  summary: string;
  location: GeographicPoint | null;
  validFrom: IsoTimestamp;
  validTo: IsoTimestamp | null;
  recordedAt: IsoTimestamp;
  supersedesRecordId: string | null;
  receiptIds: string[];
  dependencyRecordIds: string[];
  confidence: ConfidenceVector;
  synthetic: boolean;
};

export type TemporalQuery = {
  missionId?: string;
  kind?: RecordKind;
  validAt?: IsoTimestamp;
  knownAt?: IsoTimestamp;
};
