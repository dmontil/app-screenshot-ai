import {
  StoryboardSchema,
  StyleReferenceAnalysisSchema,
  VisualSystemSchema,
  type AppInput,
  type DesignPattern,
  type LandingPageContext,
  type Storyboard,
  type StyleReferenceAnalysis,
  type VisualSystem,
  type StandardStyleReference,
} from "@app-screenshot-ai/schemas";
import type { z } from "zod";

export type AiTaskContract<TSchema extends z.ZodType, TOutputContract> = {
  task: string;
  schema: TSchema;
  input: {
    app: AppInput;
    patterns: DesignPattern[];
    visualSystem?: VisualSystem;
    landingPage?: LandingPageContext;
    styleReference?: StandardStyleReference;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
    outputContract: TOutputContract;
  };
  fixture: () => z.infer<TSchema>;
};

export function styleReferenceAnalysisTaskContract(params: {
  app: AppInput;
  styleReference: StandardStyleReference;
}): AiTaskContract<typeof StyleReferenceAnalysisSchema, ReturnType<typeof styleReferenceAnalysisOutputContract>> {
  return {
    task: "style-reference.analyze",
    schema: StyleReferenceAnalysisSchema,
    input: {
      app: params.app,
      patterns: [],
      styleReference: params.styleReference,
      outputContract: styleReferenceAnalysisOutputContract(params.styleReference.id),
    },
    fixture: () => fixtureStyleReferenceAnalysis(params.styleReference.id),
  };
}

export function visualSystemTaskContract(params: {
  app: AppInput;
  patterns: DesignPattern[];
  landingPage?: LandingPageContext;
  styleReference?: StandardStyleReference;
  styleReferenceAnalysis?: StyleReferenceAnalysis;
}): AiTaskContract<typeof VisualSystemSchema, ReturnType<typeof visualSystemOutputContract>> {
  return {
    task: "visual-system.generate",
    schema: VisualSystemSchema,
    input: {
      app: params.app,
      patterns: params.patterns,
      ...(params.landingPage ? { landingPage: params.landingPage } : {}),
      ...(params.styleReference ? { styleReference: params.styleReference } : {}),
      ...(params.styleReferenceAnalysis ? { styleReferenceAnalysis: params.styleReferenceAnalysis } : {}),
      outputContract: visualSystemOutputContract(),
    },
    fixture: fixtureVisualSystem,
  };
}

export function storyboardTaskContract(params: {
  app: AppInput;
  patterns: DesignPattern[];
  visualSystem: VisualSystem;
  landingPage?: LandingPageContext;
  styleReference?: StandardStyleReference;
  styleReferenceAnalysis?: StyleReferenceAnalysis;
  screenCount?: number;
  includeCoverScreen?: boolean;
}): AiTaskContract<typeof StoryboardSchema, ReturnType<typeof storyboardOutputContract>> {
  return {
    task: "storyboard.generate",
    schema: StoryboardSchema,
    input: {
      app: params.app,
      visualSystem: params.visualSystem,
      patterns: params.patterns,
      ...(params.landingPage ? { landingPage: params.landingPage } : {}),
      ...(params.styleReference ? { styleReference: params.styleReference } : {}),
      ...(params.styleReferenceAnalysis ? { styleReferenceAnalysis: params.styleReferenceAnalysis } : {}),
      outputContract: storyboardOutputContract(params.app.screenshots.map((screenshot) => screenshot.path), params.screenCount ?? params.app.screenshots.length, Boolean(params.includeCoverScreen)),
    },
    fixture: () => fixtureStoryboard(params.app.screenshots.map((screenshot) => screenshot.path), params.screenCount ?? params.app.screenshots.length, Boolean(params.includeCoverScreen)),
  };
}

function styleReferenceAnalysisOutputContract(referenceId: string) {
  return {
    requiredJsonShape: fixtureStyleReferenceAnalysis(referenceId),
    constraints: [
      "Return only valid JSON matching requiredJsonShape.",
      "Analyze the selected reference image as the primary deterministic art-direction source.",
      "Describe composition, typography, colors, lighting, density, device placement, text hierarchy, decoration style, and set rhythm.",
      "Forbidden carryovers must include any reference-specific app names, copied text, logos, trademarks, characters, faces, or exact UI content.",
      "Do not infer category-specific motifs from prior examples; only use the user's app metadata and visible screenshots.",
      "Do not include markdown fences or comments.",
    ],
  };
}

function visualSystemOutputContract() {
  return {
    requiredJsonShape: fixtureVisualSystem(),
    constraints: [
      "Return only valid JSON matching requiredJsonShape.",
      "Allowed layoutFamily values: map-route-editorial, premium-proof-cards, cinematic-atlas, classic-device.",
      "For travel/literary apps prefer map-route-editorial unless another layout is clearly better.",
      "Use hex color strings.",
      "headlineWeight must be a positive integer.",
      "deviceWidthRatio must be between 0.45 and 0.75.",
      "Use the selected styleReference as the primary art direction reference; adapt its layout rhythm, depth, lighting, typography feel, icon/drawing language, and color relationships without copying its text, exact app UI, trademarked elements, or brand identity.",
      "Uploaded app screenshots and app metadata remain the source of truth for product content, copy, and screen selection.",
      "Do not mention books, literary routes, reading, or LiteraryTrip unless the user's app metadata explicitly mentions them.",
      "Do not include markdown fences or comments.",
    ],
  };
}

function storyboardOutputContract(sourceScreenshotPaths: string[], screenCount: number, includeCoverScreen: boolean) {
  return {
    requiredJsonShape: {
      screens: [
        {
          id: "hook",
          index: 1,
          role: "hook",
          headline: "Short headline under 8 words",
          subheadline: "Short supporting line",
          treatment: "map-route-editorial",
          sourceScreenshotPath: sourceScreenshotPaths[0] ?? "input/screenshot.png",
          secondarySourceScreenshotPath: sourceScreenshotPaths[1] ?? sourceScreenshotPaths[0] ?? "input/screenshot.png",
          device: { scale: 0.76, tilt: -2, crop: "default" },
          callouts: [{ label: "Core benefit", x: 0.7, y: 0.3 }],
        },
      ],
    },
    constraints: [
      `Return exactly ${screenCount} screens.`,
      includeCoverScreen ? "Screen 1 is an extra cover/hero poster. Every remaining screen must map to one uploaded source screenshot." : "Return one screen per uploaded source screenshot. Do not create extra screens.",
      "Return only valid JSON matching requiredJsonShape.",
      "Use at least 3 different treatments across the 5 screens.",
      "Allowed treatments: map-route-editorial, premium-proof-card, cinematic-poster, callout-zoom, hero-device.",
      "Each headline must be 8 words or fewer.",
      "Use landingPage headline/description as product context when it is provided, but keep every screenshot headline under 8 words.",
      "Use only sourceScreenshotPath and secondarySourceScreenshotPath values from the provided app.screenshots list.",
      "Use secondarySourceScreenshotPath on 1-2 screens where showing two app moments increases clarity; do not use it on every screen.",
      "Indexes must be 1 through 5.",
      "Write copy and screen roles for the user's app while preserving the selected styleReference's composition hierarchy, icon/drawing language, and pacing.",
      "Adapt the selected styleReference; do not copy its text, exact app UI, trademarked elements, or brand identity.",
      "Uploaded app screenshots and app metadata remain the source of truth for product content, copy, and screen selection.",
      "Do not mention books, literary routes, reading, or LiteraryTrip unless the user's app metadata explicitly mentions them.",
      "Do not include markdown fences or comments.",
    ],
  };
}

function fixtureStyleReferenceAnalysis(referenceId: string): StyleReferenceAnalysis {
  return {
    referenceId,
    visualSummary: "Bold app-store screenshot set with large display type, overlapping phones, saturated gradients, social proof details, and dense decorative UI energy.",
    layoutRhythm: ["five poster-like vertical cards", "large headline area", "phone mockup dominates each frame", "decorative objects overlap devices"],
    typographyStyle: ["bold condensed display headlines", "short high-contrast phrases", "outlined or shadowed type where useful"],
    colorAndLighting: ["bright saturated blue/purple gradients", "glossy highlights", "soft shadows", "high contrast foreground"],
    compositionRules: ["preserve the chosen reference's hierarchy", "adapt each frame to the user's product", "make the uploaded app UI the only app UI shown"],
    forbiddenCarryovers: ["reference app names", "reference text", "reference logos", "characters", "friends/social content unless the user app is social"],
  };
}

function fixtureVisualSystem(): VisualSystem {
  return {
    id: "fixture-warm-editorial-v1",
    layoutFamily: "map-route-editorial",
    motif: "route-line",
    palette: {
      background: "#F7F1E7",
      primary: "#3B2416",
      accent: "#D99A32",
      text: "#24160F",
    },
    typography: {
      headlineFamily: "Inter",
      headlineWeight: 760,
    },
    layout: {
      safeMargin: 96,
      headlineY: 180,
      deviceY: 720,
      deviceWidthRatio: 0.62,
    },
  };
}

function fixtureStoryboard(sourceScreenshotPaths: string[], screenCount: number, includeCoverScreen: boolean): Storyboard {
  const source = (index: number) => sourceScreenshotPaths[index] ?? sourceScreenshotPaths[0] ?? "input/screenshot.png";
  const roles = includeCoverScreen ? ["hook", ...sourceScreenshotPaths.map((_, index) => `screen-${index + 1}`)] : sourceScreenshotPaths.map((_, index) => `screen-${index + 1}`);
  return {
    screens: Array.from({ length: screenCount }, (_, index) => ({
      id: roles[index] ?? `screen-${index + 1}`,
      index: index + 1,
      role: roles[index] ?? "feature",
      headline: includeCoverScreen && index === 0 ? "Launch your story" : `Show screen ${includeCoverScreen ? index : index + 1}`,
      treatment: index % 3 === 0 ? "map-route-editorial" : index % 3 === 1 ? "premium-proof-card" : "callout-zoom",
      sourceScreenshotPath: source(includeCoverScreen ? Math.max(0, index - 1) : index),
    })),
  };
}
