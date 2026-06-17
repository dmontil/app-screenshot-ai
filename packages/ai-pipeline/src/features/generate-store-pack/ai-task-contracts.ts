import {
  StoryboardSchema,
  VisualSystemSchema,
  type AppInput,
  type DesignPattern,
  type LandingPageContext,
  type Storyboard,
  type VisualSystem,
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
    outputContract: TOutputContract;
  };
  fixture: () => z.infer<TSchema>;
};

export function visualSystemTaskContract(params: {
  app: AppInput;
  patterns: DesignPattern[];
  landingPage?: LandingPageContext;
}): AiTaskContract<typeof VisualSystemSchema, ReturnType<typeof visualSystemOutputContract>> {
  return {
    task: "visual-system.generate",
    schema: VisualSystemSchema,
    input: {
      app: params.app,
      patterns: params.patterns,
      ...(params.landingPage ? { landingPage: params.landingPage } : {}),
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
}): AiTaskContract<typeof StoryboardSchema, ReturnType<typeof storyboardOutputContract>> {
  return {
    task: "storyboard.generate",
    schema: StoryboardSchema,
    input: {
      app: params.app,
      visualSystem: params.visualSystem,
      patterns: params.patterns,
      ...(params.landingPage ? { landingPage: params.landingPage } : {}),
      outputContract: storyboardOutputContract(params.app.screenshots.map((screenshot) => screenshot.path)),
    },
    fixture: () => fixtureStoryboard(params.app.screenshots.map((screenshot) => screenshot.path)),
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
      "Do not include markdown fences or comments.",
    ],
  };
}

function storyboardOutputContract(sourceScreenshotPaths: string[]) {
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
      "Return exactly 5 screens.",
      "Return only valid JSON matching requiredJsonShape.",
      "Use at least 3 different treatments across the 5 screens.",
      "Allowed treatments: map-route-editorial, premium-proof-card, cinematic-poster, callout-zoom, hero-device.",
      "Each headline must be 8 words or fewer.",
      "Use landingPage headline/description as product context when it is provided, but keep every screenshot headline under 8 words.",
      "Use only sourceScreenshotPath and secondarySourceScreenshotPath values from the provided app.screenshots list.",
      "Use secondarySourceScreenshotPath on 1-2 screens where showing two app moments increases clarity; do not use it on every screen.",
      "Indexes must be 1 through 5.",
      "Do not include markdown fences or comments.",
    ],
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

function fixtureStoryboard(sourceScreenshotPaths: string[]): Storyboard {
  const source = (index: number) => sourceScreenshotPaths[index] ?? sourceScreenshotPaths[0] ?? "input/screenshot.png";
  return {
    screens: [
      { id: "hook", index: 1, role: "hook", headline: "Turn ideas into screenshots", treatment: "map-route-editorial", sourceScreenshotPath: source(0) },
      { id: "search", index: 2, role: "search", headline: "Highlight your core workflow", treatment: "premium-proof-card", sourceScreenshotPath: source(1) },
      { id: "value", index: 3, role: "value", headline: "Show what users get done", treatment: "callout-zoom", sourceScreenshotPath: source(2) },
      { id: "map", index: 4, role: "map", headline: "Keep every screen consistent", treatment: "map-route-editorial", sourceScreenshotPath: source(0) },
      { id: "save", index: 5, role: "save", headline: "Export a store pack", treatment: "cinematic-poster", sourceScreenshotPath: source(1) },
    ],
  };
}
