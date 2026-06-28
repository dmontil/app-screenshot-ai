import type { QualityReport, SceneSet } from "@app-screenshot-ai/schemas";

export type PremiumCandidateSelectionInput = {
  variant: string;
  sceneSet: SceneSet;
  qualityReport: QualityReport;
};

export function selectBestPremiumCandidate(
  candidates: PremiumCandidateSelectionInput[],
): PremiumCandidateSelectionInput | undefined {
  return [...candidates].sort((a, b) => {
    const scoreDelta = (b.qualityReport.premium?.score ?? 0) - (a.qualityReport.premium?.score ?? 0);
    if (scoreDelta !== 0) return scoreDelta;
    return variantPriority(b.variant) - variantPriority(a.variant);
  })[0];
}

function variantPriority(variant: string): number {
  if (variant === "director-cut") return 5;
  if (variant === "object-rich") return 4;
  if (variant === "split-heavy") return 3;
  if (variant === "dark-premium") return 2;
  return 1;
}
