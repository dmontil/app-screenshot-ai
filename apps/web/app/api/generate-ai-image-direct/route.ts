import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { GenerateAiImageDirectPackUseCase, readImageAsDataUrl, type AiImageDirectSceneType } from "@app-screenshot-ai/ai-pipeline";
import { FalNanoBananaProvider } from "@app-screenshot-ai/model-gateway";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const trace: Array<{ at: string; step: string; detail?: string }> = [];
  const log = (step: string, detail?: string) => trace.push({ at: new Date().toISOString(), step, ...(detail ? { detail } : {}) });
  try {
    log("request.received");
    const form = await request.formData();
    const root = appRoot();
    const projectId = slug(readString(form.get("projectId")) || readString(form.get("appName")) || "ai-image-direct");
    const projectDir = path.join(root, ".local", "projects", projectId);
    const inputDir = path.join(projectDir, "input");
    await mkdir(inputDir, { recursive: true });
    log("project.prepared", `.local/projects/${projectId}`);

    const sceneType = readSceneType(form.get("sceneType"));
    log("scene.selected", sceneType);
    const referenceStyleImagePath = await persistRequiredFile(form.get("referenceStyleImage"), inputDir, "reference");
    log("input.reference.saved", relativeToRoot(root, referenceStyleImagePath));
    const screenshotImagePath = sceneType === "feature"
      ? await persistRequiredFile(form.get("screenshotImage"), inputDir, "screenshot")
      : undefined;
    if (screenshotImagePath) log("input.screenshot.saved", relativeToRoot(root, screenshotImagePath));
    const approvedCoverImagePath = await persistOptionalFile(form.get("approvedCoverImage"), inputDir, "approved-cover");
    if (approvedCoverImagePath) log("input.approvedCover.saved", relativeToRoot(root, approvedCoverImagePath));

    const provider = new FalNanoBananaProvider(readActualSecret(readString(form.get("falKey")), process.env.FAL_KEY));
    log("provider.ready", "fal-ai/nano-banana-2/edit");
    const subheadline = readString(form.get("subheadline"));
    log("scene.plan.started");
    log("generation.started", "Planning scene, building prompt and calling fal.ai");
    const result = await new GenerateAiImageDirectPackUseCase(provider).execute({
      projectId,
      appName: readString(form.get("appName")),
      category: readString(form.get("category")),
      targetAudience: readString(form.get("targetAudience")),
      valueProposition: readString(form.get("valueProposition")),
      headline: readString(form.get("headline")),
      ...(subheadline ? { subheadline } : {}),
      outputWidth: readPositiveInt(form.get("outputWidth")) ?? 1320,
      outputHeight: readPositiveInt(form.get("outputHeight")) ?? 2868,
      referenceStyleImagePath,
      ...(screenshotImagePath ? { screenshotImagePath } : {}),
      sceneType,
      ...(readString(form.get("productVisualAnchor")) ? { productVisualAnchor: readString(form.get("productVisualAnchor")) } : {}),
      ...(readList(form.get("avoidGenericCliches")).length ? { avoidGenericCliches: readList(form.get("avoidGenericCliches")) } : {}),
      ...(approvedCoverImagePath ? { approvedCoverImagePath } : {}),
      promptVersion: readPromptVersion(form.get("promptVersion")),
      outputDir: projectDir,
    });

    log("scene.plan.completed", result.scenePlan.headline);
    if (result.artifacts.scenePlanPath) log("scene.plan.saved", relativeToRoot(root, result.artifacts.scenePlanPath));
    log("generation.completed", result.imageUrl);
    if (result.artifacts.promptPath) log("artifact.prompt.saved", relativeToRoot(root, result.artifacts.promptPath));
    if (result.artifacts.rawResponsePath) log("artifact.rawResponse.saved", relativeToRoot(root, result.artifacts.rawResponsePath));
    if (result.artifacts.outputImagePath) log("artifact.output.saved", relativeToRoot(root, result.artifacts.outputImagePath));
    const dataUrl = result.artifacts.outputImagePath ? await readImageAsDataUrl(result.artifacts.outputImagePath) : undefined;
    log("response.ready");
    return Response.json({
      trace,
      projectId,
      ...result,
      ...(dataUrl ? { image: { fileName: `${sceneType}.png`, dataUrl } } : {}),
      localProjectPath: `.local/projects/${projectId}`,
    });
  } catch (error) {
    log("error", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error", trace }, { status: 400 });
  }
}

async function persistRequiredFile(value: FormDataEntryValue | null, dir: string, basename: string): Promise<string> {
  const path = await persistOptionalFile(value, dir, basename);
  if (!path) throw new Error(`${basename} image is required`);
  return path;
}

async function persistOptionalFile(value: FormDataEntryValue | null, dir: string, basename: string): Promise<string | undefined> {
  if (!(value instanceof File) || value.size === 0) return undefined;
  const extension = value.type === "image/jpeg" ? "jpg" : value.type === "image/webp" ? "webp" : "png";
  const filePath = path.join(dir, `${basename}.${extension}`);
  await writeFile(filePath, new Uint8Array(await value.arrayBuffer()));
  return filePath;
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}

function readSceneType(value: FormDataEntryValue | null): AiImageDirectSceneType {
  return readString(value) === "cover" ? "cover" : "feature";
}

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function readPromptVersion(value: FormDataEntryValue | null): "v1" | "v2" | "v3" | "v4" | "v5" {
  const raw = readString(value);
  return raw === "v1" || raw === "v3" || raw === "v4" || raw === "v5" ? raw : "v2";
}

function readPositiveInt(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number.parseInt(readString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readList(value: FormDataEntryValue | null): string[] {
  return readString(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readActualSecret(formValue: string, envValue: string | undefined): string {
  if (!formValue) return envValue ?? "";
  if (formValue.includes("•")) return envValue ?? "";
  return formValue;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "ai-image-direct";
}

function relativeToRoot(root: string, filePath: string): string {
  return path.relative(root, filePath) || filePath;
}
