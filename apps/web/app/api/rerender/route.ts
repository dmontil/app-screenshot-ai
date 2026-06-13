import { readFile } from "node:fs/promises";
import path from "node:path";

import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { RenderStoreSetUseCase } from "@app-screenshot-ai/render-engine";
import { StoryboardSchema, VisualSystemSchema } from "@app-screenshot-ai/schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = slug(typeof body.projectId === "string" ? body.projectId : "ui-rerender");
    const locale = typeof body.locale === "string" && body.locale.trim() ? body.locale.trim() : "en-US";
    const visualSystem = VisualSystemSchema.parse(body.visualSystem);
    const storyboard = StoryboardSchema.parse(body.storyboard);

    const renderer = new RenderStoreSetUseCase();
    const assets = await renderer.execute({
      visualSystem,
      storyboard,
      target: { store: "app-store", device: "iphone-6.9", locale, width: 1320, height: 2868 },
      async loadSourceScreenshot(sourcePath) {
        return {
          bytes: new Uint8Array(await readFile(sourcePath)),
          contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
        };
      },
    });

    const qualityReport = new EvaluateStoreSetUseCase().execute({ assets, screens: storyboard.screens });
    const exported = await new ExportStorePackUseCase().execute({ assets });
    const zipName = `${projectId}-store-pack.zip`;

    const shouldPersist = body.persist !== false;
    const store = new LocalProjectStore({ rootDir: path.join(appRoot(), ".local", "projects") });
    const generation = shouldPersist
      ? await saveManualGeneration({
          store,
          projectId,
          label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Manual rerender",
          visualSystem,
          storyboard,
          assets,
          qualityReport,
          exportManifest: exported.manifest,
          zipName,
          zipBytes: exported.zipBytes,
        })
      : undefined;

    return Response.json({
      projectId,
      ...(generation ? { generationId: generation.generationId } : {}),
      screenshots: assets.map((asset) => ({
        fileName: asset.fileName,
        dataUrl: `data:${asset.contentType};base64,${Buffer.from(asset.bytes).toString("base64")}`,
      })),
      qualityReport,
      storyboard,
      exportManifest: exported.manifest,
      zip: {
        fileName: zipName,
        dataUrl: `data:application/zip;base64,${Buffer.from(exported.zipBytes).toString("base64")}`,
      },
      localProjectPath: `.local/projects/${projectId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

async function saveManualGeneration(params: {
  store: LocalProjectStore;
  projectId: string;
  label: string;
  visualSystem: Awaited<ReturnType<typeof VisualSystemSchema.parse>>;
  storyboard: Awaited<ReturnType<typeof StoryboardSchema.parse>>;
  assets: Awaited<ReturnType<RenderStoreSetUseCase["execute"]>>;
  qualityReport: ReturnType<EvaluateStoreSetUseCase["execute"]>;
  exportManifest: Awaited<ReturnType<ExportStorePackUseCase["execute"]>>["manifest"];
  zipName: string;
  zipBytes: Uint8Array;
}) {
  await Promise.all([
    params.store.writeArtifact({ projectId: params.projectId, name: "storyboard", value: params.storyboard }),
    params.store.writeArtifact({ projectId: params.projectId, name: "quality-report", value: params.qualityReport }),
    params.store.writeArtifact({ projectId: params.projectId, name: "export-manifest", value: params.exportManifest }),
    ...params.assets.map((asset) => params.store.writeRender({ projectId: params.projectId, fileName: asset.fileName, bytes: asset.bytes })),
    params.store.writeExport({ projectId: params.projectId, fileName: params.zipName, bytes: params.zipBytes }),
  ]);

  return params.store.writeGeneration({
    projectId: params.projectId,
    kind: "manual-rerender",
    label: params.label,
    visualSystem: params.visualSystem,
    storyboard: params.storyboard,
    assets: params.assets,
    qualityReport: params.qualityReport,
    exportManifest: params.exportManifest,
    zipFileName: params.zipName,
    zipBytes: params.zipBytes,
  });
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "ui-rerender";
}
