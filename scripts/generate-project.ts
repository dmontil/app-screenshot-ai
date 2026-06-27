import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { LocalProjectGenerationSession } from "@app-screenshot-ai/local-project-session";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { createModelGatewayFromEnv } from "@app-screenshot-ai/model-gateway";
import { createDefaultPremiumRecipeLibrary, PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { AppInputSchema, getStandardStyleReference, STANDARD_STYLE_REFERENCES, type StandardStyleReference } from "@app-screenshot-ai/schemas";

const root = process.cwd();

type CliArgs = { inputPath: string; projectId: string; outputDir: string; styleReferenceId: string; includeCoverScreen: boolean };

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = AppInputSchema.parse(JSON.parse(await readFile(args.inputPath, "utf8")) as unknown);
  const styleReference = await loadStyleReference(args.styleReferenceId);

  await rm(args.outputDir, { recursive: true, force: true });
  await mkdir(path.join(args.outputDir, "screenshots"), { recursive: true });

  const { gateway, provider, model } = createModelGatewayFromEnv();
  const session = new LocalProjectGenerationSession({
    store: new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") }),
    modelGateway: gateway,
    patternLibrary: createDefaultPatternLibrary(),
    premiumRecipeLibrary: createDefaultPremiumRecipeLibrary(),
    sourceScreenshotLoader: {
      async load(sourcePath) {
        const absolutePath = path.isAbsolute(sourcePath) ? sourcePath : path.join(root, sourcePath);
        return {
          bytes: new Uint8Array(await readFile(absolutePath)),
          contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
        };
      },
    },
  });

  const result = await session.generateStorePack({
    projectId: args.projectId,
    input,
    provider,
    model,
    label: "CLI generation",
    target: { store: "app-store", device: "iphone-6.9", locale: input.baseLocale, width: 1320, height: 2868 },
    styleReference,
    ...(process.env.OPENAI_IMAGE_MODEL || provider === "openai" ? { imageModel: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1" } : {}),
    includeCoverScreen: args.includeCoverScreen,
  });

  await writeJson(args.outputDir, "visual-system.json", result.visualSystem);
  await writeJson(args.outputDir, "storyboard.json", result.storyboard);
  await writeJson(args.outputDir, "quality-report.json", result.qualityReport);
  await writeJson(args.outputDir, "export-manifest.json", result.exportManifest);
  if (result.brandKit) await writeJson(args.outputDir, "brand-kit.json", result.brandKit);
  if (result.productUnderstanding) await writeJson(args.outputDir, "product-understanding.json", result.productUnderstanding);
  if (result.premiumRecipes) await writeJson(args.outputDir, "premium-recipes.json", result.premiumRecipes);
  if (result.premiumCandidates) await writeJson(args.outputDir, "premium-candidates.json", result.premiumCandidates);
  if (result.sceneSet) await writeJson(args.outputDir, "scene-set.json", result.sceneSet);
  await writeJson(args.outputDir, "style-reference.json", withoutImagePayload(styleReference));

  for (const asset of result.screenshots) {
    await writeFile(path.join(args.outputDir, "screenshots", asset.fileName), asset.bytes);
  }
  await writeFile(path.join(args.outputDir, result.zip.fileName), result.zip.bytes);

  console.log(`Generated ${result.screenshots.length} screenshots with ${provider}/${model}`);
  console.log(`Generation: ${result.generationId}`);
  console.log(`Output: ${path.relative(root, args.outputDir)}`);
  console.log(`Local project: ${path.relative(root, path.join(root, ".local", "projects", args.projectId))}`);
}

function parseArgs(args: string[]): CliArgs {
  const inputPath = readFlag(args, "--input") ?? "examples/literarytrip/input/metadata.json";
  const projectId = readFlag(args, "--project") ?? slugFromInputPath(inputPath);
  const outputDir = readFlag(args, "--output") ?? path.join("examples", projectId, "output");
  const styleReferenceId = readFlag(args, "--style-reference") ?? STANDARD_STYLE_REFERENCES[0]?.id ?? "sc-1";
  const includeCoverScreen = args.includes("--cover");
  return { inputPath, projectId, outputDir, styleReferenceId, includeCoverScreen };
}

function readFlag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
}

function slugFromInputPath(inputPath: string): string {
  const parts = inputPath.split(path.sep);
  const examplesIndex = parts.indexOf("examples");
  if (examplesIndex >= 0 && parts[examplesIndex + 1]) return parts[examplesIndex + 1];
  return "app-project";
}

function withoutImagePayload(reference: StandardStyleReference): StandardStyleReference {
  const metadata = { ...reference };
  delete metadata.imageBase64;
  return metadata;
}

async function loadStyleReference(styleReferenceId: string): Promise<StandardStyleReference> {
  const reference = getStandardStyleReference(styleReferenceId);
  if (!reference) throw new Error(`Unknown standard style reference '${styleReferenceId}'.`);
  const bytes = await readFile(path.join(root, reference.path));
  return { ...reference, imageBase64: Buffer.from(bytes).toString("base64") };
}

function createDefaultPatternLibrary(): PatternLibrary {
  return new PatternLibrary([
    pattern("travel", "discovery", ["editorial", "warm", "premium"]),
    pattern("productivity", "clarity", ["calm", "focused", "premium"]),
    pattern("fitness", "motivation", ["bold", "energetic", "clean"]),
    pattern("finance", "trust", ["secure", "minimal", "confident"]),
    pattern("education", "learning", ["friendly", "clear", "bright"]),
  ]);
}

function pattern(category: string, conversionIntent: string, tone: string[]) {
  return {
    id: `${category}_${conversionIntent}_01`,
    category,
    conversionIntent,
    layoutFamily: "top_headline_center_device",
    tone,
    rules: { maxHeadlineWords: 6, backgroundComplexity: "low" as const, uiVisibility: "high" as const },
    whyItWorks: ["Keeps the app UI visible.", "Uses short readable headlines.", "Maintains visual continuity."],
  };
}

async function writeJson(outputDir: string, fileName: string, value: unknown) {
  await writeFile(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
