import { describe, expect, it } from "vitest";
import { syntheticDataCenterHealth, syntheticDataCenterSource } from "@/lib/source-registry";
import { assessSourceHealth } from "@/lib/source-health";

describe("source health", () => {
  it("marks an on-time source healthy", () => {
    const result = assessSourceHealth(
      syntheticDataCenterSource,
      syntheticDataCenterHealth,
      new Date("2026-07-30T20:00:00.000Z")
    );
    expect(result.state).toBe("healthy");
    expect(result.freshness).toBeGreaterThan(0.8);
  });

  it("marks repeated collection failures offline", () => {
    const result = assessSourceHealth(
      syntheticDataCenterSource,
      { ...syntheticDataCenterHealth, consecutiveFailures: 3 },
      new Date("2026-07-30T20:00:00.000Z")
    );
    expect(result.state).toBe("offline");
    expect(result.freshness).toBe(0);
  });
});
