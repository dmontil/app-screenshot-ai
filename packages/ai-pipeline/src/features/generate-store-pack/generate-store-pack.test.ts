import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { ModelGateway } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary, PremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import type { PremiumRecipe } from "@app-screenshot-ai/schemas";

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

const styleReference = {
  id: "premium-dark-01",
  name: "Premium Dark Reference",
  path: "standard-style-references/premium-dark-01.jpeg",
  mimeType: "image/jpeg" as const,
  width: 1280,
  height: 720,
  imageBase64: "base64-reference",
};

const premiumRecipe: PremiumRecipe = {
  id: "travel-editorial-panorama",
  category: "travel",
  name: "Editorial route panorama",
  qualityTarget: "top-1-percent" as const,
  tone: ["editorial", "premium"],
  setRhythm: ["hook", "feature", "proof", "comparison", "cta"],
  scenes: [
    { composition: "hero-poster" as const, requiredAssets: ["3d-object" as const], deviceSlots: 1, copyStyle: "big-loud" as const },
    { composition: "split-devices" as const, requiredAssets: ["3d-object" as const], deviceSlots: 2, copyStyle: "minimal-premium" as const },
    { composition: "proof-poster" as const, requiredAssets: ["badge" as const], deviceSlots: 1, copyStyle: "proof-heavy" as const },
    { composition: "cropped-edge-device" as const, requiredAssets: ["3d-object" as const], deviceSlots: 1, copyStyle: "big-loud" as const },
    { composition: "object-led" as const, requiredAssets: ["3d-object" as const], deviceSlots: 1, copyStyle: "minimal-premium" as const },
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
      styleReference,
    });

    expect(result.readiness.status).toBe("ready");
    expect(result.patterns.map((pattern) => pattern.id)).toEqual(["travel_editorial_01"]);
    expect(result.visualSystem.id).toBe("warm-editorial-v1");
    expect(result.assets).toHaveLength(1);
    expect(result.qualityReport.passed).toBe(true);
    expect(result.exportManifest.items[0]?.path).toBe("app-store/iphone-6.9/en-US/01-hook.png");
    expect(result.zipBytes.byteLength).toBeGreaterThan(0);
  }, 10_000);

  it("builds premium project context and a SceneSet candidate alongside the rendered pack", async () => {
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
      premiumRecipeLibrary: new PremiumRecipeLibrary([premiumRecipe]),
    });

    const result = await useCase.execute({
      input: appInput,
      provider: "fake",
      model: "fake-fast",
      // This test verifies premium pipeline selection/plumbing, not final store-resolution raster quality.
      // Keep the render target small so the integration contract stays fast and deterministic.
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 390, height: 844 },
      styleReference,
    });

    expect(result.brandKit.source).toBe("category-default");
    expect(result.productUnderstanding.screenInventory.map((screen) => screen.screenshotId)).toEqual(["home", "search", "map"]);
    expect(result.premiumRecipes.map((recipe) => recipe.id)).toEqual(["travel-editorial-panorama"]);
    expect(result.premiumCandidates).toHaveLength(5);
    const candidateScores = result.premiumCandidates.map((candidate) => candidate.qualityReport.premium?.score ?? 0);
    expect(result.qualityReport.premium?.score).toBe(Math.max(...candidateScores));
    expect(result.sceneSet?.id).toContain("director-cut");
    expect(result.sceneSet).toBeDefined();
    expect(result.sceneSet).toMatchObject({
      recipeId: "travel-editorial-panorama",
      continuity: { sharedBackground: "panorama", deviceTreatment: "progressive" },
    });
    expect(result.sceneSet!.scenes.map((scene) => scene.composition)).toEqual([
      "hero-poster",
      "panoramic-sequence",
      "split-devices",
    ]);
    expect(result.storyboard.screens).toHaveLength(appInput.screenshots.length);
    expect(result.storyboard.screens.map((screen) => screen.sourceScreenshotPath)).toEqual([
      "input/home.png",
      "input/search.png",
      "input/map.png",
    ]);
    expect(result.qualityReport.premium?.score).toBeGreaterThan(0.8);
  }, 45_000);

  it("uses AI-first OpenAI compositions to produce one output per uploaded screenshot without SceneSet rendering", async () => {
    const generatedImageBytes = await sharp({
      create: { width: 900, height: 1600, channels: 4, background: "#2563EB" },
    }).png().toBuffer();
    const sourceScreenshotBytes = await sharp({
      create: { width: 390, height: 844, channels: 4, background: "#FFFFFF" },
    }).png().toBuffer();
    const imagePrompts: string[] = [];
    const loadedPaths: string[] = [];
    let styleReferenceAnalyzeCalls = 0;
    const modelGateway = new ModelGateway({
      providers: {
        openai: {
          async generateObject({ task }) {
            if (task === "style-reference.analyze") {
              styleReferenceAnalyzeCalls += 1;
              return {
                referenceId: styleReference.id,
                visualSummary: "Bold blue/purple reference with large poster rhythm.",
                layoutRhythm: ["large top headline", "central phone stage"],
                typographyStyle: ["bold readable display type"],
                colorAndLighting: ["electric blue gradients"],
                compositionRules: ["follow the reference rhythm"],
                forbiddenCarryovers: ["reference text", "logos"],
              };
            }
            if (task === "visual-system.generate") return visualSystem;
            if (task === "storyboard.generate") {
              return {
                screens: appInput.screenshots.map((screenshot, index) => ({
                  id: `screen-${index + 1}`,
                  index: index + 1,
                  role: "feature",
                  headline: `Show app screen ${index + 1}`,
                  sourceScreenshotPath: screenshot.path,
                })),
              };
            }
            throw new Error(`Unexpected task: ${task}`);
          },
          async generateImage({ prompt }) {
            imagePrompts.push(prompt);
            return { bytes: new Uint8Array(generatedImageBytes), contentType: "image/png" as const };
          },
        },
      },
    });

    const useCase = new GenerateStorePackUseCase({
      modelGateway,
      patternLibrary: new PatternLibrary([]),
      premiumRecipeLibrary: new PremiumRecipeLibrary([premiumRecipe]),
      sourceScreenshotLoader: {
        async load(sourcePath) {
          loadedPaths.push(sourcePath);
          return { bytes: new Uint8Array(sourceScreenshotBytes), contentType: "image/png" };
        },
      },
    });

    const result = await useCase.execute({
      input: appInput,
      provider: "openai",
      model: "gpt-4.1",
      imageModel: "gpt-image-1",
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 390, height: 844 },
      styleReference: { ...styleReference, imageBase64: Buffer.from("reference").toString("base64") },
    });

    expect(result.assets).toHaveLength(appInput.screenshots.length);
    expect(result.storyboard.screens).toHaveLength(appInput.screenshots.length);
    expect(result.sceneSet).toBeUndefined();
    expect(imagePrompts).toHaveLength(appInput.screenshots.length);
    expect(imagePrompts[0]).toContain("You are an expert App Store marketing art director");
    expect(imagePrompts[0]).toContain("Visual DNA");
    expect(imagePrompts[0]).toContain("The attached reference image is the single source of truth for the art direction");
    expect(imagePrompts[0]).toContain("Do NOT generate:");
    expect(imagePrompts[0]).toContain("phone mockups");
    expect(imagePrompts[0]).toContain(appInput.appName);
    expect(styleReferenceAnalyzeCalls).toBe(0);
    expect(loadedPaths).toEqual(appInput.screenshots.map((screenshot) => screenshot.path));
  }, 20_000);

  it("adds one AI-first cover composition when cover is requested", async () => {
    const generatedImageBytes = await sharp({ create: { width: 900, height: 1600, channels: 4, background: "#0EA5E9" } }).png().toBuffer();
    const sourceScreenshotBytes = await sharp({ create: { width: 390, height: 844, channels: 4, background: "#FFFFFF" } }).png().toBuffer();
    const imagePrompts: string[] = [];
    const loadedPaths: string[] = [];
    const modelGateway = new ModelGateway({
      providers: {
        openai: {
          async generateObject({ task }) {
            if (task === "style-reference.analyze") return {
              referenceId: styleReference.id,
              visualSummary: "Reference 4 style",
              layoutRhythm: ["cover plus screenshot cards"],
              typographyStyle: ["bold"],
              colorAndLighting: ["blue"],
              compositionRules: ["preserve rhythm"],
              forbiddenCarryovers: ["text"],
            };
            if (task === "visual-system.generate") return visualSystem;
            if (task === "storyboard.generate") return {
              screens: [
                { id: "cover", index: 1, role: "hook", headline: "Plan Van Trips", sourceScreenshotPath: appInput.screenshots[0]!.path },
                ...appInput.screenshots.map((screenshot, index) => ({
                  id: `screen-${index + 1}`,
                  index: index + 2,
                  role: "feature",
                  headline: `Screen ${index + 1}`,
                  sourceScreenshotPath: screenshot.path,
                })),
              ],
            };
            throw new Error(`Unexpected task: ${task}`);
          },
          async generateImage({ prompt }) {
            imagePrompts.push(prompt);
            return { bytes: new Uint8Array(generatedImageBytes), contentType: "image/png" as const };
          },
        },
      },
    });
    const useCase = new GenerateStorePackUseCase({
      modelGateway,
      patternLibrary: new PatternLibrary([]),
      premiumRecipeLibrary: new PremiumRecipeLibrary([premiumRecipe]),
      sourceScreenshotLoader: {
        async load(sourcePath) {
          loadedPaths.push(sourcePath);
          return { bytes: new Uint8Array(sourceScreenshotBytes), contentType: "image/png" };
        },
      },
    });

    const result = await useCase.execute({
      input: appInput,
      provider: "openai",
      model: "gpt-4.1",
      imageModel: "gpt-image-1",
      includeCoverScreen: true,
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 390, height: 844 },
      styleReference: { ...styleReference, imageBase64: Buffer.from("reference").toString("base64") },
    });

    expect(result.assets).toHaveLength(appInput.screenshots.length + 1);
    expect(result.assets[0]?.fileName).toBe("01-cover.png");
    expect(imagePrompts[0]).toContain("cover / portada");
    expect(loadedPaths).toEqual(appInput.screenshots.map((screenshot) => screenshot.path));
  }, 20_000);

  it("uses website context for model inputs and rendered brand planning", async () => {
    const modelInputs: unknown[] = [];
    const modelGateway = new ModelGateway({
      providers: {
        fake: {
          async generateObject({ task, input }) {
            modelInputs.push(input);
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
      landingPageLoader: {
        async load() {
          return `<meta name="theme-color" content="#123456"><style>:root{--accent:#FF3366}</style><h1>Walk through the books you love</h1>`;
        },
      },
    });

    const result = await useCase.execute({
      input: { ...appInput, brand: { websiteUrl: "https://routemuse.example" } },
      provider: "fake",
      model: "fake-fast",
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
      styleReference,
    });

    expect(result.brandKit).toMatchObject({ source: "landing", palette: { primary: "#123456", accent: "#FF3366" } });
    expect(result.productUnderstanding.valueProposition).toBe("Walk through the books you love");
    expect(modelInputs).toHaveLength(2);
    expect(modelInputs).toEqual([
      expect.objectContaining({ landingPage: expect.objectContaining({ headline: "Walk through the books you love" }) }),
      expect.objectContaining({ landingPage: expect.objectContaining({ headline: "Walk through the books you love" }) }),
    ]);
  }, 15_000);

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
      styleReference,
    });

    expect(loadedPaths).toEqual(["input/home.png"]);
  }, 30_000);

  it("requires a standard visual reference before model calls", async () => {
    const modelGateway = new ModelGateway({ providers: {} });
    const useCase = new GenerateStorePackUseCase({ modelGateway, patternLibrary: new PatternLibrary([]) });

    await expect(
      useCase.execute({
        input: appInput,
        provider: "fake",
        model: "fake-fast",
        target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
      } as any),
    ).rejects.toThrow("Choose one standard visual reference before generating.");
  });

  it("stops before model calls when input readiness is blocked", async () => {
    const modelGateway = new ModelGateway({ providers: {} });
    const patternLibrary = new PatternLibrary([]);
    const useCase = new GenerateStorePackUseCase({ modelGateway, patternLibrary });

    await expect(
      useCase.execute({
        input: { ...appInput, screenshots: [] },
        provider: "fake",
        model: "fake-fast",
        target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
        styleReference,
      }),
    ).rejects.toMatchObject({
      code: "input_not_ready",
    });
  });
});
