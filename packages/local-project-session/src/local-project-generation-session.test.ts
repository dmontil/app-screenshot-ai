import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { GenerateStorePackError } from "@app-screenshot-ai/ai-pipeline";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { ModelGateway, type ModelProviderPort } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary, PremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import type { AppInput, Storyboard, VisualSystem } from "@app-screenshot-ai/schemas";
import { describe, expect, it } from "vitest";

import { LocalProjectGenerationSession } from "./local-project-generation-session";

const styleReference = {
  id: "sc-1",
  name: "Reference 1",
  path: "apps/web/public/style-references/sc_1.jpeg",
  previewPath: "/style-references/sc_1.jpeg",
  mimeType: "image/jpeg" as const,
  width: 800,
  height: 450,
  imageBase64: "base64-reference",
};

const appInput: AppInput = {
  appName: "LiteraryTrip",
  category: "travel",
  targetAudience: "readers who travel",
  mainValueProposition: "turn books into walkable routes",
  targetStores: ["app-store"],
  baseLocale: "en-US",
  screenshots: [
    { id: "home", path: "input/home.png", kind: "functional" },
    { id: "search", path: "input/search.png", kind: "functional" },
    { id: "map", path: "input/map.png", kind: "functional" },
  ],
};

function fakeGateway(provider?: ModelProviderPort) {
  return new ModelGateway({
    providers: {
      fixture: provider ?? {
        async generateObject({ task }) {
          if (task === "visual-system.generate") {
            return {
              id: "warm-editorial-v1",
              palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
              typography: { headlineFamily: "Inter", headlineWeight: 760 },
              layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 },
            };
          }

          if (task === "storyboard.generate") {
            return {
              screens: [
                { id: "hook", index: 1, role: "hook", headline: "Turn books into routes", sourceScreenshotPath: "input/home.png" },
              ],
            };
          }

          throw new Error(`Unexpected task: ${task}`);
        },
      },
    },
  });
}

function premiumRecipeLibrary() {
  return new PremiumRecipeLibrary([
    {
      id: "travel-editorial-panorama",
      category: "travel",
      name: "Editorial route panorama",
      qualityTarget: "top-1-percent",
      tone: ["editorial", "premium"],
      setRhythm: ["hook", "feature", "proof", "comparison", "cta"],
      scenes: [
        { composition: "hero-poster", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "big-loud" },
        { composition: "split-devices", requiredAssets: ["3d-object"], deviceSlots: 2, copyStyle: "minimal-premium" },
        { composition: "proof-poster", requiredAssets: ["badge"], deviceSlots: 1, copyStyle: "proof-heavy" },
        { composition: "cropped-edge-device", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "big-loud" },
        { composition: "object-led", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "minimal-premium" },
      ],
    },
  ]);
}

function patternLibrary() {
  return new PatternLibrary([
    {
      id: "travel_discovery_01",
      category: "travel",
      conversionIntent: "discovery",
      layoutFamily: "top_headline_center_device",
      tone: ["editorial", "warm"],
      rules: { maxHeadlineWords: 6, backgroundComplexity: "low", uiVisibility: "high" },
      whyItWorks: ["Keeps the app UI visible."],
    },
  ]);
}

const visualSystem: VisualSystem = {
  id: "warm-editorial-v1",
  palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
  typography: { headlineFamily: "Inter", headlineWeight: 760 },
  layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 },
};

const editedStoryboard: Storyboard = {
  screens: [{ id: "hook", index: 1, role: "hook", headline: "Edited route copy", sourceScreenshotPath: "input/home.png" }],
};

describe("LocalProjectGenerationSession", () => {
  it("blocks unready input before provider generation and does not save a completed generation", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-session-"));
    try {
      let providerCalls = 0;
      const store = new LocalProjectStore({ rootDir });
      const session = new LocalProjectGenerationSession({
        store,
        modelGateway: fakeGateway({
          async generateObject() {
            providerCalls += 1;
            return {};
          },
        }),
        patternLibrary: patternLibrary(),
      });

      await expect(
        session.generateStorePack({
          projectId: "blocked-app",
          input: { ...appInput, screenshots: [] },
          provider: "fixture",
          model: "fixture-v1",
          target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
          styleReference,
        }),
      ).rejects.toBeInstanceOf(GenerateStorePackError);

      expect(providerCalls).toBe(0);
      const projects = await store.listProjects();
      expect(projects[0]).toMatchObject({ projectId: "blocked-app", status: "blocked" });
      expect(projects[0]?.generations).toEqual([]);

      const readiness = JSON.parse(await readFile(path.join(rootDir, "blocked-app", "pipeline", "input-readiness.json"), "utf8"));
      expect(readiness).toMatchObject({ canGenerate: false, status: "blocked" });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("rerenders edited storyboard copy and saves a manual generation", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-session-"));
    try {
      const store = new LocalProjectStore({ rootDir });
      await store.createProject({ projectId: "literarytrip", input: appInput });
      const session = new LocalProjectGenerationSession({
        store,
        modelGateway: fakeGateway({ async generateObject() { throw new Error("provider should not be called"); } }),
        patternLibrary: patternLibrary(),
      });

      const result = await session.rerenderStorePack({
        projectId: "literarytrip",
        visualSystem,
        storyboard: editedStoryboard,
        locale: "en-US",
        label: "Manual edit",
        persist: true,
      });

      expect(result.generationId).toMatch(/^gen-/);
      expect(result.storyboard.screens[0]?.headline).toBe("Edited route copy");
      expect(result.zip.fileName).toBe("literarytrip-store-pack.zip");
      expect(result.screenshots[0]?.fileName).toBe("01-hook.png");

      const generation = await store.readGeneration("literarytrip", result.generationId!);
      expect(generation.kind).toBe("manual-rerender");
      expect(generation.label).toBe("Manual edit");
      expect(generation.storyboard.screens[0]?.headline).toBe("Edited route copy");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 30_000);

  it("can return an unsaved manual preview without adding a generation", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-session-"));
    try {
      const store = new LocalProjectStore({ rootDir });
      await store.createProject({ projectId: "literarytrip", input: appInput });
      const session = new LocalProjectGenerationSession({ store, modelGateway: fakeGateway(), patternLibrary: patternLibrary() });

      const result = await session.rerenderStorePack({
        projectId: "literarytrip",
        visualSystem,
        storyboard: editedStoryboard,
        locale: "en-US",
        persist: false,
      });

      expect(result.generationId).toBeUndefined();
      expect(result.screenshots).toHaveLength(1);
      expect((await store.listProjects())[0]?.generations).toEqual([]);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 30_000);

  it("generates and saves a versioned local project store pack", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-session-"));
    try {
      const session = new LocalProjectGenerationSession({
        store: new LocalProjectStore({ rootDir }),
        modelGateway: fakeGateway(),
        patternLibrary: patternLibrary(),
        premiumRecipeLibrary: premiumRecipeLibrary(),
      });

      const result = await session.generateStorePack({
        projectId: "literarytrip",
        input: appInput,
        provider: "fixture",
        model: "fixture-v1",
        label: "AI generation",
        target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
        styleReference,
      });

      expect(result).toMatchObject({
        projectId: "literarytrip",
        provider: "fixture",
        model: "fixture-v1",
        localProjectPath: path.join(rootDir, "literarytrip"),
        zip: { fileName: "literarytrip-store-pack.zip" },
      });
      expect(result.generationId).toMatch(/^gen-/);
      expect(result.screenshots).toHaveLength(appInput.screenshots.length);
      expect(result.qualityReport.passed).toBe(true);
      expect(result.visualSystem.id).toBe("warm-editorial-v1");
      expect(result.storyboard.screens[0]?.headline).toBe("Turn books into routes");
      expect(result.brandKit!.source).toBe("category-default");
      expect(result.premiumRecipes!.map((recipe) => recipe.id)).toEqual(["travel-editorial-panorama"]);
      expect(result.sceneSet?.scenes.map((scene) => scene.composition)).toContain("split-devices");
      expect(result.exportManifest.items[0]?.path).toBe("app-store/iphone-6.9/en-US/01-feature.png");
      expect(result.styleReference).toMatchObject({ id: "sc-1", name: "Reference 1" });
      expect(result.styleReference?.imageBase64).toBeUndefined();
      expect(result.zip.bytes.byteLength).toBeGreaterThan(0);

      const generation = await new LocalProjectStore({ rootDir }).readGeneration("literarytrip", result.generationId!);
      expect(generation.label).toBe("AI generation");
      expect(generation.storyboard.screens[0]?.headline).toBe("Turn books into routes");
      expect(generation.renders[0]?.fileName).toBe("01-feature.png");
      expect(generation.zip.fileName).toBe("literarytrip-store-pack.zip");
      expect(generation.styleReference).toMatchObject({ id: "sc-1" });

      const readiness = JSON.parse(await readFile(path.join(rootDir, "literarytrip", "pipeline", "input-readiness.json"), "utf8"));
      expect(readiness.canGenerate).toBe(true);
      const sceneSet = JSON.parse(await readFile(path.join(rootDir, "literarytrip", "pipeline", "scene-set.json"), "utf8"));
      expect(sceneSet.recipeId).toBe("travel-editorial-panorama");
      const storedStyleReference = JSON.parse(await readFile(path.join(rootDir, "literarytrip", "pipeline", "style-reference.json"), "utf8"));
      expect(storedStyleReference.id).toBe("sc-1");
      expect(storedStyleReference.imageBase64).toBeUndefined();
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 90_000);
});
