import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { GenerateAiImageDirectSequencePackUseCase, readImageAsDataUrl, type AiImageDirectSceneType } from "@app-screenshot-ai/ai-pipeline";
import { FalNanoBananaProvider } from "@app-screenshot-ai/model-gateway";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const trace: Array<{ at: string; step: string; detail?: string }> = [];
  const log = (step: string, detail?: string) => trace.push({ at: new Date().toISOString(), step, ...(detail ? { detail } : {}) });
  try {
    log("request.received");
    const form = await request.formData();
    const root = appRoot();
    const projectId = slug(readString(form.get("projectId")) || readString(form.get("appName")) || "ai-image-direct-pack");
    const projectDir = path.join(root, ".local", "projects", projectId);
    const inputDir = path.join(projectDir, "input");
    await mkdir(inputDir, { recursive: true });
    log("project.prepared", `.local/projects/${projectId}`);

    const screens = readScreens(form.get("screens"));
    if (screens.length < 2 || screens.length > 5) throw new Error("Choose between 2 and 5 images");
    const referenceStyleImagePath = await persistRequiredFile(form.get("referenceStyleImage"), inputDir, "reference");
    log("input.reference.saved", relativeToRoot(root, referenceStyleImagePath));
    const approvedCoverImagePath = await persistOptionalFile(form.get("approvedCoverImage"), inputDir, "approved-cover");
    if (approvedCoverImagePath) log("input.approvedCover.saved", relativeToRoot(root, approvedCoverImagePath));

    const screensWithFiles = [];
    for (const [zeroIndex, screen] of screens.entries()) {
      const index = zeroIndex + 1;
      const screenshotImagePath = screen.sceneType === "feature"
        ? await persistRequiredFile(form.get(`screenshotImage-${index}`), inputDir, `screenshot-${String(index).padStart(2, "0")}`)
        : undefined;
      if (screenshotImagePath) log("input.screenshot.saved", relativeToRoot(root, screenshotImagePath));
      screensWithFiles.push({ ...screen, ...(screenshotImagePath ? { screenshotImagePath } : {}) });
    }

    const provider = new FalNanoBananaProvider(readActualSecret(readString(form.get("falKey")), process.env.FAL_KEY));
    log("provider.ready", "fal-ai/nano-banana-2/edit");
    log("pack.generation.started", `${screensWithFiles.length} images`);
    const brandColors = readColorList(form.get("brandColors"));
    const websiteUrl = readString(form.get("websiteUrl"));
    const result = await new GenerateAiImageDirectSequencePackUseCase(provider).execute({
      projectId,
      appName: readString(form.get("appName")),
      category: readString(form.get("category")),
      targetAudience: readString(form.get("targetAudience")),
      valueProposition: readString(form.get("valueProposition")),
      ...(brandColors.length ? { brandColors } : {}),
      ...(websiteUrl ? { websiteUrl } : {}),
      outputWidth: readPositiveInt(form.get("outputWidth")) ?? 1320,
      outputHeight: readPositiveInt(form.get("outputHeight")) ?? 2868,
      referenceStyleImagePath,
      ...(approvedCoverImagePath ? { approvedCoverImagePath } : {}),
      outputDir: projectDir,
      promptVersion: readPromptVersion(form.get("promptVersion")),
      screens: screensWithFiles,
    });

    const images = await Promise.all(result.images.map(async (image) => ({
      index: image.index,
      id: image.id,
      fileName: `${image.id}.png`,
      dataUrl: image.artifacts.outputImagePath ? await readImageAsDataUrl(image.artifacts.outputImagePath) : "",
      prompt: image.prompt,
      scenePlan: image.scenePlan,
      trace: image.artifacts.outputImagePath ? [{ at: new Date().toISOString(), step: "artifact.output.saved", detail: relativeToRoot(root, image.artifacts.outputImagePath) }] : [],
    })));

    log("pack.generation.completed", `${images.length} images`);
    if (result.artifacts.packPlanPath) log("artifact.pack.saved", relativeToRoot(root, result.artifacts.packPlanPath));
    log("response.ready");
    return Response.json({ trace, projectId, ...result, images, localProjectPath: `.local/projects/${projectId}` });
  } catch (error) {
    log("error", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error", trace }, { status: 400 });
  }
}

type PostedScreen = { id?: string; sceneType: AiImageDirectSceneType; headline?: string; subheadline?: string; productVisualAnchor?: string; avoidGenericCliches?: string[] };

function readScreens(value: FormDataEntryValue | null): PostedScreen[] {
  const parsed = JSON.parse(readString(value) || "[]") as PostedScreen[];
  return parsed.map((screen, index) => {
    const headline = screen.headline?.trim();
    const subheadline = screen.subheadline?.trim();
    const productVisualAnchor = screen.productVisualAnchor?.trim();
    const avoidGenericCliches = Array.isArray(screen.avoidGenericCliches) ? screen.avoidGenericCliches.map((item) => item.trim()).filter(Boolean) : [];
    return {
      id: screen.id || `screen-${String(index + 1).padStart(2, "0")}`,
      sceneType: screen.sceneType === "cover" ? "cover" : "feature",
      ...(headline ? { headline } : {}),
      ...(subheadline ? { subheadline } : {}),
      ...(productVisualAnchor ? { productVisualAnchor } : {}),
      ...(avoidGenericCliches.length ? { avoidGenericCliches } : {}),
    };
  });
}

async function persistRequiredFile(value: FormDataEntryValue | null, dir: string, basename: string): Promise<string> {
  const filePath = await persistOptionalFile(value, dir, basename);
  if (!filePath) throw new Error(`${basename} image is required`);
  return filePath;
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

function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function readColorList(value: FormDataEntryValue | null): string[] {
  return readString(value).split(",").map((color) => color.trim()).filter(Boolean);
}

function readPromptVersion(value: FormDataEntryValue | null): "v1" | "v2" | "v3" | "v4" | "v5" {
  const raw = readString(value);
  return raw === "v1" || raw === "v3" || raw === "v4" || raw === "v5" ? raw : "v2";
}

function readPositiveInt(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number.parseInt(readString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readActualSecret(formValue: string, envValue: string | undefined): string {
  if (!formValue) return envValue ?? "";
  if (formValue.includes("•")) return envValue ?? "";
  return formValue;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "ai-image-direct-pack";
}

function relativeToRoot(root: string, filePath: string): string {
  return path.relative(root, filePath) || filePath;
}
