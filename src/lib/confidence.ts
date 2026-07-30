export type ConfidenceVector = {
  sourceReliability: number;
  directness: number;
  corroboration: number;
  independence: number;
  freshness: number;
  contradictionPenalty: number;
  uncertainty: number;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateConfidence(vector: ConfidenceVector) {
  const value = Object.fromEntries(Object.entries(vector).map(([key, item]) => [key, clamp01(item)])) as ConfidenceVector;
  const base = 0.25 * value.sourceReliability + 0.2 * value.directness + 0.2 * value.corroboration + 0.15 * value.independence + 0.2 * value.freshness;
  const penalty = 0.35 * value.contradictionPenalty + 0.25 * value.uncertainty;
  return { base: clamp01(base), penalty: clamp01(penalty), score: clamp01(base * (1 - penalty)) };
}

export function confidenceLabel(score: number) {
  const value = clamp01(score);
  if (value < 0.35) return "low";
  if (value < 0.55) return "guarded";
  if (value < 0.75) return "moderate";
  return "high";
}
