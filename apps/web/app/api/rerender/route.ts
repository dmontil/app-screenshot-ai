import { readFile } from "node:fs/promises";
import path from "node:path";

import { LocalProjectGenerationSession } from "@app-screenshot-ai/local-project-session";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { ModelGateway } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { StoryboardSchema, VisualSystemSchema } from "@app-screenshot-ai/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = slug(typeof body.projectId === "string" ? body.projectId : "ui-rerender");
    const locale = typeof body.locale === "string" && body.locale.trim() ? body.locale.trim() : "en-US";
    const visualSystem = VisualSystemSchema.parse(body.visualSystem);
    const storyboard = StoryboardSchema.parse(body.storyboard);

    const session = new LocalProjectGenerationSession({
      store: new LocalProjectStore({ rootDir: path.join(appRoot(), ".local", "projects") }),
      modelGateway: new ModelGateway({ providers: {} }),
      patternLibrary: new PatternLibrary([]),
      sourceScreenshotLoader: {
        async load(sourcePath) {
          return {
            bytes: new Uint8Array(await readFile(sourcePath)),
            contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
          };
        },
      },
    });

    const result = await session.rerenderStorePack({
      projectId,
      locale,
      visualSystem,
      storyboard,
      label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Manual rerender",
      persist: body.persist !== false,
    });

    return Response.json({
      projectId: result.projectId,
      ...(result.generationId ? { generationId: result.generationId } : {}),
      screenshots: result.screenshots.map((asset) => ({
        fileName: asset.fileName,
        dataUrl: `data:${asset.contentType};base64,${Buffer.from(asset.bytes).toString("base64")}`,
      })),
      qualityReport: result.qualityReport,
      storyboard: result.storyboard,
      exportManifest: result.exportManifest,
      zip: {
        fileName: result.zip.fileName,
        dataUrl: `data:application/zip;base64,${Buffer.from(result.zip.bytes).toString("base64")}`,
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

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "ui-rerender";
}
