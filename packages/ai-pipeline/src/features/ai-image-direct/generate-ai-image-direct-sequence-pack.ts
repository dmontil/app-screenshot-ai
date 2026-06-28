import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ImageEditProvider } from "@app-screenshot-ai/model-gateway";

import { GenerateAiImageDirectPackUseCase } from "./generate-ai-image-direct-pack";
import type { AiImageDirectPackInput, AiImageDirectPackResult } from "./types";

export class GenerateAiImageDirectSequencePackUseCase {
  constructor(private readonly provider: ImageEditProvider) {}

  async execute(input: AiImageDirectPackInput): Promise<AiImageDirectPackResult> {
    const screens = input.screens.slice(0, 5);
    if (screens.length < 2) throw new Error("At least 2 screens are required");
    if (screens.length > 5) throw new Error("At most 5 screens are supported");

    const campaignContinuityPaths: string[] = input.approvedCoverImagePath ? [input.approvedCoverImagePath] : [];
    const generator = new GenerateAiImageDirectPackUseCase(this.provider);
    const images: AiImageDirectPackResult["images"] = [];

    for (const [zeroIndex, screen] of screens.entries()) {
      const index = zeroIndex + 1;
      const id = screen.id || `screen-${String(index).padStart(2, "0")}`;
      const plannedCopy = defaultPackCopy(input, index, screen.sceneType);
      const promptVersion = input.promptVersion ?? "v1";
      const activeContinuityPaths = screen.sceneType === "feature" && promptVersion !== "v1" ? [] : campaignContinuityPaths;
      const result = await generator.execute({
        ...(input.projectId ? { projectId: input.projectId } : {}),
        packScreenIndex: index,
        packScreenCount: screens.length,
        appName: input.appName,
        category: input.category,
        targetAudience: input.targetAudience,
        valueProposition: input.valueProposition,
        ...(input.brandColors?.length ? { brandColors: input.brandColors } : {}),
        ...(input.websiteUrl ? { websiteUrl: input.websiteUrl } : {}),
        headline: screen.headline || plannedCopy.headline,
        subheadline: screen.subheadline || plannedCopy.subheadline,
        ...(input.outputWidth ? { outputWidth: input.outputWidth } : {}),
        ...(input.outputHeight ? { outputHeight: input.outputHeight } : {}),
        referenceStyleImagePath: input.referenceStyleImagePath,
        ...(screen.screenshotImagePath ? { screenshotImagePath: screen.screenshotImagePath } : {}),
        sceneType: screen.sceneType,
        ...(screen.productVisualAnchor ? { productVisualAnchor: screen.productVisualAnchor } : {}),
        ...(screen.avoidGenericCliches?.length ? { avoidGenericCliches: screen.avoidGenericCliches } : {}),
        continuityImagePaths: activeContinuityPaths,
        ...(screen.sceneType === "feature" && screen.screenshotImagePath ? { screenshotLast: true, screenshotImageIndex: activeContinuityPaths.length + 2 } : {}),
        outputBasename: id,
        promptVersion,
        ...(input.outputDir ? { outputDir: input.outputDir } : {}),
      });

      images.push({ ...result, index, id });
      if (screen.sceneType === "cover" && result.artifacts.outputImagePath) {
        campaignContinuityPaths.splice(0, campaignContinuityPaths.length, result.artifacts.outputImagePath);
      }
    }

    const artifacts = input.outputDir ? await persistPackPlan(input, images) : {};
    return {
      provider: "fal",
      model: "fal-ai/nano-banana-2/edit",
      outputWidth: input.outputWidth ?? 1320,
      outputHeight: input.outputHeight ?? 2868,
      images,
      artifacts,
    };
  }
}

function defaultPackCopy(input: AiImageDirectPackInput, index: number, sceneType: "cover" | "feature"): { headline: string; subheadline: string } {
  const text = `${input.appName} ${input.category} ${input.targetAudience} ${input.valueProposition}`.toLowerCase();
  if (/camper|rv|\bvan\b|motorhome|road trip|route|vantrip|vantrips/.test(text)) {
    const routeScreens = [
      { headline: "Plan Perfect Routes", subheadline: "In minutes, not hours" },
      { headline: "Build Your Route", subheadline: "Add stops that fit your trip" },
      { headline: "See Daily Plans", subheadline: "Distances, stops and timing together" },
      { headline: "Adjust Every Stop", subheadline: "Keep the journey flexible" },
      { headline: "Travel With Confidence", subheadline: "Your RV plan stays organized" },
    ];
    return routeScreens[index - 1] ?? routeScreens[0]!;
  }
  if (/book|books|literary|author|reading|novel|story/.test(text)) {
    const literaryScreens = [
      { headline: "Explore Places Through Books", subheadline: "Turn trips into literary journeys" },
      { headline: "Find Story Places", subheadline: "Discover locations from your reads" },
      { headline: "Follow Literary Routes", subheadline: "Walk through scenes and authors" },
      { headline: "Save Every Journey", subheadline: "Keep your book trips together" },
      { headline: "Share The Story", subheadline: "Send routes to fellow readers" },
    ];
    return literaryScreens[index - 1] ?? literaryScreens[0]!;
  }
  if (sceneType === "cover") return { headline: `Discover ${input.appName}`, subheadline: "A better way to get started" };
  return { headline: `Feature ${index}`, subheadline: "Show one clear user benefit" };
}

async function persistPackPlan(input: AiImageDirectPackInput, images: AiImageDirectPackResult["images"]): Promise<AiImageDirectPackResult["artifacts"]> {
  if (!input.outputDir) return {};
  const pipelineDir = path.join(input.outputDir, "pipeline");
  await mkdir(pipelineDir, { recursive: true });
  const packPlanPath = path.join(pipelineDir, "ai-image-direct-pack.json");
  await writeFile(packPlanPath, `${JSON.stringify({ input: { ...input, referenceStyleImagePath: input.referenceStyleImagePath }, images: images.map((image) => ({ index: image.index, id: image.id, sceneType: image.sceneType, outputImagePath: image.artifacts.outputImagePath, scenePlan: image.scenePlan })) }, null, 2)}\n`);
  return { packPlanPath };
}
