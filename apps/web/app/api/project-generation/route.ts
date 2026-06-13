import path from "node:path";

import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? "";
    const generationId = url.searchParams.get("generationId") ?? "";
    if (!projectId || !generationId) throw new Error("projectId and generationId are required.");

    const store = new LocalProjectStore({ rootDir: path.join(appRoot(), ".local", "projects") });
    const generation = await store.readGeneration(projectId, generationId);

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
