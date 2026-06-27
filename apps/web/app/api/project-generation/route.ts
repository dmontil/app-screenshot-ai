import { readFile } from "node:fs/promises";
import path from "node:path";

import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? "";
    const generationId = url.searchParams.get("generationId") ?? "";
    if (!projectId || !generationId) throw new Error("projectId and generationId are required.");

    const root = appRoot();
    const store = new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") });
    const generation = await store.readGeneration(projectId, generationId);
    const projectDir = path.join(root, ".local", "projects", safePathSegment(projectId));
    const input = await readOptionalJson(path.join(projectDir, "input", "metadata.json"));
    const brandKit = await readOptionalJson(path.join(projectDir, "pipeline", "brand-kit.json"));
    const productUnderstanding = await readOptionalJson(path.join(projectDir, "pipeline", "product-understanding.json"));
    const premiumRecipes = await readOptionalJson(path.join(projectDir, "pipeline", "premium-recipes.json"));
    const premiumCandidates = await readOptionalJson(path.join(projectDir, "pipeline", "premium-candidates.json"))
      ?? await readOptionalJson(path.join(projectDir, "pipeline", "premium-direct-candidates.json"));
    const sceneSet = await readOptionalJson(path.join(projectDir, "pipeline", "scene-set.json"));
    const generationMode = await readOptionalJson(path.join(projectDir, "pipeline", "generation-mode.json"));

    return Response.json({
      projectId,
      generationId,
      kind: generation.kind,
      label: generation.label,
      createdAt: generation.createdAt,
      visualSystem: generation.visualSystem,
      storyboard: generation.storyboard,
      qualityReport: generation.qualityReport,
      exportManifest: generation.exportManifest,
      input,
      brandKit,
      productUnderstanding,
      premiumRecipes,
      premiumCandidates,
      sceneSet,
      generationMode: generationMode?.mode,
      premiumDirect: generationMode?.mode === "premium-direct" ? {
        selectedCandidateId: "premium-direct-1",
        candidateCount: Array.isArray(premiumCandidates) ? premiumCandidates.length : 1,
        promptVersion: generationMode.promptVersion ?? "premium-direct/v1",
      } : undefined,
      styleReference: generation.styleReference,
      screenshots: generation.renders.map((render) => ({
        fileName: render.fileName,
        dataUrl: `data:image/png;base64,${Buffer.from(render.bytes).toString("base64")}`,
      })),
      zip: {
        fileName: generation.zip.fileName,
        dataUrl: `data:application/zip;base64,${Buffer.from(generation.zip.bytes).toString("base64")}`,
      },
      localProjectPath: `.local/projects/${projectId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}

async function readOptionalJson(filePath: string): Promise<any | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function safePathSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "");
}
