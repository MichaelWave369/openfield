import { describe, expect, it } from "vitest";
import { SecEdgarDocumentConnector } from "@/connectors/sec-edgar/documents";
import { createDocumentSelection } from "@/lib/watchlist";

const selection = createDocumentSelection({
  selectionId: "selection:sec:1", missionId: "data-center-watch", watchId: "watch:sec:1",
  cik: "1234", accessionNumber: "0000001234-26-000001", primaryDocument: "example8k.htm",
  form: "8-K", filedAt: "2026-07-29T00:00:00.000Z", reason: "analyst selected filing",
  selectedAt: "2026-07-30T23:45:00.000Z", selectedBy: "analyst"
});

describe("SEC filing document connector", () => {
  it("preserves exact selected document bytes and emits only retrieval metadata", async () => {
    let requested = "";
    const connector = new SecEdgarDocumentConnector({
      selection,
      userAgent: "OpenField test admin@example.org",
      now: () => new Date("2026-07-30T23:46:00.000Z"),
      sleep: async () => undefined,
      fetchFn: async (input) => {
        requested = String(input);
        return {
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
          arrayBuffer: async () => new TextEncoder().encode("<html>official filing</html>").buffer
        };
      }
    });
    const batch = await connector.collect();
    expect(requested).toBe("https://www.sec.gov/Archives/edgar/data/1234/000000123426000001/example8k.htm");
    expect(batch.artifacts).toHaveLength(1);
    expect(batch.records).toHaveLength(1);
    expect(batch.records[0].summary).toContain("custody only");
    expect(batch.records[0].kind).toBe("observation");
  });

  it("emits health only when the archive request fails", async () => {
    const connector = new SecEdgarDocumentConnector({
      selection,
      userAgent: "OpenField test admin@example.org",
      sleep: async () => undefined,
      fetchFn: async () => ({
        ok: false,
        status: 503,
        headers: new Headers(),
        arrayBuffer: async () => new ArrayBuffer(0)
      })
    });
    const batch = await connector.collect();
    expect(batch.records).toHaveLength(0);
    expect(batch.artifacts).toHaveLength(0);
    expect(batch.health.message).toContain("no stale document");
  });
});
