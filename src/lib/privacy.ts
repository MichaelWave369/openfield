import type { EvidenceArtifact } from "@/domain/evidence";
import type { PrivacyDirective, PrivacyState, PrivacyTargetType } from "@/domain/trust";

function time(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ISO timestamp: ${value}`);
  return parsed;
}

export function validatePrivacyDirectives(directives: PrivacyDirective[]): void {
  const byId = new Map<string, PrivacyDirective>();
  for (const directive of directives) {
    if (byId.has(directive.directiveId)) throw new Error(`Duplicate privacy directive ${directive.directiveId}`);
    if (!directive.targetId || !directive.approvedBy || !directive.rationale.trim()) {
      throw new Error("Privacy directives require a target, approver, and rationale");
    }
    if (time(directive.approvedAt) < time(directive.requestedAt)) {
      throw new Error("Privacy approval cannot predate the request");
    }
    byId.set(directive.directiveId, directive);
  }
  for (const directive of directives) {
    if (!directive.supersedesDirectiveId) continue;
    const previous = byId.get(directive.supersedesDirectiveId);
    if (!previous) throw new Error(`Privacy directive ${directive.directiveId} supersedes an unknown directive`);
    if (previous.targetType !== directive.targetType || previous.targetId !== directive.targetId) {
      throw new Error("A privacy directive may only supersede the same target");
    }
    if (time(directive.effectiveAt) < time(previous.effectiveAt)) {
      throw new Error("A superseding privacy directive cannot become effective earlier");
    }
  }
}

export function resolvePrivacyState(
  directives: PrivacyDirective[],
  targetType: PrivacyTargetType,
  targetId: string,
  asOf: string = new Date().toISOString()
): PrivacyState {
  validatePrivacyDirectives(directives);
  const cutoff = time(asOf);
  const latest = directives
    .filter((item) => item.targetType === targetType && item.targetId === targetId && time(item.effectiveAt) <= cutoff)
    .sort((a, b) => time(a.effectiveAt) - time(b.effectiveAt) || time(a.approvedAt) - time(b.approvedAt))
    .at(-1);
  if (!latest || latest.action === "restore") {
    return {
      targetType,
      targetId,
      directiveId: latest?.directiveId ?? null,
      action: latest?.action ?? "none",
      contentVisible: true,
      exportAllowed: true,
      reasonCode: latest?.reasonCode ?? null,
      effectiveAt: latest?.effectiveAt ?? null
    };
  }
  return {
    targetType,
    targetId,
    directiveId: latest.directiveId,
    action: latest.action,
    contentVisible: latest.action !== "suppress-content",
    exportAllowed: false,
    reasonCode: latest.reasonCode,
    effectiveAt: latest.effectiveAt
  };
}

export function artifactForExport(
  artifact: EvidenceArtifact,
  state: PrivacyState
): EvidenceArtifact {
  if (state.exportAllowed) return structuredClone(artifact);
  const redacted = structuredClone(artifact);
  delete redacted.contentBase64;
  redacted.storageUri = null;
  return redacted;
}
