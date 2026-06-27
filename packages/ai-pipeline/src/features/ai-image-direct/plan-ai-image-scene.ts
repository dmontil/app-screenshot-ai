export type AiImageScenePlanInput = {
  appName: string;
  category: string;
  targetAudience: string;
  valueProposition: string;
  sceneType: "cover" | "feature";
  userHeadline?: string;
  userSubheadline?: string;
  userProductVisualAnchor?: string;
  userAvoidGenericCliches?: string[];
};

export type AiImageScenePlan = {
  headline: string;
  subheadline: string;
  productVisualAnchor: string;
  avoidGenericCliches: string[];
  source: "fallback" | "llm";
  prompt?: string;
  rawResponse?: unknown;
};

export class PlanAiImageSceneUseCase {
  async execute(input: AiImageScenePlanInput): Promise<AiImageScenePlan> {
    // TODO: connect to model-gateway for cheap text planning. Fallback is intentionally strong for MVP.
    return applyOverrides(fallbackScenePlan(input), input);
  }
}

export function buildScenePlanPrompt(input: AiImageScenePlanInput): string {
  return `You are planning one premium App Store / Google Play screenshot.

Given the app metadata, generate:
1. a short App Store headline, max 5 words
2. a short subheadline, max 8 words
3. one specific visual anchor for the image
4. generic clichés to avoid

The image will be generated later by an image model.
Your job is to give the image model a clear direction.

Be specific.
Avoid generic category language.
Avoid vague phrases.
Avoid fake awards, fake ratings, fake claims, and generic stock imagery.

The visual anchor must be concrete and visually useful.
It can be a buddy, object, symbol, environment, device motif, or decorative system.
It should come from the app value proposition and audience.

If the app uses a broad category like travel, finance, fitness, education or productivity, make the anchor more specific than the category.

Return only valid JSON.

App name: ${input.appName}
Category: ${input.category}
Audience: ${input.targetAudience}
Value proposition: ${input.valueProposition}
Scene type: ${input.sceneType}

JSON schema:
{
  "headline": "",
  "subheadline": "",
  "productVisualAnchor": "",
  "avoidGenericCliches": []
}`;
}

export function fallbackScenePlan(input: AiImageScenePlanInput): AiImageScenePlan {
  const text = `${input.appName} ${input.category} ${input.targetAudience} ${input.valueProposition}`.toLowerCase();
  if (/camper|rv|\bvan\b|motorhome|road trip|route|vantrip|vantrips/.test(text)) {
    return {
      headline: "Plan Perfect Routes",
      subheadline: "In minutes, not hours",
      productVisualAnchor: "friendly campervan route-planning buddy with a simple AI route map, route cards, destination pins and daily stops",
      avoidGenericCliches: [
        "animal mascot",
        "bear mascot",
        "generic hiking gear",
        "busy outdoor adventure poster",
        "random camping icons",
        "many mountains",
        "many trees",
        "fake awards",
        "rating badges",
        "laurels",
        "stars",
        "proof blocks",
        "stock travel poster",
        "floating icon row",
      ],
      source: "fallback",
    };
  }

  if (/book|books|literary|author|reading|novel|story/.test(text)) {
    return {
      headline: "Explore Places Through Books",
      subheadline: "Turn trips into literary journeys",
      productVisualAnchor: "friendly open book and map buddy, bookmark compass, literary route line, story map pins",
      avoidGenericCliches: [
        "generic school template",
        "random animals",
        "fake awards",
        "rating badges",
        "children-only style",
        "stock travel poster",
        "too many map pins",
        "overcrowded book decorations",
      ],
      source: "fallback",
    };
  }

  return {
    headline: `Discover ${input.appName}`,
    subheadline: "A better way to get started",
    productVisualAnchor: "app-specific visual buddy, object, or symbol based on the core product value",
    avoidGenericCliches: [
      "fake awards",
      "rating badges",
      "generic stock imagery",
      "unrelated mascots",
      "extra readable text",
    ],
    source: "fallback",
  };
}

function applyOverrides(generated: AiImageScenePlan, input: AiImageScenePlanInput): AiImageScenePlan {
  return {
    ...generated,
    headline: input.userHeadline || generated.headline,
    subheadline: input.userSubheadline || generated.subheadline,
    productVisualAnchor: input.userProductVisualAnchor || generated.productVisualAnchor,
    avoidGenericCliches: mergeUnique(generated.avoidGenericCliches, input.userAvoidGenericCliches ?? []),
  };
}

function mergeUnique(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b].map((item) => item.trim()).filter(Boolean)));
}
