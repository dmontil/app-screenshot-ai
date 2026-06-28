import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ImageEditProvider } from "@app-screenshot-ai/model-gateway";

import { buildCoverPrompt } from "./build-cover-prompt";
import { buildFeaturePrompt } from "./build-feature-prompt";
import { PlanAiImageSceneUseCase, type AiImageScenePlan } from "./plan-ai-image-scene";
import type { AiImageDirectInput, AiImageDirectResult, NormalizedAiImageDirectInput } from "./types";

export class GenerateAiImageDirectPackUseCase {
  constructor(private readonly provider: ImageEditProvider) {}

  async execute(input: AiImageDirectInput): Promise<AiImageDirectResult> {
    const base = validateAndNormalizeBase(input);
    const scenePlan = await new PlanAiImageSceneUseCase().execute({
      appName: base.appName,
      category: base.category,
      targetAudience: base.targetAudience,
      valueProposition: base.valueProposition,
      sceneType: base.sceneType,
      ...(base.headline ? { userHeadline: base.headline } : {}),
      ...(base.subheadline ? { userSubheadline: base.subheadline } : {}),
      ...(base.productVisualAnchor ? { userProductVisualAnchor: base.productVisualAnchor } : {}),
      ...(base.avoidGenericCliches ? { userAvoidGenericCliches: base.avoidGenericCliches } : {}),
    });
    const normalized: NormalizedAiImageDirectInput = {
      ...base,
      headline: scenePlan.headline,
      subheadline: scenePlan.subheadline,
      productVisualAnchor: scenePlan.productVisualAnchor,
      avoidGenericCliches: scenePlan.avoidGenericCliches,
    };
    const prompt = normalized.sceneType === "cover" ? buildCoverPrompt(normalized) : buildFeaturePrompt(normalized);
    const imagePaths = imagePathsFor(normalized);
    const output = await this.provider.edit({
      prompt,
      imagePaths,
      outputWidth: normalized.outputWidth,
      outputHeight: normalized.outputHeight,
    });

    const artifacts = normalized.outputDir
      ? await persistArtifacts({ input: normalized, prompt, scenePlan, imageUrl: output.imageUrl, raw: output.raw, outputDir: normalized.outputDir })
      : {};

    return {
      imageUrl: output.imageUrl,
      prompt,
      provider: "fal",
      model: "fal-ai/nano-banana-2/edit",
      sceneType: normalized.sceneType,
      outputWidth: normalized.outputWidth,
      outputHeight: normalized.outputHeight,
      artifacts,
      scenePlan,
    };
  }
}

export function validateAndNormalize(input: AiImageDirectInput): NormalizedAiImageDirectInput {
  const base = validateAndNormalizeBase(input);
  return {
    ...base,
    headline: base.headline || `Discover ${base.appName}`,
    subheadline: base.subheadline || "A better way to get started",
    productVisualAnchor: base.productVisualAnchor || "app-specific visual buddy, object, or symbol based on the core product value",
    avoidGenericCliches: base.avoidGenericCliches ?? ["fake awards", "rating badges", "generic stock imagery"],
  };
}

function validateAndNormalizeBase(input: AiImageDirectInput): AiImageDirectInput & { outputWidth: number; outputHeight: number } {
  if (!input.referenceStyleImagePath) throw new Error("Reference style image is required");
  if (input.sceneType === "feature" && !input.screenshotImagePath) {
    throw new Error("Screenshot image is required for feature scene");
  }
  if (input.sceneType !== "cover" && input.sceneType !== "feature") {
    throw new Error("sceneType must be cover or feature");
  }
  return {
    ...input,
    outputWidth: input.outputWidth || 1320,
    outputHeight: input.outputHeight || 2868,
  };
}

function imagePathsFor(input: NormalizedAiImageDirectInput): string[] {
  if (input.screenshotLast && input.screenshotImagePath) {
    return [
      input.referenceStyleImagePath,
      ...(input.approvedCoverImagePath ? [input.approvedCoverImagePath] : []),
      ...(input.continuityImagePaths ?? []),
      input.screenshotImagePath,
    ];
  }
  return [
    input.referenceStyleImagePath,
    ...(input.screenshotImagePath ? [input.screenshotImagePath] : []),
    ...(input.approvedCoverImagePath ? [input.approvedCoverImagePath] : []),
    ...(input.continuityImagePaths ?? []),
  ];
}

async function persistArtifacts(params: {
  input: NormalizedAiImageDirectInput;
  prompt: string;
  scenePlan: AiImageScenePlan;
  imageUrl: string;
  raw: unknown;
  outputDir: string;
}): Promise<AiImageDirectResult["artifacts"]> {
  const pipelineDir = path.join(params.outputDir, "pipeline");
  const rendersDir = path.join(params.outputDir, "renders");
  await mkdir(pipelineDir, { recursive: true });
  await mkdir(rendersDir, { recursive: true });

  const inputPath = path.join(pipelineDir, "ai-image-direct-input.json");
  const promptPath = path.join(pipelineDir, "prompt.txt");
  const rawResponsePath = path.join(pipelineDir, "fal-response.json");
  const scenePlanPath = path.join(pipelineDir, "scene-plan.json");
  const scenePlanPromptPath = path.join(pipelineDir, "scene-plan-prompt.txt");
  const scenePlanResponsePath = path.join(pipelineDir, "scene-plan-response.json");
  const outputImagePath = path.join(rendersDir, `${params.input.outputBasename ?? params.input.sceneType}.png`);

  await Promise.all([
    writeFile(inputPath, `${JSON.stringify(params.input, null, 2)}\n`),
    writeFile(promptPath, params.prompt),
    writeFile(rawResponsePath, `${JSON.stringify(params.raw, null, 2)}\n`),
    writeFile(scenePlanPath, `${JSON.stringify(params.scenePlan, null, 2)}\n`),
    writeFile(scenePlanPromptPath, params.scenePlan.prompt ?? "fallback scene planning"),
    writeFile(scenePlanResponsePath, `${JSON.stringify({ source: params.scenePlan.source, rawResponse: params.scenePlan.rawResponse ?? null }, null, 2)}\n`),
    downloadToFile(params.imageUrl, outputImagePath),
  ]);

  return { inputPath, promptPath, rawResponsePath, outputImagePath, scenePlanPath, scenePlanPromptPath, scenePlanResponsePath };
}

async function downloadToFile(url: string, filePath: string): Promise<void> {
  if (url.startsWith("file://")) {
    await writeFile(filePath, await readFile(new URL(url)));
    return;
  }
  if (url.startsWith("data:")) {
    const [, payload = ""] = url.split(",");
    await writeFile(filePath, Buffer.from(payload, "base64"));
    return;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download generated image: HTTP ${response.status}`);
  await writeFile(filePath, new Uint8Array(await response.arrayBuffer()));
}

export async function readImageAsDataUrl(filePath: string): Promise<string> {
  const bytes = await readFile(filePath);
  const contentType = filePath.toLowerCase().endsWith(".jpg") || filePath.toLowerCase().endsWith(".jpeg") ? "image/jpeg" : "image/png";
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}
