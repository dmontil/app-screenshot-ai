import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { GenerateStorePackUseCase } from "@app-screenshot-ai/ai-pipeline";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { createModelGatewayFromEnv } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { AppInputSchema, type AppInput } from "@app-screenshot-ai/schemas";

const root = process.cwd();

type CliArgs = {
  inputPath: string;
  projectId: string;
  outputDir: string;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const input = AppInputSchema.parse(JSON.parse(await readFile(args.inputPath, "utf8")) as unknown);

  await rm(args.outputDir, { recursive: true, force: true });
  await mkdir(path.join(args.outputDir, "screenshots"), { recursive: true });

  const { gateway, provider, model } = createModelGatewayFromEnv();
  const patternLibrary = createDefaultPatternLibrary();
  const store = new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") });
  await store.createProject({ projectId: args.projectId, input });

  const useCase = new GenerateStorePackUseCase({
    modelGateway: gateway,
    patternLibrary,
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

  const result = await useCase.execute({
    input,
    provider,
    model,
    target: { store: "app-store", device: "iphone-6.9", locale: input.baseLocale, width: 1320, height: 2868 },
  });

  await writeJson(args.outputDir, "input-readiness.json", result.readiness);
  await writeJson(args.outputDir, "patterns.json", result.patterns);
  await writeJson(args.outputDir, "visual-system.json", result.visualSystem);
  await writeJson(args.outputDir, "storyboard.json", result.storyboard);
  await writeJson(args.outputDir, "quality-report.json", result.qualityReport);
  await writeJson(args.outputDir, "export-manifest.json", result.exportManifest);

  await store.writeArtifact({ projectId: args.projectId, name: "input-readiness", value: result.readiness });
  await store.writeArtifact({ projectId: args.projectId, name: "patterns", value: result.patterns });
  await store.writeArtifact({ projectId: args.projectId, name: "visual-system", value: result.visualSystem });
  await store.writeArtifact({ projectId: args.projectId, name: "storyboard", value: result.storyboard });
  await store.writeArtifact({ projectId: args.projectId, name: "quality-report", value: result.qualityReport });
  await store.writeArtifact({ projectId: args.projectId, name: "export-manifest", value: result.exportManifest });

  for (const asset of result.assets) {
    await writeFile(path.join(args.outputDir, "screenshots", asset.fileName), asset.bytes);
    await store.writeRender({ projectId: args.projectId, fileName: asset.fileName, bytes: asset.bytes });
  }

  const zipName = `${args.projectId}-store-pack.zip`;
  await writeFile(path.join(args.outputDir, zipName), result.zipBytes);
  await store.writeExport({ projectId: args.projectId, fileName: zipName, bytes: result.zipBytes });
  const generation = await store.writeGeneration({
    projectId: args.projectId,
    kind: "ai-generate",
    label: "CLI generation",
    visualSystem: result.visualSystem,
    storyboard: result.storyboard,
    assets: result.assets,
    qualityReport: result.qualityReport,
    exportManifest: result.exportManifest,
    zipFileName: zipName,
    zipBytes: result.zipBytes,
  });

  console.log(`Generated ${result.assets.length} screenshots with ${provider}/${model}`);
  console.log(`Generation: ${generation.generationId}`);
  console.log(`Output: ${path.relative(root, args.outputDir)}`);
  console.log(`Local project: ${path.relative(root, path.join(root, ".local", "projects", args.projectId))}`);
}

function parseArgs(args: string[]): CliArgs {
  const inputPath = readFlag(args, "--input") ?? "examples/literarytrip/input/metadata.json";
  const projectId = readFlag(args, "--project") ?? slugFromInputPath(inputPath);
  const outputDir = readFlag(args, "--output") ?? path.join("examples", projectId, "output");
  return { inputPath, projectId, outputDir };
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
