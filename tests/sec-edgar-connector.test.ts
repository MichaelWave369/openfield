import { describe, expect, it } from "vitest";
import { SecEdgarSubmissionsConnector } from "@/connectors/sec-edgar/submissions";

const payload = {
  cik: "1652044",
  name: "Example Infrastructure Corp",
  tickers: ["EXM"],
  exchanges: ["Nasdaq"],
  filings: {
    recent: {
      accessionNumber: ["0001652044-26-000001", "0001652044-26-000002"],
      filingDate: ["2026-07-29", "2026-07-28"],
      reportDate: ["2026-07-28", "2026-06-30"],
      acceptanceDateTime: ["2026-07-29T16:30:00.000Z", "2026-07-28T12:00:00.000Z"],
      form: ["8-K", "4"],
      primaryDocument: ["example-8k.htm", "ownership.xml"],
      primaryDocDescription: ["Current report", "Ownership report"]
    }
  }
};

describe("SEC EDGAR submissions connector", () => {
  it("preserves exact public response bytes and emits only direct filing observations", async () => {
    const raw = JSON.stringify(payload);
    let userAgent = "";
    const connector = new SecEdgarSubmissionsConnector({
      cik: "1652044",
      userAgent: "ParallaxOpenField/0.3 admin@example.org",
      now: () => new Date("2026-07-30T23:00:00.000Z"),
      sleep: async () => undefined,
      fetchFn: async (_input, init) => {
        userAgent = String((init?.headers as Record<string, string>)["User-Agent"]);
        return {
          ok: true,
          status: 200,
          arrayBuffer: async () => new TextEncoder().encode(raw).buffer
        };
      }
    });
    const batch = await connector.collect();
    expect(userAgent).toContain("admin@example.org");
    expect(batch.manifest.source.synthetic).toBe(false);
    expect(batch.artifacts).toHaveLength(1);
    expect(new TextDecoder().decode(batch.artifacts[0].bytes)).toBe(raw);
    expect(batch.records).toHaveLength(1);
    expect(batch.records[0].kind).toBe("observation");
    expect(batch.records[0].title).toContain("filed 8-K");
    expect(batch.records[0].summary).toContain("has not inferred");
    expect(batch.telemetry?.requestCount).toBe(1);
  });

  it("records an explicit upstream failure and emits no stale observations", async () => {
    const connector = new SecEdgarSubmissionsConnector({
      cik: "1652044",
      userAgent: "ParallaxOpenField/0.3 admin@example.org",
      now: () => new Date("2026-07-30T23:00:00.000Z"),
      sleep: async () => undefined,
      fetchFn: async () => ({
        ok: false,
        status: 429,
        arrayBuffer: async () => new ArrayBuffer(0)
      })
    });
    const batch = await connector.collect();
    expect(batch.records).toEqual([]);
    expect(batch.artifacts).toEqual([]);
    expect(batch.health.lastSuccessAt).toBeNull();
    expect(batch.health.upstreamStatus).toBe(429);
  });
});
