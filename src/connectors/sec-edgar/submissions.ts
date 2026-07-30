import { randomUUID } from "node:crypto";
import type {
  ConnectorBatch,
  ConnectorManifest,
  OpenFieldConnector
} from "@/domain/connectors";
import type { SourceRegistration } from "@/domain/evidence";
import { canonicalJson } from "@/lib/canonical-json";
import { sha256 } from "@/lib/receipts";

type FetchResponse = Pick<Response, "ok" | "status" | "arrayBuffer">;
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<FetchResponse>;
type Sleep = (milliseconds: number) => Promise<void>;

export type SecEdgarConnectorOptions = {
  cik: string;
  userAgent: string;
  forms?: string[];
  maxRecords?: number;
  missionId?: string;
  fetchFn?: FetchLike;
  now?: () => Date;
  sleep?: Sleep;
  minimumIntervalMs?: number;
  approvedAt?: string;
};

type RecentFilings = {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  form: string[];
  primaryDocument: string[];
  primaryDocDescription: string[];
};

type SubmissionPayload = {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: { recent: RecentFilings };
};

let secQueue: Promise<void> = Promise.resolve();
let nextSecRequestAt = 0;

function normalizeCik(value: string): string {
  if (!/^\d{1,10}$/.test(value)) throw new Error("SEC CIK must contain 1 to 10 digits");
  return value.padStart(10, "0");
}

function validateUserAgent(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || !normalized.includes("@")) {
    throw new Error("SEC User-Agent must identify the application and an administrative contact email");
  }
  return normalized;
}

function strings(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`SEC submissions payload has invalid ${label}`);
  }
  return value as string[];
}

function parsePayload(bytes: Uint8Array): SubmissionPayload {
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("SEC submissions response was not valid JSON");
  }
  if (!value || typeof value !== "object") throw new Error("SEC submissions response was not an object");
  const root = value as Record<string, unknown>;
  const filings = root.filings as Record<string, unknown> | undefined;
  const recent = filings?.recent as Record<string, unknown> | undefined;
  if (!recent || typeof root.name !== "string") throw new Error("SEC submissions response lacked recent filings");
  return {
    cik: String(root.cik ?? ""),
    name: root.name,
    tickers: Array.isArray(root.tickers) ? strings(root.tickers, "tickers") : [],
    exchanges: Array.isArray(root.exchanges) ? strings(root.exchanges, "exchanges") : [],
    filings: {
      recent: {
        accessionNumber: strings(recent.accessionNumber, "accessionNumber"),
        filingDate: strings(recent.filingDate, "filingDate"),
        reportDate: strings(recent.reportDate, "reportDate"),
        acceptanceDateTime: strings(recent.acceptanceDateTime, "acceptanceDateTime"),
        form: strings(recent.form, "form"),
        primaryDocument: strings(recent.primaryDocument, "primaryDocument"),
        primaryDocDescription: strings(recent.primaryDocDescription, "primaryDocDescription")
      }
    }
  };
}

function asIsoDate(value: string, fallback: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  if (/^\d{14}$/.test(value)) {
    const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}.000Z`;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

function formMatches(form: string, allowed: string[]): boolean {
  return allowed.some((candidate) =>
    candidate.endsWith("*") ? form.startsWith(candidate.slice(0, -1)) : form === candidate
  );
}

async function scheduledRequest<T>(
  minimumIntervalMs: number,
  sleep: Sleep,
  operation: () => Promise<T>
): Promise<T> {
  let resolveResult!: (value: T | PromiseLike<T>) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  secQueue = secQueue.then(async () => {
    try {
      const wait = Math.max(0, nextSecRequestAt - Date.now());
      if (wait > 0) await sleep(wait);
      nextSecRequestAt = Date.now() + minimumIntervalMs;
      resolveResult(await operation());
    } catch (error) {
      rejectResult(error);
    }
  });
  await secQueue;
  return result;
}

export class SecEdgarSubmissionsConnector implements OpenFieldConnector {
  readonly manifest: ConnectorManifest;
  private readonly cik: string;
  private readonly userAgent: string;
  private readonly forms: string[];
  private readonly maxRecords: number;
  private readonly missionId: string;
  private readonly fetchFn: FetchLike;
  private readonly now: () => Date;
  private readonly sleep: Sleep;
  private readonly minimumIntervalMs: number;

  constructor(options: SecEdgarConnectorOptions) {
    this.cik = normalizeCik(options.cik);
    this.userAgent = validateUserAgent(options.userAgent);
    this.forms = options.forms ?? ["8-K", "10-K", "10-Q", "S-1", "424B*"];
    this.maxRecords = Math.min(100, Math.max(1, options.maxRecords ?? 25));
    this.missionId = options.missionId ?? "data-center-watch";
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    this.minimumIntervalMs = Math.max(125, options.minimumIntervalMs ?? 125);

    const source: SourceRegistration = {
      sourceId: `sec.edgar.submissions.cik.${this.cik}`,
      version: 1,
      displayName: `SEC EDGAR submissions — CIK ${this.cik}`,
      owner: "U.S. Securities and Exchange Commission",
      description: "Public company submission and filing metadata from the official SEC EDGAR submissions API.",
      accessMode: "api",
      expectedRefreshSeconds: 900,
      geographicCoverage: ["United States"],
      missions: [this.missionId],
      privacyClass: "public",
      license: {
        name: "SEC EDGAR public filing metadata; access subject to SEC fair-access policy",
        url: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
        attributionRequired: true,
        redistributionAllowed: false
      },
      synthetic: false,
      enabled: true,
      approvedAt: options.approvedAt ?? "2026-07-30T23:00:00.000Z"
    };

    this.manifest = {
      connectorId: "openfield.connector.sec-edgar-submissions",
      connectorVersion: "0.3.0",
      source,
      collectionMethod: "HTTPS GET of official data.sec.gov submissions JSON for an operator-configured CIK",
      rateLimitDescription: "Serialized requests with a minimum 125 ms interval (maximum 8 requests/second)",
      failureBehavior: "emit-explicit-health-only"
    };
  }

  async collect(): Promise<ConnectorBatch> {
    const collectedAt = this.now().toISOString();
    const started = Date.now();
    const endpoint = `https://data.sec.gov/submissions/CIK${this.cik}.json`;
    const configurationHash = sha256(canonicalJson({
      cik: this.cik,
      forms: this.forms,
      maxRecords: this.maxRecords,
      missionId: this.missionId,
      endpoint
    }));

    const failureBatch = (status: number | null, message: string): ConnectorBatch => ({
      batchId: randomUUID(),
      collectedAt,
      manifest: this.manifest,
      artifacts: [],
      records: [],
      health: {
        healthId: randomUUID(),
        sourceId: this.manifest.source.sourceId,
        checkedAt: collectedAt,
        lastAttemptAt: collectedAt,
        lastSuccessAt: null,
        consecutiveFailures: 1,
        latencyMs: Date.now() - started,
        recordsObserved: 0,
        upstreamStatus: status,
        message
      },
      telemetry: {
        requestCount: 1,
        upstreamStatuses: status === null ? [] : [status],
        userAgent: this.userAgent,
        configurationHash
      }
    });

    let response: FetchResponse;
    try {
      response = await scheduledRequest(this.minimumIntervalMs, this.sleep, () =>
        this.fetchFn(endpoint, {
          method: "GET",
          headers: {
            "User-Agent": this.userAgent,
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate"
          },
          cache: "no-store"
        })
      );
    } catch {
      return failureBatch(
        null,
        "SEC submissions request failed before an HTTP response was received."
      );
    }

    if (!response.ok) {
      return failureBatch(
        response.status,
        `SEC submissions API returned HTTP ${response.status}; no stale records were replayed.`
      );
    }

    let bytes: Uint8Array;
    let payload: SubmissionPayload;
    try {
      bytes = new Uint8Array(await response.arrayBuffer());
      payload = parsePayload(bytes);
    } catch {
      return failureBatch(
        response.status,
        "SEC submissions response could not be admitted as valid JSON; no observations were emitted."
      );
    }
    const recent = payload.filings.recent;
    const records = recent.accessionNumber
      .map((accessionNumber, index) => ({
        accessionNumber,
        form: recent.form[index] ?? "",
        filingDate: recent.filingDate[index] ?? "",
        reportDate: recent.reportDate[index] ?? "",
        acceptedAt: recent.acceptanceDateTime[index] ?? "",
        primaryDocument: recent.primaryDocument[index] ?? "",
        primaryDocDescription: recent.primaryDocDescription[index] ?? ""
      }))
      .filter((filing) => filing.accessionNumber && formMatches(filing.form, this.forms))
      .slice(0, this.maxRecords)
      .map((filing) => {
        const validFrom = asIsoDate(filing.acceptedAt || filing.filingDate, collectedAt);
        return {
          recordId: `sec:${this.cik}:${filing.accessionNumber}`,
          recordKey: `sec:${this.cik}:${filing.accessionNumber}`,
          missionId: this.missionId,
          kind: "observation" as const,
          title: `${payload.name} filed ${filing.form}`,
          summary: [
            `SEC EDGAR published filing metadata for accession ${filing.accessionNumber}`,
            `with filing date ${filing.filingDate || "not supplied"}.`,
            "This record preserves filing metadata only; OpenField has not inferred the filing's meaning or relevance."
          ].join(" "),
          location: null,
          validFrom,
          validTo: null,
          recordedAt: collectedAt,
          supersedesRecordId: null,
          artifactIndex: 0,
          dependencyRecordIds: [],
          confidence: {
            sourceReliability: 0.98,
            directness: 0.99,
            corroboration: 0.2,
            independence: 0.9,
            freshness: 0.95,
            contradictionPenalty: 0.02,
            uncertainty: 0.12
          },
          synthetic: false
        };
      });

    return {
      batchId: randomUUID(),
      collectedAt,
      manifest: this.manifest,
      artifacts: [{
        sourceRecordId: `CIK${this.cik}`,
        mediaType: "application/json",
        bytes,
        collectedAt,
        observedAt: collectedAt,
        validFrom: collectedAt,
        validTo: null,
        transformations: []
      }],
      records,
      health: {
        healthId: randomUUID(),
        sourceId: this.manifest.source.sourceId,
        checkedAt: collectedAt,
        lastAttemptAt: collectedAt,
        lastSuccessAt: collectedAt,
        consecutiveFailures: 0,
        latencyMs: Date.now() - started,
        recordsObserved: records.length,
        upstreamStatus: response.status,
        message: "Official SEC EDGAR submissions JSON collected; raw response bytes preserved before derivation."
      },
      telemetry: {
        requestCount: 1,
        upstreamStatuses: [response.status],
        userAgent: this.userAgent,
        configurationHash
      }
    };
  }
}
