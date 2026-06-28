import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { BuildPremiumCandidateSceneSetsUseCase, BuildPremiumProjectContextUseCase } from "@app-screenshot-ai/ai-pipeline";
import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { createDefaultPremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import { RenderSceneSetUseCase } from "@app-screenshot-ai/render-engine";
import { AppInputSchema, StoryboardSchema, type AppInput, type ProductUnderstanding, type SceneSet } from "@app-screenshot-ai/schemas";

import { writeLiteraryTripSourceScreenshots } from "./literarytrip-fixtures";

const root = process.cwd();
const exampleDir = path.join(root, "examples", "literarytrip");
const outputDir = path.join(exampleDir, "quality-benchmark");
const target = { store: "app-store" as const, device: "iphone-6.9" as const, locale: "en-US", width: 1320, height: 2868 };

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  await writeLiteraryTripSourceScreenshots(exampleDir);

  const metadata = JSON.parse(await readFile(path.join(exampleDir, "input", "metadata.json"), "utf8")) as unknown;
  const input: AppInput = AppInputSchema.parse(metadata);
  const context = await new BuildPremiumProjectContextUseCase().execute({ input });
  const recipe = createDefaultPremiumRecipeLibrary().retrieve({
    category: input.category,
    tone: context.brandKit.tone,
    limit: 1,
  })[0];

  if (!recipe) throw new Error(`No premium recipe found for category: ${input.category}`);

  const candidates = new BuildPremiumCandidateSceneSetsUseCase().execute({
    brandKit: context.brandKit,
    productUnderstanding: context.productUnderstanding,
    recipe,
  });

  const renderer = new RenderSceneSetUseCase();
  const evaluator = new EvaluateStoreSetUseCase();
  const summary = [];

  for (const candidate of candidates) {
    const variantDir = path.join(outputDir, candidate.variant);
    await mkdir(variantDir, { recursive: true });

    const assets = await renderer.execute({
      sceneSet: candidate.sceneSet,
      productUnderstanding: context.productUnderstanding,
      target,
      async loadSourceScreenshot(sourcePath) {
        return {
          bytes: new Uint8Array(await readFile(path.isAbsolute(sourcePath) ? sourcePath : path.join(root, sourcePath))),
          contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
        };
      },
    });
    const storyboard = storyboardForSceneSet(candidate.sceneSet, context.productUnderstanding);
    const qualityReport = evaluator.execute({ assets, screens: storyboard.screens, sceneSet: candidate.sceneSet });

    for (const asset of assets) {
      await writeFile(path.join(variantDir, asset.fileName), asset.bytes);
    }
    await writeJson(path.join(variantDir, "scene-set.json"), candidate.sceneSet);
    await writeJson(path.join(variantDir, "storyboard.json"), storyboard);
    await writeJson(path.join(variantDir, "quality-report.json"), qualityReport);

    summary.push({
      variant: candidate.variant,
      premium: qualityReport.premium,
      issues: qualityReport.issues.map((issue) => issue.code),
      files: assets.map((asset) => asset.fileName),
    });
  }

  summary.sort((a, b) => (b.premium?.score ?? 0) - (a.premium?.score ?? 0));
  await writeJson(path.join(outputDir, "summary.json"), {
    appName: input.appName,
    category: input.category,
    recipeId: recipe.id,
    generatedAt: new Date().toISOString(),
    variants: summary,
  });

  console.log(`Wrote ${candidates.length} quality benchmark variants to ${path.relative(root, outputDir)}`);
  console.log(`Best deterministic score: ${summary[0]?.variant} (${summary[0]?.premium?.score ?? "n/a"})`);
}

function storyboardForSceneSet(sceneSet: SceneSet, productUnderstanding: ProductUnderstanding) {
  const sourcePathsByScreenshotId = new Map(
    productUnderstanding.screenInventory.map((screen) => [screen.screenshotId, screen.sourcePath]),
  );
  const fallbackPath = productUnderstanding.screenInventory[0]?.sourcePath ?? "input/screenshot.png";

  return StoryboardSchema.parse({
    screens: sceneSet.scenes.map((scene) => {
      const primaryDevice = scene.devices[0];
      const secondaryDevice = scene.devices[1];
      const primaryPath = primaryDevice ? sourcePathsByScreenshotId.get(primaryDevice.screenshotId) ?? fallbackPath : fallbackPath;
      const secondaryPath = secondaryDevice ? sourcePathsByScreenshotId.get(secondaryDevice.screenshotId) ?? fallbackPath : undefined;

      return {
        id: scene.id,
        index: scene.index,
        role: scene.role,
        headline: scene.copy.headline,
        ...(scene.copy.subheadline ? { subheadline: scene.copy.subheadline } : {}),
        treatment: treatmentForComposition(scene.composition),
        sourceScreenshotPath: primaryPath,
        ...(secondaryPath ? { secondarySourceScreenshotPath: secondaryPath } : {}),
        device: {
          scale: primaryDevice?.scale,
          tilt: primaryDevice?.tilt,
          crop: primaryDevice?.crop,
        },
        callouts: scene.callouts,
      };
    }),
  });
}

function treatmentForComposition(composition: SceneSet["scenes"][number]["composition"]) {
  if (composition === "split-devices" || composition === "proof-poster") return "premium-proof-card";
  if (composition === "object-led") return "cinematic-poster";
  if (composition === "panoramic-sequence") return "map-route-editorial";
  if (composition === "cropped-edge-device" || composition === "before-after") return "callout-zoom";
  return "hero-device";
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
