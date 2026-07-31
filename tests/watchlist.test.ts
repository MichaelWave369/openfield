import { describe, expect, it } from "vitest";
import {
  createCompanyWatch,
  createDocumentSelection,
  normalizeAccessionNumber,
  secArchiveDocumentUrl
} from "@/lib/watchlist";

 describe("mission watchlist", () => {
  it("normalizes CIK and SEC archive identifiers", () => {
    const watch = createCompanyWatch({
      watchId: "watch:1",
      label: "Example Compute",
      cik: "1234",
      createdAt: "2026-07-30T23:45:00.000Z",
      createdBy: "operator"
    });
    expect(watch.cik).toBe("0000001234");
    expect(normalizeAccessionNumber("0000001234-26-000001")).toBe("0000001234-26-000001");
    expect(secArchiveDocumentUrl(watch.cik as string, "0000001234-26-000001", "example8k.htm"))
      .toBe("https://www.sec.gov/Archives/edgar/data/1234/000000123426000001/example8k.htm");
  });

  it("rejects unsafe document paths", () => {
    expect(() => createDocumentSelection({
      selectionId: "selection:1", missionId: "data-center-watch", watchId: "watch:1",
      cik: "1234", accessionNumber: "0000001234-26-000001", primaryDocument: "../secret.htm",
      form: "8-K", filedAt: "2026-07-30T00:00:00.000Z", reason: "review",
      selectedAt: "2026-07-30T23:45:00.000Z", selectedBy: "operator"
    })).toThrow(/safe archive filename/);
  });
});
