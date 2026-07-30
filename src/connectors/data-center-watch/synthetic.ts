import type { ConnectorBatch, ConnectorManifest, OpenFieldConnector } from "@/domain/connectors";
import { syntheticDataCenterHealth, syntheticDataCenterSource } from "@/lib/source-registry";

const collectedAt = "2026-07-30T16:00:00.000Z";
const fixture = {
  permitId: "SYN-DC-369",
  applicant: "Synthetic East Development LLC",
  description: "Multi-building technology campus preliminary site review",
  status: "preliminary-review",
  coordinates: [-84.5, 38.1],
  synthetic: true
};

export const syntheticDataCenterManifest: ConnectorManifest = {
  connectorId: "connector.data-center-watch.synthetic-planning",
  connectorVersion: "0.2.0",
  source: syntheticDataCenterSource,
  collectionMethod: "bundled deterministic fixture",
  rateLimitDescription: "not applicable; no external requests",
  failureBehavior: "emit-explicit-health-only"
};

export class SyntheticDataCenterConnector implements OpenFieldConnector {
  readonly manifest = syntheticDataCenterManifest;

  async collect(): Promise<ConnectorBatch> {
    const bytes = new TextEncoder().encode(JSON.stringify(fixture));
    return {
      batchId: "batch:synthetic-data-center:2026-07-30",
      collectedAt,
      manifest: this.manifest,
      artifacts: [{
        sourceRecordId: fixture.permitId,
        mediaType: "application/json",
        bytes,
        collectedAt,
        observedAt: collectedAt,
        validFrom: collectedAt,
        validTo: null,
        transformations: []
      }],
      records: [{
        recordId: "record:synthetic-permit:2026-07-30:v1",
        recordKey: "synthetic-permit:SYN-DC-369",
        missionId: "data-center-watch",
        kind: "observation",
        title: "Large-load site plan enters preliminary review",
        summary: "A synthetic planning record describes a multi-building technology campus entering preliminary review.",
        location: { type: "Point", coordinates: fixture.coordinates as [number, number] },
        validFrom: collectedAt,
        validTo: null,
        recordedAt: collectedAt,
        supersedesRecordId: null,
        artifactIndex: 0,
        dependencyRecordIds: [],
        confidence: {
          sourceReliability: 0.92,
          directness: 0.94,
          corroboration: 0.55,
          independence: 0.7,
          freshness: 1,
          contradictionPenalty: 0.08,
          uncertainty: 0.18
        },
        synthetic: true
      }],
      health: syntheticDataCenterHealth
    };
  }
}
