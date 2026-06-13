import type { PremiumQualityRating, QualityIssue, QualityReport, RenderedAsset, SceneSet, ScreenPlan } from "@app-screenshot-ai/schemas";

export type EvaluateStoreSetInput = {
  assets: RenderedAsset[];
  screens: ScreenPlan[];
  sceneSet?: SceneSet;
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

    const premium = input.sceneSet ? evaluatePremiumSceneSet(input.sceneSet) : undefined;
    if (premium && premium.score < 0.72) {
      issues.push({
        code: "premium_scene_set_needs_more_depth",
        severity: "warning",
        message: "Premium screenshot sets need stronger composition diversity, object depth, device richness, and continuity.",
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
      ...(premium ? { premium } : {}),
      issues,
    };
  }
}

function evaluatePremiumSceneSet(sceneSet: SceneSet): NonNullable<QualityReport["premium"]> {
  const scenes = sceneSet.scenes;
  const sceneCount = Math.max(1, scenes.length);
  const compositionDiversity = Math.min(1, new Set(scenes.map((scene) => scene.composition)).size / Math.min(5, sceneCount));
  const objectDepth = scenes.filter((scene) => scene.objects.length > 0).length / sceneCount;
  const deviceRichness = scenes.filter((scene) => scene.devices.length > 1 || scene.devices.some((device) => device.crop !== "full" || Math.abs(device.tilt) >= 6)).length / sceneCount;
  const continuity = Math.min(1, (
    (sceneSet.continuity.recurringObjects.length > 0 ? 0.4 : 0) +
    (sceneSet.continuity.deviceTreatment === "progressive" ? 0.3 : 0.15) +
    (sceneSet.continuity.sharedBackground !== "solid" ? 0.3 : 0.1)
  ));
  const deterministicScore = compositionDiversity * 0.32 + objectDepth * 0.24 + deviceRichness * 0.24 + continuity * 0.20;
  const score = round2(Math.min(0.92, deterministicScore));

  return {
    score,
    rating: premiumRating(score),
    compositionDiversity: round2(compositionDiversity),
    objectDepth: round2(objectDepth),
    deviceRichness: round2(deviceRichness),
    continuity: round2(continuity),
  };
}

function premiumRating(score: number): PremiumQualityRating {
  if (score >= 0.97) return "top-1-percent-candidate";
  if (score >= 0.82) return "premium-candidate";
  if (score >= 0.72) return "marketable";
  return "needs-iteration";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
