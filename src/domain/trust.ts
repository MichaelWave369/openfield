import type { IsoTimestamp, ReceiptSignature, Sha256Digest } from "@/domain/evidence";

export const signingKeyStatuses = ["active", "retired", "revoked"] as const;
export type SigningKeyStatus = (typeof signingKeyStatuses)[number];

export type SigningKeyRegistration = {
  keyId: string;
  version: number;
  algorithm: "Ed25519";
  publicKeyBase64: string;
  status: SigningKeyStatus;
  validFrom: IsoTimestamp;
  validTo: IsoTimestamp | null;
  recordedAt: IsoTimestamp;
  invalidatesSignaturesFrom: IsoTimestamp | null;
  reason: string | null;
  supersedesVersion: number | null;
};

export type KeyTrustEvaluation = {
  keyId: string;
  registrationFound: boolean;
  publicKeyBase64: string | null;
  status: SigningKeyStatus | "unknown";
  trustedForSignature: boolean;
  reason:
    | "trusted"
    | "registration-missing"
    | "signature-before-key-validity"
    | "signature-after-key-validity"
    | "signature-invalidated-by-revocation";
  evaluatedAt: IsoTimestamp;
  knownAt: IsoTimestamp;
};

export const privacyTargetTypes = ["artifact", "receipt", "record", "source"] as const;
export type PrivacyTargetType = (typeof privacyTargetTypes)[number];
export const privacyActions = ["suppress-content", "suppress-export", "restore"] as const;
export type PrivacyAction = (typeof privacyActions)[number];

export type PrivacyDirective = {
  directiveId: string;
  targetType: PrivacyTargetType;
  targetId: string;
  action: PrivacyAction;
  reasonCode: "personal-data" | "legal" | "security" | "source-terms" | "operator-error" | "other";
  rationale: string;
  requestedAt: IsoTimestamp;
  approvedAt: IsoTimestamp;
  approvedBy: string;
  effectiveAt: IsoTimestamp;
  supersedesDirectiveId: string | null;
};

export type PrivacyState = {
  targetType: PrivacyTargetType;
  targetId: string;
  directiveId: string | null;
  action: PrivacyAction | "none";
  contentVisible: boolean;
  exportAllowed: boolean;
  reasonCode: PrivacyDirective["reasonCode"] | null;
  effectiveAt: IsoTimestamp | null;
};

export const connectorExecutionOutcomes = [
  "succeeded",
  "upstream-failure",
  "ingestion-rejected",
  "connector-error"
] as const;
export type ConnectorExecutionOutcome = (typeof connectorExecutionOutcomes)[number];

export type ConnectorExecutionPayload = {
  executionVersion: "openfield.connector-execution.v1";
  executionId: string;
  connectorId: string;
  connectorVersion: string;
  sourceId: string;
  nodeId: string;
  manifestHash: Sha256Digest;
  configurationHash: Sha256Digest;
  startedAt: IsoTimestamp;
  finishedAt: IsoTimestamp;
  outcome: ConnectorExecutionOutcome;
  batchId: string | null;
  requestCount: number;
  upstreamStatuses: number[];
  artifactCount: number;
  recordCount: number;
  errorCode: string | null;
  errorDigest: Sha256Digest | null;
  userAgent: string | null;
};

export type SignedConnectorExecution = {
  payload: ConnectorExecutionPayload;
  payloadHash: Sha256Digest;
  signature: ReceiptSignature;
};

export type ConnectorExecutionQuery = {
  connectorId?: string;
  sourceId?: string;
  outcome?: ConnectorExecutionOutcome;
  knownAt?: IsoTimestamp;
  limit?: number;
};
