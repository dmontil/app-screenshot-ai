import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { ModelGateway } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary } from "@app-screenshot-ai/pattern-library";

import { GenerateStorePackUseCase } from "./generate-store-pack";

const appInput = {
  appName: "LiteraryTrip",
  category: "travel",
  targetAudience: "readers who travel",
  mainValueProposition: "turn books into walkable routes",
  targetStores: ["app-store" as const],
  baseLocale: "en-US",
  screenshots: [
    { id: "home", path: "input/home.png", kind: "functional" as const },
    { id: "search", path: "input/search.png", kind: "functional" as const },
    { id: "map", path: "input/map.png", kind: "functional" as const },
  ],
};

const visualSystem = {
  id: "warm-editorial-v1",
  palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
  typography: { headlineFamily: "Inter", headlineWeight: 760 },
  layout: { safeMargin: 96, headlineY: 140, deviceY: 620, deviceWidthRatio: 0.62 },
};

const storyboard = {
  screens: [
    { id: "hook", index: 1, role: "hook", headline: "Turn books into routes", sourceScreenshotPath: "input/home.png" },
  ],
};

describe("GenerateStorePackUseCase", () => {
  it("generates rendered assets, quality report, and export zip for valid input", async () => {
    const modelGateway = new ModelGateway({
      providers: {
        fake: {
          async generateObject({ task }) {
            if (task === "visual-system.generate") return visualSystem;
            if (task === "storyboard.generate") return storyboard;
            throw new Error(`Unexpected task: ${task}`);
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
        tone: ["editorial", "warm"],
        rules: { maxHeadlineWords: 6, backgroundComplexity: "low", uiVisibility: "high" },
        whyItWorks: ["Keeps app UI visible"],
      },
    ]);

    const useCase = new GenerateStorePackUseCase({ modelGateway, patternLibrary });

    const result = await useCase.execute({
      input: appInput,
      provider: "fake",
      model: "fake-fast",
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
    });

    expect(result.readiness.status).toBe("ready");
    expect(result.patterns.map((pattern) => pattern.id)).toEqual(["travel_editorial_01"]);
    expect(result.visualSystem.id).toBe("warm-editorial-v1");
    expect(result.assets).toHaveLength(1);
    expect(result.qualityReport.passed).toBe(true);
    expect(result.exportManifest.items[0]?.path).toBe("app-store/iphone-6.9/en-US/01-hook.png");
    expect(result.zipBytes.byteLength).toBeGreaterThan(0);
  }, 10_000);

  it("loads source screenshots for every storyboard screen before rendering", async () => {
    const loadedPaths: string[] = [];
    const sourceScreenshotBytes = await sharp({
      create: { width: 390, height: 844, channels: 4, background: "#FF0000" },
    })
      .png()
      .toBuffer();

    const modelGateway = new ModelGateway({
      providers: {
        fake: {
          async generateObject({ task }) {
            if (task === "visual-system.generate") return visualSystem;
            if (task === "storyboard.generate") return storyboard;
            throw new Error(`Unexpected task: ${task}`);
          },
        },
      },
    });

    const useCase = new GenerateStorePackUseCase({
      modelGateway,
      patternLibrary: new PatternLibrary([]),
      sourceScreenshotLoader: {
        async load(sourcePath) {
          loadedPaths.push(sourcePath);
          return { bytes: new Uint8Array(sourceScreenshotBytes), contentType: "image/png" };
        },
      },
    });

    await useCase.execute({
      input: appInput,
      provider: "fake",
      model: "fake-fast",
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
    });

    expect(loadedPaths).toEqual(["input/home.png"]);
  }, 10_000);

  it("stops before model calls when input readiness is blocked", async () => {
    const modelGateway = new ModelGateway({ providers: {} });
    const patternLibrary = new PatternLibrary([]);
    const useCase = new GenerateStorePackUseCase({ modelGateway, patternLibrary });

    await expect(
      useCase.execute({
        input: { ...appInput, screenshots: appInput.screenshots.slice(0, 2) },
        provider: "fake",
        model: "fake-fast",
        target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
      }),
    ).rejects.toMatchObject({
      code: "input_not_ready",
    });
  });
});
