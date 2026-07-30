import { describe, expect, it } from "vitest";
import { calculateConfidence, clamp01, confidenceLabel } from "@/lib/confidence";

const full = { sourceReliability: 1, directness: 1, corroboration: 1, independence: 1, freshness: 1, contradictionPenalty: 0, uncertainty: 0 };

describe("confidence model", () => {
  it("returns full confidence without penalties", () => expect(calculateConfidence(full).score).toBe(1));
  it("applies contradiction and uncertainty penalties", () => expect(calculateConfidence({...full, contradictionPenalty: 1, uncertainty: 1}).score).toBeCloseTo(.4));
  it("clamps invalid values", () => { expect(clamp01(-4)).toBe(0); expect(clamp01(4)).toBe(1); expect(clamp01(Number.NaN)).toBe(0); });
  it("assigns stable labels", () => { expect(confidenceLabel(.2)).toBe("low"); expect(confidenceLabel(.45)).toBe("guarded"); expect(confidenceLabel(.65)).toBe("moderate"); expect(confidenceLabel(.9)).toBe("high"); });
});
