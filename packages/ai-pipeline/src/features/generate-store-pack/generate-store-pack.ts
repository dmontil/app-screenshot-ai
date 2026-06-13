import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { RenderStoreSetUseCase } from "@app-screenshot-ai/render-engine";
import {
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
import { storyboardTaskContract, visualSystemTaskContract } from "./ai-task-contracts";

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

    const visualSystemContract = visualSystemTaskContract({ app: params.input, patterns });
    const visualSystemResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: visualSystemContract.task,
      schema: visualSystemContract.schema,
      input: visualSystemContract.input,
    });

    const storyboardContract = storyboardTaskContract({ app: params.input, patterns, visualSystem: visualSystemResult.object });
    const storyboardResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: storyboardContract.task,
      schema: storyboardContract.schema,
      input: storyboardContract.input,
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
