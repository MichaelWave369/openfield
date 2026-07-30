import type {
  ConfidenceVector,
  GeographicPoint,
  IsoTimestamp,
  RecordKind,
  Sha256Digest,
  SourceHealthSample,
  SourceRegistration,
  TransformationStep
} from "@/domain/evidence";

export type ConnectorManifest = {
  connectorId: string;
  connectorVersion: string;
  source: SourceRegistration;
  collectionMethod: string;
  rateLimitDescription: string;
  failureBehavior: "emit-nothing" | "emit-explicit-health-only";
};

export type ConnectorArtifact = {
  sourceRecordId: string | null;
  mediaType: string;
  bytes: Uint8Array;
  collectedAt: IsoTimestamp;
  observedAt: IsoTimestamp | null;
  validFrom: IsoTimestamp;
  validTo: IsoTimestamp | null;
  transformations: TransformationStep[];
};

export type ConnectorRecord = {
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
  artifactIndex: number;
  dependencyRecordIds: string[];
  confidence: ConfidenceVector;
  synthetic: boolean;
};

export type ConnectorTelemetry = {
  requestCount: number;
  upstreamStatuses: number[];
  userAgent: string | null;
  configurationHash: Sha256Digest;
};

export type ConnectorBatch = {
  batchId: string;
  collectedAt: IsoTimestamp;
  manifest: ConnectorManifest;
  artifacts: ConnectorArtifact[];
  records: ConnectorRecord[];
  health: SourceHealthSample;
  telemetry?: ConnectorTelemetry;
};

export interface OpenFieldConnector {
  readonly manifest: ConnectorManifest;
  collect(): Promise<ConnectorBatch>;
}
