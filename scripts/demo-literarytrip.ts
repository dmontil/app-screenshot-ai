import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { LocalProjectGenerationSession } from "@app-screenshot-ai/local-project-session";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { ModelGateway } from "@app-screenshot-ai/model-gateway";
import { createDefaultPremiumRecipeLibrary, PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { AppInputSchema, type AppInput } from "@app-screenshot-ai/schemas";

import { writeLiteraryTripSourceScreenshots } from "./literarytrip-fixtures";

const root = process.cwd();
const exampleDir = path.join(root, "examples", "literarytrip");
const outputDir = path.join(exampleDir, "output");

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, "screenshots"), { recursive: true });
  await writeLiteraryTripSourceScreenshots(exampleDir);

  const metadata = JSON.parse(await readFile(path.join(exampleDir, "input", "metadata.json"), "utf8")) as unknown;
  const input: AppInput = AppInputSchema.parse(metadata);

  const session = new LocalProjectGenerationSession({
    store: new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") }),
    modelGateway: createLiteraryTripFixtureGateway(),
    patternLibrary: createLiteraryTripPatternLibrary(),
    premiumRecipeLibrary: createDefaultPremiumRecipeLibrary(),
    sourceScreenshotLoader: {
      async load(sourcePath) {
        return {
          bytes: new Uint8Array(await readFile(path.join(root, sourcePath))),
          contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
        };
      },
    },
  });

  const result = await session.generateStorePack({
    projectId: "literarytrip",
    input,
    provider: "fixture",
    model: "fixture-v1",
    label: "LiteraryTrip demo",
    target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
  });

  await writeJson("visual-system.json", result.visualSystem);
  await writeJson("storyboard.json", result.storyboard);
  await writeJson("quality-report.json", result.qualityReport);
  await writeJson("export-manifest.json", result.exportManifest);

  for (const asset of result.screenshots) {
    await writeFile(path.join(outputDir, "screenshots", asset.fileName), asset.bytes);
  }

  await writeFile(path.join(outputDir, "literarytrip-store-pack.zip"), result.zip.bytes);

  console.log(`Generated ${result.screenshots.length} screenshots in ${path.relative(root, outputDir)}`);
}

function createLiteraryTripFixtureGateway(): ModelGateway {
  return new ModelGateway({
    providers: {
      fixture: {
        async generateObject({ task }) {
          if (task === "visual-system.generate") {
            return {
              id: "literarytrip-warm-editorial-v1",
              palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
              typography: { headlineFamily: "Inter", headlineWeight: 760 },
              layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 },
            };
          }

          if (task === "storyboard.generate") {
            return {
              screens: [
                { id: "hook", index: 1, role: "hook", headline: "Turn books into walkable routes", sourceScreenshotPath: "examples/literarytrip/input/screenshots/home.png" },
                { id: "search", index: 2, role: "search", headline: "Search by book or city", sourceScreenshotPath: "examples/literarytrip/input/screenshots/search.png" },
                { id: "places", index: 3, role: "value", headline: "Discover real story places", sourceScreenshotPath: "examples/literarytrip/input/screenshots/search.png" },
                { id: "map", index: 4, role: "map", headline: "Follow the route on the map", sourceScreenshotPath: "examples/literarytrip/input/screenshots/map.png" },
                { id: "save", index: 5, role: "save", headline: "Save literary walks for later", sourceScreenshotPath: "examples/literarytrip/input/screenshots/map.png" },
              ],
            };
          }

          throw new Error(`Unexpected fixture task: ${task}`);
        },
      },
    },
  });
}

function createLiteraryTripPatternLibrary(): PatternLibrary {
  return new PatternLibrary([
    {
      id: "travel_editorial_01",
      category: "travel",
      conversionIntent: "discovery",
      layoutFamily: "top_headline_center_device",
      tone: ["editorial", "warm", "premium"],
      rules: { maxHeadlineWords: 6, backgroundComplexity: "low", uiVisibility: "high" },
      whyItWorks: ["The app UI remains dominant.", "The warm editorial tone matches literary discovery."],
    },
  ]);
}

async function writeJson(fileName: string, value: unknown) {
  await writeFile(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
