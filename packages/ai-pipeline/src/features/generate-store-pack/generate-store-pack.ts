import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { RenderStoreSetUseCase } from "@app-screenshot-ai/render-engine";
import {
  StoryboardSchema,
  VisualSystemSchema,
  type AppInput,
  type DesignPattern,
  type ExportManifest,
  type InputReadinessReport,
  type QualityReport,
  type RenderedAsset,
  type RenderTarget,
  type Storyboard,
  type VisualSystem,
} from "@app-screenshot-ai/schemas";

import { CheckInputReadinessUseCase } from "../input-readiness";

export class GenerateStorePackError extends Error {
  readonly code: "input_not_ready";
  readonly readiness: InputReadinessReport;

  constructor(readiness: InputReadinessReport) {
    super("Input is not ready for generation.");
    this.name = "GenerateStorePackError";
    this.code = "input_not_ready";
    this.readiness = readiness;
  }
}

export type SourceScreenshot = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
};

export type SourceScreenshotLoaderPort = {
  load(path: string): Promise<SourceScreenshot>;
};

export type GenerateStorePackInput = {
  input: AppInput;
  provider: string;
  model: string;
  target: RenderTarget;
};

export type GenerateStorePackResult = {
  readiness: InputReadinessReport;
  patterns: DesignPattern[];
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  assets: RenderedAsset[];
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
  zipBytes: Uint8Array;
};

function visualSystemOutputContract() {
  return {
    requiredJsonShape: {
      id: "unique-visual-system-id",
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
    },
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
      "Use only sourceScreenshotPath and secondarySourceScreenshotPath values from the provided app.screenshots list.",
      "Use secondarySourceScreenshotPath on 1-2 screens where showing two app moments increases clarity; do not use it on every screen.",
      "Indexes must be 1 through 5.",
      "Do not include markdown fences or comments.",
    ],
  };
}

export class GenerateStorePackUseCase {
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly readiness = new CheckInputReadinessUseCase();
  private readonly renderer = new RenderStoreSetUseCase();
  private readonly evaluator = new EvaluateStoreSetUseCase();
  private readonly exporter = new ExportStorePackUseCase();
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;

  constructor(params: {
    modelGateway: ModelGateway;
    patternLibrary: PatternLibrary;
    sourceScreenshotLoader?: SourceScreenshotLoaderPort;
  }) {
    this.modelGateway = params.modelGateway;
    this.patternLibrary = params.patternLibrary;
    this.sourceScreenshotLoader = params.sourceScreenshotLoader;
  }

  async execute(params: GenerateStorePackInput): Promise<GenerateStorePackResult> {
    const readiness = await this.readiness.execute(params.input);
    if (!readiness.canGenerate) throw new GenerateStorePackError(readiness);

    const patterns = this.patternLibrary.retrieve({ category: params.input.category, tone: [] });

    const visualSystemResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: "visual-system.generate",
      schema: VisualSystemSchema,
      input: {
        app: params.input,
        patterns,
        outputContract: visualSystemOutputContract(),
      },
    });

    const storyboardResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: "storyboard.generate",
      schema: StoryboardSchema,
      input: {
        app: params.input,
        visualSystem: visualSystemResult.object,
        patterns,
        outputContract: storyboardOutputContract(params.input.screenshots.map((screenshot) => screenshot.path)),
      },
    });

    const assets: RenderedAsset[] = await this.renderer.execute({
      visualSystem: visualSystemResult.object,
      storyboard: storyboardResult.object,
      target: params.target,
      ...(this.sourceScreenshotLoader
        ? { loadSourceScreenshot: (sourcePath: string) => this.sourceScreenshotLoader!.load(sourcePath) }
        : {}),
    });

    const qualityReport = this.evaluator.execute({ assets, screens: storyboardResult.object.screens });
    const exported = await this.exporter.execute({ assets });

    return {
      readiness,
      patterns,
      visualSystem: visualSystemResult.object,
      storyboard: storyboardResult.object,
      assets,
      qualityReport,
      exportManifest: exported.manifest,
      zipBytes: exported.zipBytes,
    };
  }
}
