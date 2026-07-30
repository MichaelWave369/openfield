import { describe, expect, it } from "vitest";
import { canonicalJson } from "@/lib/canonical-json";

describe("canonicalJson", () => {
  it("orders object keys recursively", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } }))
      .toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalJson({ score: Number.NaN })).toThrow("Non-finite number");
  });
});
