import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary, PremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import { RenderSceneSetUseCase, RenderStoreSetUseCase } from "@app-screenshot-ai/render-engine";
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
  type BrandKit,
  type ProductUnderstanding,
  type PremiumRecipe,
  type SceneSet,
  StoryboardSchema,
} from "@app-screenshot-ai/schemas";

import { CheckInputReadinessUseCase } from "../input-readiness";
import { BuildPremiumCandidateSceneSetsUseCase, BuildPremiumProjectContextUseCase } from "../premium-planning";
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
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
  premiumRecipes: PremiumRecipe[];
  premiumCandidates: Array<{ variant: string; sceneSet: SceneSet; qualityReport: QualityReport }>;
  sceneSet?: SceneSet;
};

export class GenerateStorePackUseCase {
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly premiumRecipeLibrary: PremiumRecipeLibrary | undefined;
  private readonly readiness = new CheckInputReadinessUseCase();
  private readonly renderer = new RenderStoreSetUseCase();
  private readonly sceneRenderer = new RenderSceneSetUseCase();
  private readonly evaluator = new EvaluateStoreSetUseCase();
  private readonly exporter = new ExportStorePackUseCase();
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;

  constructor(params: {
    modelGateway: ModelGateway;
    patternLibrary: PatternLibrary;
    premiumRecipeLibrary?: PremiumRecipeLibrary;
    sourceScreenshotLoader?: SourceScreenshotLoaderPort;
  }) {
    this.modelGateway = params.modelGateway;
    this.patternLibrary = params.patternLibrary;
    this.premiumRecipeLibrary = params.premiumRecipeLibrary;
    this.sourceScreenshotLoader = params.sourceScreenshotLoader;
  }

  async execute(params: GenerateStorePackInput): Promise<GenerateStorePackResult> {
    const readiness = await this.readiness.execute(params.input);
    if (!readiness.canGenerate) throw new GenerateStorePackError(readiness);

    const patterns = this.patternLibrary.retrieve({ category: params.input.category, tone: [] });
    const premiumContext = await new BuildPremiumProjectContextUseCase().execute({ input: params.input });
    const premiumRecipes = this.premiumRecipeLibrary?.retrieve({
      category: params.input.category,
      tone: premiumContext.brandKit.tone,
    }) ?? [];
    const premiumCandidates = premiumRecipes[0]
      ? new BuildPremiumCandidateSceneSetsUseCase()
          .execute({
            brandKit: premiumContext.brandKit,
            productUnderstanding: premiumContext.productUnderstanding,
            recipe: premiumRecipes[0],
          })
          .map((candidate) => ({
            variant: candidate.variant,
            sceneSet: candidate.sceneSet,
            qualityReport: this.evaluator.execute({ assets: [], screens: [], sceneSet: candidate.sceneSet }),
          }))
      : [];
    const sceneSet = selectBestPremiumCandidate(premiumCandidates)?.sceneSet;

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
    const storyboard = sceneSet
      ? compileSceneSetStoryboard(sceneSet, premiumContext.productUnderstanding)
      : storyboardResult.object;

    const loadSourceScreenshot = this.sourceScreenshotLoader
      ? (sourcePath: string) => this.sourceScreenshotLoader!.load(sourcePath)
      : undefined;
    const assets: RenderedAsset[] = sceneSet
      ? await this.sceneRenderer.execute({
          sceneSet,
          productUnderstanding: premiumContext.productUnderstanding,
          target: params.target,
          ...(loadSourceScreenshot ? { loadSourceScreenshot } : {}),
        })
      : await this.renderer.execute({
          visualSystem: visualSystemResult.object,
          storyboard,
          target: params.target,
          ...(loadSourceScreenshot ? { loadSourceScreenshot } : {}),
        });

    const qualityReport = this.evaluator.execute({
      assets,
      screens: storyboard.screens,
      ...(sceneSet ? { sceneSet } : {}),
    });
    const exported = await this.exporter.execute({ assets });

    return {
      readiness,
      patterns,
      visualSystem: visualSystemResult.object,
      storyboard,
      assets,
      qualityReport,
      exportManifest: exported.manifest,
      zipBytes: exported.zipBytes,
      brandKit: premiumContext.brandKit,
      productUnderstanding: premiumContext.productUnderstanding,
      premiumRecipes,
      premiumCandidates,
      ...(sceneSet ? { sceneSet } : {}),
    };
  }
}

function compileSceneSetStoryboard(sceneSet: SceneSet, productUnderstanding: ProductUnderstanding): Storyboard {
  const sourcePathsByScreenshotId = new Map(
    productUnderstanding.screenInventory.map((screen) => [screen.screenshotId, screen.sourcePath]),
  );
  const fallbackPath = productUnderstanding.screenInventory[0]?.sourcePath ?? "input/screenshot.png";

  return StoryboardSchema.parse({
    screens: sceneSet.scenes.map((scene) => {
      const primaryDevice = scene.devices[0];
      const secondaryDevice = scene.devices[1];
      const primaryPath = primaryDevice ? sourcePathsByScreenshotId.get(primaryDevice.screenshotId) ?? fallbackPath : fallbackPath;
      const secondaryPath = secondaryDevice ? sourcePathsByScreenshotId.get(secondaryDevice.screenshotId) ?? fallbackPath : undefined;

      return {
        id: scene.id,
        index: scene.index,
        role: scene.role,
        headline: scene.copy.headline,
        ...(scene.copy.subheadline ? { subheadline: scene.copy.subheadline } : {}),
        treatment: treatmentForComposition(scene.composition),
        sourceScreenshotPath: primaryPath,
        ...(secondaryPath ? { secondarySourceScreenshotPath: secondaryPath } : {}),
        device: {
          scale: primaryDevice?.scale,
          tilt: primaryDevice?.tilt,
          crop: primaryDevice?.crop,
        },
        callouts: scene.callouts,
      };
    }),
  });
}

function treatmentForComposition(composition: SceneSet["scenes"][number]["composition"]): Storyboard["screens"][number]["treatment"] {
  if (composition === "split-devices" || composition === "proof-poster") return "premium-proof-card";
  if (composition === "object-led") return "cinematic-poster";
  if (composition === "panoramic-sequence") return "map-route-editorial";
  if (composition === "cropped-edge-device" || composition === "before-after") return "callout-zoom";
  return "hero-device";
}

function selectBestPremiumCandidate(
  candidates: Array<{ variant: string; sceneSet: SceneSet; qualityReport: QualityReport }>,
): { variant: string; sceneSet: SceneSet; qualityReport: QualityReport } | undefined {
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
