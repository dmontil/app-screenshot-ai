import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { GenerateStorePackError } from "@app-screenshot-ai/ai-pipeline";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { ModelGateway, type ModelProviderPort } from "@app-screenshot-ai/model-gateway";
import { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import type { AppInput } from "@app-screenshot-ai/schemas";
import { describe, expect, it } from "vitest";

import { LocalProjectGenerationSession } from "./local-project-generation-session";

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
          input: { ...appInput, screenshots: appInput.screenshots.slice(0, 1) },
          provider: "fixture",
          model: "fixture-v1",
          target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
        }),
      ).rejects.toBeInstanceOf(GenerateStorePackError);

      expect(providerCalls).toBe(0);
      const projects = await store.listProjects();
      expect(projects[0]?.generations).toEqual([]);

      const readiness = JSON.parse(await readFile(path.join(rootDir, "blocked-app", "pipeline", "input-readiness.json"), "utf8"));
      expect(readiness).toMatchObject({ canGenerate: false, status: "blocked" });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  it("generates and saves a versioned local project store pack", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "app-screenshot-ai-session-"));
    try {
      const session = new LocalProjectGenerationSession({
        store: new LocalProjectStore({ rootDir }),
        modelGateway: fakeGateway(),
        patternLibrary: patternLibrary(),
      });

      const result = await session.generateStorePack({
        projectId: "literarytrip",
        input: appInput,
        provider: "fixture",
        model: "fixture-v1",
        label: "AI generation",
        target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
      });

      expect(result).toMatchObject({
        projectId: "literarytrip",
        provider: "fixture",
        model: "fixture-v1",
        localProjectPath: path.join(rootDir, "literarytrip"),
        zip: { fileName: "literarytrip-store-pack.zip" },
      });
      expect(result.generationId).toMatch(/^gen-/);
      expect(result.screenshots).toHaveLength(1);
      expect(result.qualityReport.passed).toBe(true);
      expect(result.visualSystem.id).toBe("warm-editorial-v1");
      expect(result.storyboard.screens[0]?.headline).toBe("Turn books into routes");
      expect(result.exportManifest.items[0]?.path).toBe("app-store/iphone-6.9/en-US/01-hook.png");
      expect(result.zip.bytes.byteLength).toBeGreaterThan(0);

      const generation = await new LocalProjectStore({ rootDir }).readGeneration("literarytrip", result.generationId);
      expect(generation.label).toBe("AI generation");
      expect(generation.storyboard.screens[0]?.headline).toBe("Turn books into routes");
      expect(generation.renders[0]?.fileName).toBe("01-hook.png");
      expect(generation.zip.fileName).toBe("literarytrip-store-pack.zip");

      const readiness = JSON.parse(await readFile(path.join(rootDir, "literarytrip", "pipeline", "input-readiness.json"), "utf8"));
      expect(readiness.canGenerate).toBe(true);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  }, 10_000);
});
