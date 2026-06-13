import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { GenerateStorePackUseCase } from "@app-screenshot-ai/ai-pipeline";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { ModelGateway } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { AppInputSchema, type AppInput } from "@app-screenshot-ai/schemas";

const root = process.cwd();
const exampleDir = path.join(root, "examples", "literarytrip");
const outputDir = path.join(exampleDir, "output");

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, "screenshots"), { recursive: true });
  await writeDemoSourceScreenshots();

  const metadata = JSON.parse(await readFile(path.join(exampleDir, "input", "metadata.json"), "utf8")) as unknown;
  const input: AppInput = AppInputSchema.parse(metadata);

  const modelGateway = new ModelGateway({
    providers: {
      fixture: {
        async generateObject({ task }) {
          if (task === "visual-system.generate") {
            return {
              id: "literarytrip-warm-editorial-v1",
              palette: {
                background: "#F7F1E7",
                primary: "#3B2416",
                accent: "#D99A32",
                text: "#24160F",
              },
              typography: {
                headlineFamily: "Inter",
                headlineWeight: 760,
              },
              layout: {
                safeMargin: 96,
                headlineY: 180,
                deviceY: 720,
                deviceWidthRatio: 0.62,
              },
            };
          }

          if (task === "storyboard.generate") {
            return {
              screens: [
                {
                  id: "hook",
                  index: 1,
                  role: "hook",
                  headline: "Turn books into walkable routes",
                  sourceScreenshotPath: "examples/literarytrip/input/screenshots/home.png",
                },
                {
                  id: "search",
                  index: 2,
                  role: "search",
                  headline: "Search by book or city",
                  sourceScreenshotPath: "examples/literarytrip/input/screenshots/search.png",
                },
                {
                  id: "places",
                  index: 3,
                  role: "value",
                  headline: "Discover real story places",
                  sourceScreenshotPath: "examples/literarytrip/input/screenshots/search.png",
                },
                {
                  id: "map",
                  index: 4,
                  role: "map",
                  headline: "Follow the route on the map",
                  sourceScreenshotPath: "examples/literarytrip/input/screenshots/map.png",
                },
                {
                  id: "save",
                  index: 5,
                  role: "save",
                  headline: "Save literary walks for later",
                  sourceScreenshotPath: "examples/literarytrip/input/screenshots/map.png",
                },
              ],
            };
          }

          throw new Error(`Unexpected fixture task: ${task}`);
        },
      },
    },
  });

  const patternLibrary = new PatternLibrary([
    {
      id: "travel_editorial_01",
      category: "travel",
      conversionIntent: "discovery",
      layoutFamily: "top_headline_center_device",
      tone: ["editorial", "warm", "premium"],
      rules: { maxHeadlineWords: 6, backgroundComplexity: "low", uiVisibility: "high" },
      whyItWorks: [
        "The app UI remains dominant.",
        "The warm editorial tone matches literary discovery.",
      ],
    },
  ]);

  const store = new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") });
  await store.createProject({ projectId: "literarytrip", input });

  const useCase = new GenerateStorePackUseCase({
    modelGateway,
    patternLibrary,
    sourceScreenshotLoader: {
      async load(sourcePath) {
        return {
          bytes: new Uint8Array(await readFile(path.join(root, sourcePath))),
          contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
        };
      },
    },
  });
  const result = await useCase.execute({
    input,
    provider: "fixture",
    model: "fixture-v1",
    target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
  });

  await writeJson("input-readiness.json", result.readiness);
  await writeJson("patterns.json", result.patterns);
  await writeJson("visual-system.json", result.visualSystem);
  await writeJson("storyboard.json", result.storyboard);
  await writeJson("quality-report.json", result.qualityReport);
  await writeJson("export-manifest.json", result.exportManifest);

  await store.writeArtifact({ projectId: "literarytrip", name: "input-readiness", value: result.readiness });
  await store.writeArtifact({ projectId: "literarytrip", name: "patterns", value: result.patterns });
  await store.writeArtifact({ projectId: "literarytrip", name: "visual-system", value: result.visualSystem });
  await store.writeArtifact({ projectId: "literarytrip", name: "storyboard", value: result.storyboard });
  await store.writeArtifact({ projectId: "literarytrip", name: "quality-report", value: result.qualityReport });
  await store.writeArtifact({ projectId: "literarytrip", name: "export-manifest", value: result.exportManifest });

  for (const asset of result.assets) {
    await writeFile(path.join(outputDir, "screenshots", asset.fileName), asset.bytes);
    await store.writeRender({ projectId: "literarytrip", fileName: asset.fileName, bytes: asset.bytes });
  }

  await writeFile(path.join(outputDir, "literarytrip-store-pack.zip"), result.zipBytes);
  await store.writeExport({ projectId: "literarytrip", fileName: "literarytrip-store-pack.zip", bytes: result.zipBytes });

  console.log(`Generated ${result.assets.length} screenshots in ${path.relative(root, outputDir)}`);
}

async function writeDemoSourceScreenshots() {
  const screenshotsDir = path.join(exampleDir, "input", "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  await Promise.all([
    writeDemoPhoneScreen(path.join(screenshotsDir, "home.png"), "Find a book", "#F7F1E7", "#3B2416"),
    writeDemoPhoneScreen(path.join(screenshotsDir, "search.png"), "Paris routes", "#EFE7D7", "#7C4A1D"),
    writeDemoPhoneScreen(path.join(screenshotsDir, "map.png"), "Story map", "#E7EFE7", "#3E4D2C"),
  ]);
}

async function writeDemoPhoneScreen(filePath: string, title: string, background: string, accent: string) {
  const svg = `<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
    <rect width="390" height="844" fill="${background}" />
    <text x="32" y="92" font-family="Arial" font-size="34" font-weight="700" fill="#24160F">${title}</text>
    <rect x="28" y="136" width="334" height="56" rx="22" fill="#FFFFFF" />
    <rect x="28" y="226" width="334" height="180" rx="28" fill="${accent}" opacity="0.22" />
    <rect x="52" y="456" width="286" height="78" rx="24" fill="#FFFFFF" />
    <rect x="52" y="558" width="220" height="28" rx="14" fill="${accent}" opacity="0.32" />
    <rect x="52" y="610" width="250" height="28" rx="14" fill="${accent}" opacity="0.22" />
  </svg>`;

  await writeFile(filePath, await sharp(Buffer.from(svg)).png().toBuffer());
}

async function writeJson(fileName: string, value: unknown) {
  await writeFile(path.join(outputDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
