import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { GenerateAiImageDirectSequencePackUseCase } from "@app-screenshot-ai/ai-pipeline";
import { FalNanoBananaProvider } from "@app-screenshot-ai/model-gateway";

const root = process.cwd();

type CliOptions = {
  assetDir: string;
  reference: "01" | "02";
  count: 3 | 4 | 5;
  projectId: string;
  promptVersion: "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8" | "v9" | "v10" | "v11" | "v12";
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error("FAL_KEY is required. Add it to .env.local or export FAL_KEY before running.");

  const assets = await discoverAssets(options.assetDir, options.reference, options.count);
  const outputDir = path.join(root, ".local", "projects", options.projectId);
  const downloadDir = path.join(process.env.HOME ?? root, "Downloads", `${options.projectId}-outputs`);
  await rm(outputDir, { recursive: true, force: true });
  await rm(downloadDir, { recursive: true, force: true });
  await mkdir(downloadDir, { recursive: true });

  console.log(`[ai-direct-pack-test] project: ${options.projectId}`);
  console.log(`[ai-direct-pack-test] prompt version: ${options.promptVersion}`);
  console.log(`[ai-direct-pack-test] reference: ${assets.reference}`);
  console.log(`[ai-direct-pack-test] screenshots: ${assets.screenshots.join(", ")}`);

  const result = await new GenerateAiImageDirectSequencePackUseCase(new FalNanoBananaProvider(falKey)).execute({
    projectId: options.projectId,
    appName: "VanTrip",
    category: "Travel / Campervan / RV route planning",
    targetAudience: "Campervan owners, RV travelers and digital nomads planning multi-stop trips",
    valueProposition: "Create personalized campervan and RV trips with route planning, daily stops, distances and timing",
    outputWidth: 1320,
    outputHeight: 2868,
    referenceStyleImagePath: assets.reference,
    outputDir,
    promptVersion: options.promptVersion,
    screens: [
      { sceneType: "cover" },
      ...assets.screenshots.map((screenshotImagePath) => ({ sceneType: "feature" as const, screenshotImagePath })),
    ],
  });

  const summary = {
    projectId: options.projectId,
    promptVersion: options.promptVersion,
    localProjectPath: path.relative(root, outputDir),
    downloadDir,
    images: result.images.map((image) => ({
      index: image.index,
      id: image.id,
      sceneType: image.sceneType,
      outputImagePath: image.artifacts.outputImagePath,
      promptPath: image.artifacts.promptPath,
      scenePlan: image.scenePlan,
    })),
  };

  for (const image of result.images) {
    if (!image.artifacts.outputImagePath) continue;
    await copyFile(image.artifacts.outputImagePath, path.join(downloadDir, `${image.id}.png`));
  }
  await writeFile(path.join(downloadDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`[ai-direct-pack-test] done`);
  console.log(`[ai-direct-pack-test] local: ${path.relative(root, outputDir)}`);
  console.log(`[ai-direct-pack-test] downloads: ${downloadDir}`);
}

async function discoverAssets(assetDir: string, reference: "01" | "02", count: 3 | 4 | 5): Promise<{ reference: string; screenshots: string[] }> {
  const entries = await readdir(assetDir);
  const referencePath = path.join(assetDir, `reference_${reference}.png`);
  const screenshotCount = count - 1;
  const screenshots = entries
    .filter((entry) => /simulator screenshot/i.test(entry) && /\.(png|jpe?g|webp)$/i.test(entry))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, screenshotCount)
    .map((entry) => path.join(assetDir, entry));

  if (screenshots.length !== screenshotCount) {
    throw new Error(`Expected ${screenshotCount} screenshots for a ${count}-image pack, found ${screenshots.length}`);
  }
  return { reference: referencePath, screenshots };
}

function parseArgs(args: string[]): CliOptions {
  const assetDir = path.resolve(args.find((arg) => !arg.startsWith("--")) ?? path.join(process.env.HOME ?? root, "Downloads", "Assets-test"));
  const referenceArg = valueFor(args, "--reference") ?? "01";
  const reference = referenceArg === "2" || referenceArg === "02" ? "02" : "01";
  const countValue = Number(valueFor(args, "--count") ?? "3");
  const count = countValue === 4 ? 4 : countValue === 5 ? 5 : 3;
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "");
  const rawPromptVersion = valueFor(args, "--prompt-version") ?? valueFor(args, "--prompt") ?? "v2";
  const promptVersion = rawPromptVersion === "v1" || rawPromptVersion === "v3" || rawPromptVersion === "v4" || rawPromptVersion === "v5" || rawPromptVersion === "v6" || rawPromptVersion === "v7" || rawPromptVersion === "v8" || rawPromptVersion === "v9" || rawPromptVersion === "v10" || rawPromptVersion === "v11" || rawPromptVersion === "v12" ? rawPromptVersion : "v2";
  const projectId = valueFor(args, "--project") ?? `ai-direct-pack-${reference}-${count}-${promptVersion}-${stamp}`;
  return { assetDir, reference, count, projectId, promptVersion };
}

function valueFor(args: string[], name: string): string | undefined {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
