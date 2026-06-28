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

    const premium = input.sceneSet ? evaluatePremiumSceneSet(input.sceneSet, input.screens) : undefined;
    if (premium && premium.score < 0.72) {
      issues.push({
        code: "premium_scene_set_needs_more_depth",
        severity: "warning",
        message: "Premium screenshot sets need stronger composition diversity, object depth, device richness, and continuity.",
      });
    }
    if (premium && (premium.benefitClarity ?? 1) < 0.72) {
      issues.push({
        code: "premium_scene_set_lacks_benefit_led_copy",
        severity: "warning",
        message: "Top App Store screenshots need short, benefit-led headlines with strong action/value verbs.",
      });
    }
    if (premium && (premium.screenshotPairing ?? 1) < 0.72) {
      issues.push({
        code: "premium_scene_set_reuses_too_few_source_screenshots",
        severity: "warning",
        message: "A premium 5-screen set should usually demonstrate at least 3 distinct app screens and cover multiple roles.",
      });
    }
    if (premium && (premium.proofSignal ?? 1) < 0.72) {
      issues.push({
        code: "premium_scene_set_missing_proof_signal",
        severity: "warning",
        message: "Add at least one proof/rating/trust/result frame so the set sells credibility, not just features.",
      });
    }
    if (premium && premium.rating !== "top-1-percent-candidate") {
      issues.push({
        code: "premium_scene_set_not_top_one_percent_ready",
        severity: "warning",
        message: "This set may be marketable, but it has not cleared the stricter top-1% ASO quality bar.",
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

function evaluatePremiumSceneSet(sceneSet: SceneSet, screens: ScreenPlan[]): NonNullable<QualityReport["premium"]> {
  const scenes = sceneSet.scenes;
  const sceneCount = Math.max(1, scenes.length);
  const headlineInputs = screens.length > 0
    ? screens.map((screen) => ({ headline: screen.headline, subheadline: screen.subheadline }))
    : scenes.map((scene) => ({ headline: scene.copy.headline, subheadline: scene.copy.subheadline }));

  const compositionDiversity = Math.min(1, new Set(scenes.map((scene) => scene.composition)).size / Math.min(5, sceneCount));
  const objectDepth = Math.min(1, scenes.reduce((total, scene) => total + scene.objects.length, 0) / (sceneCount * 1.8));
  const deviceRichness = scenes.filter((scene) => scene.devices.length > 1 || scene.devices.some((device) => device.crop !== "full" || Math.abs(device.tilt) >= 6)).length / sceneCount;
  const continuity = Math.min(1, (
    (sceneSet.continuity.recurringObjects.length > 0 ? 0.4 : 0) +
    (sceneSet.continuity.deviceTreatment === "progressive" ? 0.3 : 0.15) +
    (sceneSet.continuity.sharedBackground !== "solid" ? 0.3 : 0.1)
  ));
  const benefitClarity = average(headlineInputs.map(({ headline }) => scoreBenefitHeadline(headline)));
  const thumbnailReadability = average(headlineInputs.map(({ headline, subheadline }) => scoreThumbnailReadability(headline, subheadline)));
  const screenshotPairing = scoreScreenshotPairing(sceneSet);
  const proofSignal = scoreProofSignal(sceneSet);

  const rawScore =
    compositionDiversity * 0.16 +
    objectDepth * 0.13 +
    deviceRichness * 0.13 +
    continuity * 0.12 +
    benefitClarity * 0.16 +
    screenshotPairing * 0.12 +
    proofSignal * 0.10 +
    thumbnailReadability * 0.08;
  const gatedScore = clearsTopOnePercentGates({
    compositionDiversity,
    objectDepth,
    deviceRichness,
    continuity,
    benefitClarity,
    screenshotPairing,
    proofSignal,
    thumbnailReadability,
  })
    ? rawScore
    : Math.min(0.94, rawScore);
  const score = round2(gatedScore);

  return {
    score,
    rating: premiumRating(score),
    compositionDiversity: round2(compositionDiversity),
    objectDepth: round2(objectDepth),
    deviceRichness: round2(deviceRichness),
    continuity: round2(continuity),
    benefitClarity: round2(benefitClarity),
    screenshotPairing: round2(screenshotPairing),
    proofSignal: round2(proofSignal),
    thumbnailReadability: round2(thumbnailReadability),
  };
}

function scoreBenefitHeadline(headline: string): number {
  const words = wordsFor(headline);
  const firstWord = words[0]?.toLowerCase() ?? "";
  const lengthScore = words.length <= 6 ? 0.42 : words.length <= 8 ? 0.30 : 0.08;
  const actionScore = actionVerbs.has(firstWord) ? 0.40 : valueWords.has(firstWord) ? 0.24 : 0.10;
  const specificityScore = genericHeadlineFragments.some((fragment) => headline.toLowerCase().includes(fragment)) ? 0.04 : 0.18;
  return Math.min(1, lengthScore + actionScore + specificityScore);
}

function scoreThumbnailReadability(headline: string, subheadline: string | undefined): number {
  const headlineWords = wordsFor(headline).length;
  const subheadlineWords = wordsFor(subheadline ?? "").length;
  const headlineScore = headlineWords <= 6 ? 0.65 : headlineWords <= 8 ? 0.48 : 0.18;
  const subheadlineScore = subheadlineWords === 0 ? 0.18 : subheadlineWords <= 12 ? 0.25 : subheadlineWords <= 16 ? 0.16 : 0.04;
  return Math.min(1, headlineScore + subheadlineScore + 0.10);
}

function scoreScreenshotPairing(sceneSet: SceneSet): number {
  const devices = sceneSet.scenes.flatMap((scene) => scene.devices);
  if (devices.length === 0) return 0;

  const uniqueScreens = new Set(devices.map((device) => device.screenshotId));
  const minimumDistinctScreens = Math.min(3, devices.length);
  const varietyScore = Math.min(1, uniqueScreens.size / minimumDistinctScreens) * 0.45;
  const roleCoverage = new Set(sceneSet.scenes.map((scene) => scene.role));
  const roleScore = Math.min(1, roleCoverage.size / Math.min(5, sceneSet.scenes.length)) * 0.35;
  const mostReusedCount = Math.max(...Array.from(uniqueScreens, (id) => devices.filter((device) => device.screenshotId === id).length));
  const reuseScore = mostReusedCount / devices.length <= 0.55 ? 0.20 : 0.08;
  return varietyScore + roleScore + reuseScore;
}

function scoreProofSignal(sceneSet: SceneSet): number {
  const proofScenes = sceneSet.scenes.filter((scene) => scene.role === "proof" || scene.composition === "proof-poster");
  const candidates = proofScenes.length > 0 ? proofScenes : sceneSet.scenes;
  const proofCount = candidates.filter((scene) => {
    const copy = `${scene.copy.headline} ${scene.copy.subheadline ?? ""} ${scene.copy.badge ?? ""}`.toLowerCase();
    return Boolean(scene.copy.badge) || scene.objects.some((object) => object.kind === "badge") || proofWords.some((word) => copy.includes(word));
  }).length;
  return Math.min(1, proofCount / Math.max(1, candidates.length));
}

function clearsTopOnePercentGates(scores: {
  compositionDiversity: number;
  objectDepth: number;
  deviceRichness: number;
  continuity: number;
  benefitClarity: number;
  screenshotPairing: number;
  proofSignal: number;
  thumbnailReadability: number;
}): boolean {
  return scores.compositionDiversity >= 0.8 &&
    scores.objectDepth >= 0.75 &&
    scores.deviceRichness >= 0.8 &&
    scores.continuity >= 0.8 &&
    scores.benefitClarity >= 0.82 &&
    scores.screenshotPairing >= 0.78 &&
    scores.proofSignal >= 0.8 &&
    scores.thumbnailReadability >= 0.82;
}

function average(values: number[]): number {
  if (values.length === 0) return 1;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function wordsFor(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

const actionVerbs = new Set([
  "add", "boost", "build", "compare", "create", "discover", "find", "follow", "get", "identify", "learn", "make", "map", "monitor", "move", "plan", "play", "record", "save", "search", "share", "start", "track", "turn", "visualize",
]);

const valueWords = new Set(["trusted", "secure", "faster", "clear", "simple", "smarter", "stronger", "better", "proof", "progress"]);

const proofWords = ["4.", "5.", "rated", "award", "trusted", "trust", "secure", "proof", "million", "users", "progress", "result", "score"];

const genericHeadlineFragments = ["show the core", "start with confidence", "see the difference", "proof users can trust", "core workflow"];

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
