import { GenerateStorePackError, GenerateStorePackUseCase, type SourceScreenshotLoaderPort } from "@app-screenshot-ai/ai-pipeline";
import type { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import type {
  AppInput,
  ExportManifest,
  InputReadinessReport,
  QualityReport,
  RenderTarget,
  Storyboard,
  VisualSystem,
} from "@app-screenshot-ai/schemas";

export type LocalProjectGenerationSessionOptions = {
  store: LocalProjectStore;
  modelGateway: ModelGateway;
  patternLibrary: PatternLibrary;
  sourceScreenshotLoader?: SourceScreenshotLoaderPort;
};

export type GenerateLocalStorePackParams = {
  projectId: string;
  input: AppInput;
  provider: string;
  model: string;
  label?: string;
  target: RenderTarget;
};

export type LocalStorePackResult = {
  projectId: string;
  generationId: string;
  provider: string;
  model: string;
  screenshots: Array<{ fileName: string; contentType: "image/png" | "image/jpeg"; bytes: Uint8Array }>;
  qualityReport: QualityReport;
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  exportManifest: ExportManifest;
  zip: { fileName: string; bytes: Uint8Array };
  localProjectPath: string;
};

export class LocalProjectGenerationSession {
  private readonly store: LocalProjectStore;
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;

  constructor(options: LocalProjectGenerationSessionOptions) {
    this.store = options.store;
    this.modelGateway = options.modelGateway;
    this.patternLibrary = options.patternLibrary;
    this.sourceScreenshotLoader = options.sourceScreenshotLoader;
  }

  async generateStorePack(params: GenerateLocalStorePackParams): Promise<LocalStorePackResult> {
    const project = await this.store.createProject({ projectId: params.projectId, input: params.input });
    const useCase = new GenerateStorePackUseCase({
      modelGateway: this.modelGateway,
      patternLibrary: this.patternLibrary,
      ...(this.sourceScreenshotLoader ? { sourceScreenshotLoader: this.sourceScreenshotLoader } : {}),
    });

    try {
      const result = await useCase.execute({
        input: params.input,
        provider: params.provider,
        model: params.model,
        target: params.target,
      });

      await Promise.all([
        this.store.writeArtifact({ projectId: params.projectId, name: "input-readiness", value: result.readiness }),
        this.store.writeArtifact({ projectId: params.projectId, name: "patterns", value: result.patterns }),
        this.store.writeArtifact({ projectId: params.projectId, name: "visual-system", value: result.visualSystem }),
        this.store.writeArtifact({ projectId: params.projectId, name: "storyboard", value: result.storyboard }),
        this.store.writeArtifact({ projectId: params.projectId, name: "quality-report", value: result.qualityReport }),
        this.store.writeArtifact({ projectId: params.projectId, name: "export-manifest", value: result.exportManifest }),
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
      };
    } catch (error) {
      if (error instanceof GenerateStorePackError) {
        await this.writeBlockedReadiness(params.projectId, error.readiness);
      }
      throw error;
    }
  }

  private async writeBlockedReadiness(projectId: string, readiness: InputReadinessReport): Promise<void> {
    await this.store.writeArtifact({ projectId, name: "input-readiness", value: readiness });
  }
}
