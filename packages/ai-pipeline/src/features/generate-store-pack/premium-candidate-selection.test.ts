import { describe, expect, it } from "vitest";

import type { QualityReport, SceneSet } from "@app-screenshot-ai/schemas";

import { selectBestPremiumCandidate, type PremiumCandidateSelectionInput } from "./premium-candidate-selection";

function quality(score: number): QualityReport {
  return {
    passed: true,
    scores: { storeCompliance: 1, textQuality: 1, campaignConsistency: 1 },
    premium: {
      score,
      rating: "premium-candidate",
      compositionDiversity: 1,
      objectDepth: 1,
      deviceRichness: 1,
      continuity: 1,
    },
    issues: [],
  };
}

function candidate(variant: string, score: number): PremiumCandidateSelectionInput {
  return { variant, qualityReport: quality(score), sceneSet: { id: variant } as SceneSet };
}

describe("selectBestPremiumCandidate", () => {
  it("selects the candidate with the highest premium score", () => {
    expect(selectBestPremiumCandidate([
      candidate("director-cut", 0.72),
      candidate("balanced", 0.91),
    ])?.variant).toBe("balanced");
  });

  it("uses variant priority as the tie breaker", () => {
    expect(selectBestPremiumCandidate([
      candidate("dark-premium", 0.8),
      candidate("split-heavy", 0.8),
      candidate("director-cut", 0.8),
    ])?.variant).toBe("director-cut");
  });

  it("returns undefined when there are no candidates", () => {
    expect(selectBestPremiumCandidate([])).toBeUndefined();
  });
});
