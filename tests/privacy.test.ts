import { describe, expect, it } from "vitest";
import type { PrivacyDirective } from "@/domain/trust";
import { resolvePrivacyState, validatePrivacyDirectives } from "@/lib/privacy";

describe("privacy directives", () => {
  it("suppresses export without deleting custody and can be restored append-only", () => {
    const directives: PrivacyDirective[] = [
      {
        directiveId: "privacy:1", targetType: "artifact", targetId: "sha256:abc",
        action: "suppress-export", reasonCode: "source-terms", rationale: "Redistribution paused",
        requestedAt: "2026-07-30T10:00:00.000Z", approvedAt: "2026-07-30T10:05:00.000Z",
        approvedBy: "operator:mikey", effectiveAt: "2026-07-30T10:05:00.000Z",
        supersedesDirectiveId: null
      },
      {
        directiveId: "privacy:2", targetType: "artifact", targetId: "sha256:abc",
        action: "restore", reasonCode: "source-terms", rationale: "Terms confirmed",
        requestedAt: "2026-07-31T10:00:00.000Z", approvedAt: "2026-07-31T10:05:00.000Z",
        approvedBy: "operator:mikey", effectiveAt: "2026-07-31T10:05:00.000Z",
        supersedesDirectiveId: "privacy:1"
      }
    ];
    validatePrivacyDirectives(directives);
    expect(resolvePrivacyState(directives, "artifact", "sha256:abc",
      "2026-07-30T12:00:00.000Z").exportAllowed).toBe(false);
    expect(resolvePrivacyState(directives, "artifact", "sha256:abc",
      "2026-08-01T00:00:00.000Z").exportAllowed).toBe(true);
  });
});
