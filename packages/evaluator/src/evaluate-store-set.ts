import type { QualityIssue, QualityReport, RenderedAsset, ScreenPlan } from "@app-screenshot-ai/schemas";

export type EvaluateStoreSetInput = {
  assets: RenderedAsset[];
  screens: ScreenPlan[];
};

export class EvaluateStoreSetUseCase {
  execute(input: EvaluateStoreSetInput): QualityReport {
    const issues: QualityIssue[] = [];

    for (const asset of input.assets) {
      if (asset.store === "app-store" && asset.device === "iphone-6.9" && (asset.width !== 1320 || asset.height !== 2868)) {
        issues.push({
          code: "invalid_app_store_iphone_6_9_dimensions",
          severity: "error",
          message: "App Store iPhone 6.9 screenshots must be 1320x2868.",
          screenId: asset.id,
        });
      }
    }

    for (const screen of input.screens) {
      if (wordCount(screen.headline) > 8) {
        issues.push({
          code: "headline_too_long",
          severity: "warning",
          message: "Keep screenshot headlines at 8 words or fewer.",
          screenId: screen.id,
        });
      }
    }

    const distinctTreatments = new Set(input.screens.map((screen) => screen.treatment ?? "hero-device"));
    if (input.screens.length >= 5 && distinctTreatments.size < 3) {
      issues.push({
        code: "too_little_layout_diversity",
        severity: "warning",
        message: "Use at least 3 distinct screenshot treatments across a 5-screen set.",
      });
    }

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.filter((issue) => issue.severity === "warning").length;
    const campaignWarningCount = issues.filter((issue) => issue.code === "too_little_layout_diversity").length;

    return {
      passed: errorCount === 0,
      scores: {
        storeCompliance: errorCount === 0 ? 1 : 0,
        textQuality: Math.max(0, 1 - warningCount * 0.2),
        campaignConsistency: Math.max(0, 1 - campaignWarningCount * 0.25),
      },
      issues,
    };
  }
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
