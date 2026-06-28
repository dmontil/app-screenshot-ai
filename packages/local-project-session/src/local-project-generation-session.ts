import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { GeneratePremiumDirectStorePackUseCase, GenerateStorePackError, GenerateStorePackUseCase, type GeneratePremiumDirectStorePackResult, type SourceScreenshotLoaderPort } from "@app-screenshot-ai/ai-pipeline";
import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary, PremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import { RenderStoreSetUseCase } from "@app-screenshot-ai/render-engine";
import type {
  AppInput,
  ExportManifest,
  InputReadinessReport,
  QualityReport,
  RenderedAsset,
  RenderTarget,
  Storyboard,
  VisualSystem,
  BrandKit,
  ProductUnderstanding,
  PremiumRecipe,
  SceneSet,
  StandardStyleReference,
} from "@app-screenshot-ai/schemas";

export type LocalProjectGenerationSessionOptions = {
  store: LocalProjectStore;
  modelGateway: ModelGateway;
  patternLibrary: PatternLibrary;
  premiumRecipeLibrary?: PremiumRecipeLibrary;
  sourceScreenshotLoader?: SourceScreenshotLoaderPort;
};

export type GenerateLocalStorePackParams = {
  projectId: string;
  input: AppInput;
  provider: string;
  model: string;
  label?: string;
  target: RenderTarget;
  styleReference: StandardStyleReference;
  imageModel?: string;
  includeCoverScreen?: boolean;
  generationMode?: "deterministic" | "premium-direct" | "benchmark";
  premiumDirectCandidateCount?: number;
};

export type RerenderLocalStorePackParams = {
  projectId: string;
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  locale: string;
  label?: string;
  persist?: boolean;
  styleReference?: StandardStyleReference;
};

export type LocalStorePackResult = {
  projectId: string;
  generationId?: string;
  provider: string;
  model: string;
  screenshots: Array<{ fileName: string; contentType: "image/png" | "image/jpeg"; bytes: Uint8Array }>;
  qualityReport: QualityReport;
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  exportManifest: ExportManifest;
  zip: { fileName: string; bytes: Uint8Array };
  localProjectPath: string;
  input?: AppInput;
  brandKit?: BrandKit;
  productUnderstanding?: ProductUnderstanding;
  premiumRecipes?: PremiumRecipe[];
  premiumCandidates?: Array<{ variant: string; sceneSet: SceneSet; qualityReport: QualityReport }>;
  sceneSet?: SceneSet;
  styleReference?: StandardStyleReference;
  generationMode?: "deterministic" | "premium-direct" | "benchmark";
  premiumDirect?: {
    selectedCandidateId: string;
    candidateCount: number;
    promptVersion: string;
  };
};

export class LocalProjectGenerationSession {
  private readonly store: LocalProjectStore;
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly premiumRecipeLibrary: PremiumRecipeLibrary | undefined;
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;

  constructor(options: LocalProjectGenerationSessionOptions) {
    this.store = options.store;
    this.modelGateway = options.modelGateway;
    this.patternLibrary = options.patternLibrary;
    this.premiumRecipeLibrary = options.premiumRecipeLibrary;
    this.sourceScreenshotLoader = options.sourceScreenshotLoader;
  }

  async rerenderStorePack(params: RerenderLocalStorePackParams): Promise<LocalStorePackResult> {
    const renderer = new RenderStoreSetUseCase();
    const assets = await renderer.execute({
      visualSystem: params.visualSystem,
      storyboard: params.storyboard,
      target: { store: "app-store", device: "iphone-6.9", locale: params.locale, width: 1320, height: 2868 },
      ...(this.sourceScreenshotLoader
        ? { loadSourceScreenshot: (sourcePath: string) => this.sourceScreenshotLoader!.load(sourcePath) }
        : {}),
    });
    const qualityReport = new EvaluateStoreSetUseCase().execute({ assets, screens: params.storyboard.screens });
    const exported = await new ExportStorePackUseCase().execute({ assets });
    const zipName = `${params.projectId}-store-pack.zip`;
    const shouldPersist = params.persist !== false;

    const styleReferenceMetadata = params.styleReference ? withoutImagePayload(params.styleReference) : undefined;
    const generation = shouldPersist
      ? await this.saveGeneration({
          projectId: params.projectId,
          kind: "manual-rerender",
          label: params.label ?? "Manual rerender",
          visualSystem: params.visualSystem,
          storyboard: params.storyboard,
          assets,
          qualityReport,
          exportManifest: exported.manifest,
          zipName,
          zipBytes: exported.zipBytes,
          ...(styleReferenceMetadata ? { styleReference: styleReferenceMetadata } : {}),
        })
      : undefined;

    return {
      projectId: params.projectId,
      ...(generation ? { generationId: generation.generationId } : {}),
      provider: "manual",
      model: "manual-rerender",
      screenshots: assets.map((asset) => ({ fileName: asset.fileName, contentType: asset.contentType, bytes: asset.bytes })),
      qualityReport,
      visualSystem: params.visualSystem,
      storyboard: params.storyboard,
      exportManifest: exported.manifest,
      zip: { fileName: zipName, bytes: exported.zipBytes },
      localProjectPath: `.local/projects/${params.projectId}`,
      ...(styleReferenceMetadata ? { styleReference: styleReferenceMetadata } : {}),
    };
  }

  async generateStorePack(params: GenerateLocalStorePackParams): Promise<LocalStorePackResult> {
    const project = await this.store.createProject({ projectId: params.projectId, input: params.input });
    const useCase = new GenerateStorePackUseCase({
      modelGateway: this.modelGateway,
      patternLibrary: this.patternLibrary,
      ...(this.premiumRecipeLibrary ? { premiumRecipeLibrary: this.premiumRecipeLibrary } : {}),
      ...(this.sourceScreenshotLoader ? { sourceScreenshotLoader: this.sourceScreenshotLoader } : {}),
    });

    try {
      if (params.generationMode === "premium-direct") {
        return await this.generatePremiumDirectStorePack({ projectDir: project.projectDir, ...params });
      }

      const result = await useCase.execute({
        input: params.input,
        provider: params.provider,
        model: params.model,
        target: params.target,
        styleReference: params.styleReference,
        ...(params.imageModel ? { imageModel: params.imageModel } : {}),
        includeCoverScreen: Boolean(params.includeCoverScreen),
      });

      const styleReferenceMetadata = withoutImagePayload(params.styleReference);

      await Promise.all([
        this.store.writeArtifact({ projectId: params.projectId, name: "input-readiness", value: result.readiness }),
        this.store.writeArtifact({ projectId: params.projectId, name: "patterns", value: result.patterns }),
        this.store.writeArtifact({ projectId: params.projectId, name: "visual-system", value: result.visualSystem }),
        this.store.writeArtifact({ projectId: params.projectId, name: "storyboard", value: result.storyboard }),
        this.store.writeArtifact({ projectId: params.projectId, name: "quality-report", value: result.qualityReport }),
        this.store.writeArtifact({ projectId: params.projectId, name: "export-manifest", value: result.exportManifest }),
        this.store.writeArtifact({ projectId: params.projectId, name: "brand-kit", value: result.brandKit }),
        this.store.writeArtifact({ projectId: params.projectId, name: "product-understanding", value: result.productUnderstanding }),
        this.store.writeArtifact({ projectId: params.projectId, name: "premium-recipes", value: result.premiumRecipes }),
        this.store.writeArtifact({ projectId: params.projectId, name: "premium-candidates", value: result.premiumCandidates }),
        this.store.writeArtifact({ projectId: params.projectId, name: "style-reference", value: styleReferenceMetadata }),
        ...(result.sceneSet ? [this.store.writeArtifact({ projectId: params.projectId, name: "scene-set", value: result.sceneSet })] : []),
      ]);

      for (const asset of result.assets) {
        await this.store.writeRender({ projectId: params.projectId, fileName: asset.fileName, bytes: asset.bytes });
      }

      const zipName = `${params.projectId}-store-pack.zip`;
      await this.store.writeExport({ projectId: params.projectId, fileName: zipName, bytes: result.zipBytes });
      const generation = await this.store.writeGeneration({
        projectId: params.projectId,
        kind: "ai-generate",
        label: params.label ?? "AI generation",
        visualSystem: result.visualSystem,
        storyboard: result.storyboard,
        assets: result.assets,
        qualityReport: result.qualityReport,
        exportManifest: result.exportManifest,
        zipFileName: zipName,
        zipBytes: result.zipBytes,
        styleReference: styleReferenceMetadata,
      });

      return {
        projectId: params.projectId,
        generationId: generation.generationId,
        provider: params.provider,
        model: params.model,
        screenshots: result.assets.map((asset) => ({
          fileName: asset.fileName,
          contentType: asset.contentType,
          bytes: asset.bytes,
        })),
        qualityReport: result.qualityReport,
        visualSystem: result.visualSystem,
        storyboard: result.storyboard,
        exportManifest: result.exportManifest,
        zip: { fileName: zipName, bytes: result.zipBytes },
        localProjectPath: project.projectDir,
        input: params.input,
        brandKit: result.brandKit,
        productUnderstanding: result.productUnderstanding,
        premiumRecipes: result.premiumRecipes,
        premiumCandidates: result.premiumCandidates,
        ...(result.sceneSet ? { sceneSet: result.sceneSet } : {}),
        styleReference: styleReferenceMetadata,
      };
    } catch (error) {
      if (error instanceof GenerateStorePackError) {
        await this.writeBlockedReadiness(params.projectId, error.readiness);
      }
      throw error;
    }
  }

  private async generatePremiumDirectStorePack(params: GenerateLocalStorePackParams & { projectDir: string }): Promise<LocalStorePackResult> {
    const useCase = new GeneratePremiumDirectStorePackUseCase({
      modelGateway: this.modelGateway,
      patternLibrary: this.patternLibrary,
      ...(this.sourceScreenshotLoader ? { sourceScreenshotLoader: this.sourceScreenshotLoader } : {}),
    });
    const result: GeneratePremiumDirectStorePackResult = await useCase.execute({
      input: params.input,
      provider: params.provider,
      model: params.model,
      imageModel: params.imageModel ?? "gpt-image-2",
      target: params.target,
      styleReference: params.styleReference,
      includeCoverScreen: Boolean(params.includeCoverScreen),
      candidateCount: params.premiumDirectCandidateCount ?? 3,
    });

    const styleReferenceMetadata = withoutImagePayload(params.styleReference);
    const zipName = `${params.projectId}-premium-direct-store-pack.zip`;
    await Promise.all([
      this.store.writeArtifact({ projectId: params.projectId, name: "generation-mode", value: { mode: "premium-direct", promptVersion: "premium-direct/v1" } }),
      this.store.writeArtifact({ projectId: params.projectId, name: "visual-system", value: result.visualSystem }),
      this.store.writeArtifact({ projectId: params.projectId, name: "storyboard", value: result.storyboard }),
      this.store.writeArtifact({ projectId: params.projectId, name: "quality-report", value: result.qualityReport }),
      this.store.writeArtifact({ projectId: params.projectId, name: "export-manifest", value: result.exportManifest }),
      this.store.writeArtifact({ projectId: params.projectId, name: "style-reference", value: styleReferenceMetadata }),
      this.store.writeArtifact({ projectId: params.projectId, name: "premium-direct-candidates", value: result.candidates.map((candidate) => ({
        id: candidate.id,
        index: candidate.index,
        promptVersion: candidate.promptVersion,
        prompts: candidate.prompts,
        qualityReport: candidate.qualityReport,
        exportManifest: candidate.exportManifest,
      })) }),
    ]);

    await this.writePremiumDirectCandidateRenders(params.projectDir, result);
    for (const asset of result.assets) {
      await this.store.writeRender({ projectId: params.projectId, fileName: asset.fileName, bytes: asset.bytes });
    }
    await this.store.writeExport({ projectId: params.projectId, fileName: zipName, bytes: result.zipBytes });
    const generation = await this.store.writeGeneration({
      projectId: params.projectId,
      kind: "ai-generate",
      label: params.label ?? "Premium Direct generation",
      visualSystem: result.visualSystem,
      storyboard: result.storyboard,
      assets: result.assets,
      qualityReport: result.qualityReport,
      exportManifest: result.exportManifest,
      zipFileName: zipName,
      zipBytes: result.zipBytes,
      styleReference: styleReferenceMetadata,
    });

    return {
      projectId: params.projectId,
      generationId: generation.generationId,
      provider: params.provider,
      model: params.model,
      screenshots: result.assets.map((asset) => ({ fileName: asset.fileName, contentType: asset.contentType, bytes: asset.bytes })),
      qualityReport: result.qualityReport,
      visualSystem: result.visualSystem,
      storyboard: result.storyboard,
      exportManifest: result.exportManifest,
      zip: { fileName: zipName, bytes: result.zipBytes },
      localProjectPath: params.projectDir,
      input: params.input,
      styleReference: styleReferenceMetadata,
      generationMode: "premium-direct",
      premiumDirect: {
        selectedCandidateId: result.selectedCandidate.id,
        candidateCount: result.candidates.length,
        promptVersion: "premium-direct/v1",
      },
    };
  }

  private async writePremiumDirectCandidateRenders(projectDir: string, result: GeneratePremiumDirectStorePackResult): Promise<void> {
    await Promise.all(result.candidates.map(async (candidate) => {
      const dir = path.join(projectDir, "renders", "variants", candidate.id);
      await mkdir(dir, { recursive: true });
      await Promise.all(candidate.assets.map((asset) => writeFile(path.join(dir, asset.fileName), asset.bytes)));
    }));
  }

  private async saveGeneration(params: {
    projectId: string;
    kind: "ai-generate" | "manual-rerender";
    label: string;
    visualSystem: VisualSystem;
    storyboard: Storyboard;
    assets: RenderedAsset[];
    qualityReport: QualityReport;
    exportManifest: ExportManifest;
    zipName: string;
    zipBytes: Uint8Array;
    styleReference?: StandardStyleReference;
  }) {
    await Promise.all([
      this.store.writeArtifact({ projectId: params.projectId, name: "storyboard", value: params.storyboard }),
      this.store.writeArtifact({ projectId: params.projectId, name: "quality-report", value: params.qualityReport }),
      this.store.writeArtifact({ projectId: params.projectId, name: "export-manifest", value: params.exportManifest }),
      ...params.assets.map((asset) => this.store.writeRender({ projectId: params.projectId, fileName: asset.fileName, bytes: asset.bytes })),
      this.store.writeExport({ projectId: params.projectId, fileName: params.zipName, bytes: params.zipBytes }),
      ...(params.styleReference ? [this.store.writeArtifact({ projectId: params.projectId, name: "style-reference", value: params.styleReference })] : []),
    ]);

    return this.store.writeGeneration({
      projectId: params.projectId,
      kind: params.kind,
      label: params.label,
      visualSystem: params.visualSystem,
      storyboard: params.storyboard,
      assets: params.assets,
      qualityReport: params.qualityReport,
      exportManifest: params.exportManifest,
      zipFileName: params.zipName,
      zipBytes: params.zipBytes,
      ...(params.styleReference ? { styleReference: params.styleReference } : {}),
    });
  }

  private async writeBlockedReadiness(projectId: string, readiness: InputReadinessReport): Promise<void> {
    await Promise.all([
      this.store.writeArtifact({ projectId, name: "input-readiness", value: readiness }),
      this.store.updateProjectMetadata({ projectId, patch: { status: "blocked" } }),
    ]);
  }
}

function withoutImagePayload(reference: StandardStyleReference): StandardStyleReference {
  const { imageBase64: _imageBase64, ...metadata } = reference;
  return metadata;
}
