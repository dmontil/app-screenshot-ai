import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppInput, ExportManifest, QualityReport, RenderedAsset, Storyboard, VisualSystem } from "@app-screenshot-ai/schemas";

export type LocalProjectStoreOptions = {
  rootDir: string;
};

export type CreateProjectParams = {
  projectId: string;
  input: AppInput;
};

export type LocalProjectRef = {
  projectId: string;
  projectDir: string;
};

export type WriteArtifactParams = {
  projectId: string;
  name: string;
  value: unknown;
};

export type WriteBytesParams = {
  projectId: string;
  fileName: string;
  bytes: Uint8Array;
};

export type GenerationKind = "ai-generate" | "manual-rerender";

export type GenerationSummary = {
  generationId: string;
  projectId: string;
  kind: GenerationKind;
  label?: string;
  createdAt: string;
};

export type WriteGenerationParams = {
  projectId: string;
  generationId?: string;
  kind: GenerationKind;
  label?: string;
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  assets: RenderedAsset[];
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
  zipFileName: string;
  zipBytes: Uint8Array;
};

export type StoredGeneration = GenerationSummary & {
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
  renders: Array<{ fileName: string; bytes: Uint8Array }>;
  zip: { fileName: string; bytes: Uint8Array };
};

export type ProjectSummary = {
  projectId: string;
  appName?: string;
  currentGenerationId?: string;
  generations: GenerationSummary[];
};

export class LocalProjectStore {
  private readonly rootDir: string;

  constructor(options: LocalProjectStoreOptions) {
    this.rootDir = options.rootDir;
  }

  async createProject(params: CreateProjectParams): Promise<LocalProjectRef> {
    const projectDir = this.projectDir(params.projectId);
    await mkdir(path.join(projectDir, "input", "screenshots"), { recursive: true });
    await mkdir(path.join(projectDir, "pipeline"), { recursive: true });
    await mkdir(path.join(projectDir, "renders"), { recursive: true });
    await mkdir(path.join(projectDir, "exports"), { recursive: true });
    await mkdir(path.join(projectDir, "generations"), { recursive: true });

    await writeJson(path.join(projectDir, "input", "metadata.json"), params.input);

    return { projectId: params.projectId, projectDir };
  }

  async writeArtifact(params: WriteArtifactParams): Promise<void> {
    const artifactsDir = path.join(this.projectDir(params.projectId), "pipeline");
    await mkdir(artifactsDir, { recursive: true });
    await writeJson(path.join(artifactsDir, `${params.name}.json`), params.value);
  }

  async writeRender(params: WriteBytesParams): Promise<void> {
    const rendersDir = path.join(this.projectDir(params.projectId), "renders");
    await mkdir(rendersDir, { recursive: true });
    await writeFile(path.join(rendersDir, params.fileName), params.bytes);
  }

  async writeExport(params: WriteBytesParams): Promise<void> {
    const exportsDir = path.join(this.projectDir(params.projectId), "exports");
    await mkdir(exportsDir, { recursive: true });
    await writeFile(path.join(exportsDir, params.fileName), params.bytes);
  }

  async writeGeneration(params: WriteGenerationParams): Promise<GenerationSummary> {
    const generationId = safePathSegment(params.generationId ?? newGenerationId());
    const createdAt = new Date().toISOString();
    const summary: GenerationSummary = {
      generationId,
      projectId: params.projectId,
      kind: params.kind,
      ...(params.label ? { label: params.label } : {}),
      createdAt,
    };
    const generationDir = path.join(this.projectDir(params.projectId), "generations", generationId);
    const rendersDir = path.join(generationDir, "renders");
    const exportsDir = path.join(generationDir, "exports");
    await mkdir(rendersDir, { recursive: true });
    await mkdir(exportsDir, { recursive: true });

    await writeJson(path.join(generationDir, "generation.json"), summary);
    await writeJson(path.join(generationDir, "visual-system.json"), params.visualSystem);
    await writeJson(path.join(generationDir, "storyboard.json"), params.storyboard);
    await writeJson(path.join(generationDir, "quality-report.json"), params.qualityReport);
    await writeJson(path.join(generationDir, "export-manifest.json"), params.exportManifest);
    await writeFile(path.join(exportsDir, params.zipFileName), params.zipBytes);
    for (const asset of params.assets) {
      await writeFile(path.join(rendersDir, asset.fileName), asset.bytes);
    }
    await writeJson(path.join(this.projectDir(params.projectId), "current-generation.json"), summary);
    return summary;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    await mkdir(this.rootDir, { recursive: true });
    const entries = await readdir(this.rootDir, { withFileTypes: true });
    const projects = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map(async (entry) => this.readProjectSummary(entry.name)),
    );
    return projects.sort((a, b) => (b.generations[0]?.createdAt ?? "").localeCompare(a.generations[0]?.createdAt ?? ""));
  }

  async readGeneration(projectId: string, generationId: string): Promise<StoredGeneration> {
    const safeProjectId = safePathSegment(projectId);
    const safeGenerationId = safePathSegment(generationId);
    if (safeGenerationId === "legacy") return this.readLegacyGeneration(safeProjectId);
    const generationDir = path.join(this.rootDir, safeProjectId, "generations", safeGenerationId);
    const summary = JSON.parse(await readFile(path.join(generationDir, "generation.json"), "utf8")) as GenerationSummary;
    const visualSystem = JSON.parse(await readFile(path.join(generationDir, "visual-system.json"), "utf8")) as VisualSystem;
    const storyboard = JSON.parse(await readFile(path.join(generationDir, "storyboard.json"), "utf8")) as Storyboard;
    const qualityReport = JSON.parse(await readFile(path.join(generationDir, "quality-report.json"), "utf8")) as QualityReport;
    const exportManifest = JSON.parse(await readFile(path.join(generationDir, "export-manifest.json"), "utf8")) as ExportManifest;
    const renderFileNames = await readdir(path.join(generationDir, "renders"));
    const renders = await Promise.all(
      renderFileNames.sort().map(async (fileName) => ({
        fileName,
        bytes: new Uint8Array(await readFile(path.join(generationDir, "renders", fileName))),
      })),
    );
    const zipFileName = (await readdir(path.join(generationDir, "exports"))).find((fileName) => fileName.endsWith(".zip"));
    if (!zipFileName) throw new Error(`Generation '${safeGenerationId}' has no ZIP export.`);
    return {
      ...summary,
      visualSystem,
      storyboard,
      qualityReport,
      exportManifest,
      renders,
      zip: { fileName: zipFileName, bytes: new Uint8Array(await readFile(path.join(generationDir, "exports", zipFileName))) },
    };
  }

  private async readLegacyGeneration(projectId: string): Promise<StoredGeneration> {
    const projectDir = this.projectDir(projectId);
    const visualSystem = await readRequiredJson<VisualSystem>(path.join(projectDir, "pipeline", "visual-system.json"));
    const storyboard = await readRequiredJson<Storyboard>(path.join(projectDir, "pipeline", "storyboard.json"));
    const qualityReport = await readRequiredJson<QualityReport>(path.join(projectDir, "pipeline", "quality-report.json"));
    const exportManifest = await readRequiredJson<ExportManifest>(path.join(projectDir, "pipeline", "export-manifest.json"));
    const renderFileNames = await readdir(path.join(projectDir, "renders"));
    const renders = await Promise.all(
      renderFileNames.filter((fileName) => fileName.endsWith(".png")).sort().map(async (fileName) => ({
        fileName,
        bytes: new Uint8Array(await readFile(path.join(projectDir, "renders", fileName))),
      })),
    );
    const zipFileName = (await readdir(path.join(projectDir, "exports"))).find((fileName) => fileName.endsWith(".zip"));
    if (!zipFileName) throw new Error(`Legacy project '${projectId}' has no ZIP export.`);
    return {
      generationId: "legacy",
      projectId,
      kind: "ai-generate",
      label: "Legacy generation",
      createdAt: "1970-01-01T00:00:00.000Z",
      visualSystem,
      storyboard,
      qualityReport,
      exportManifest,
      renders,
      zip: { fileName: zipFileName, bytes: new Uint8Array(await readFile(path.join(projectDir, "exports", zipFileName))) },
    };
  }

  private async readProjectSummary(projectId: string): Promise<ProjectSummary> {
    const projectDir = this.projectDir(projectId);
    const input = await readOptionalJson<AppInput>(path.join(projectDir, "input", "metadata.json"));
    const current = await readOptionalJson<GenerationSummary>(path.join(projectDir, "current-generation.json"));
    const generationsDir = path.join(projectDir, "generations");
    await mkdir(generationsDir, { recursive: true });
    const generationEntries = await readdir(generationsDir, { withFileTypes: true });
    const generations = await Promise.all(
      generationEntries.filter((entry) => entry.isDirectory()).map(async (entry) => {
        const summary = await readOptionalJson<GenerationSummary>(path.join(generationsDir, entry.name, "generation.json"));
        return summary ?? { generationId: entry.name, projectId, kind: "ai-generate" as const, createdAt: "" };
      }),
    );
    const sortedGenerations = generations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const legacyStoryboard = await readOptionalJson<Storyboard>(path.join(projectDir, "pipeline", "storyboard.json"));
    if (sortedGenerations.length === 0 && legacyStoryboard) {
      sortedGenerations.push({
        generationId: "legacy",
        projectId,
        kind: "ai-generate",
        label: "Legacy generation",
        createdAt: "1970-01-01T00:00:00.000Z",
      });
    }
    return {
      projectId,
      ...(input?.appName ? { appName: input.appName } : {}),
      ...(current?.generationId ? { currentGenerationId: current.generationId } : sortedGenerations[0]?.generationId ? { currentGenerationId: sortedGenerations[0].generationId } : {}),
      generations: sortedGenerations,
    };
  }

  private projectDir(projectId: string): string {
    return path.join(this.rootDir, safePathSegment(projectId));
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function readRequiredJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readOptionalJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function newGenerationId(): string {
  return `gen-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function safePathSegment(value: string): string {
  const safe = value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "");
  if (!safe) throw new Error("Project id must contain at least one safe path character.");
  return safe;
}
