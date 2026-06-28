import path from "node:path";

import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";

export const runtime = "nodejs";

export async function GET() {
  const store = new LocalProjectStore({ rootDir: path.join(appRoot(), ".local", "projects") });
  const projects = await Promise.all((await store.listProjects()).map(async (project) => {
    const thumbnailDataUrl = await readProjectThumbnail(store, project.projectId, project.currentGenerationId);
    return {
      ...project,
      ...(thumbnailDataUrl ? { thumbnailDataUrl } : {}),
    };
  }));
  return Response.json({ projects });
}

async function readProjectThumbnail(store: LocalProjectStore, projectId: string, generationId: string | undefined): Promise<string | undefined> {
  if (!generationId) return undefined;
  try {
    const generation = await store.readGeneration(projectId, generationId);
    const thumbnail = generation.renders[0];
    if (!thumbnail) return undefined;
    return `data:image/png;base64,${Buffer.from(thumbnail.bytes).toString("base64")}`;
  } catch {
    return undefined;
  }
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}
