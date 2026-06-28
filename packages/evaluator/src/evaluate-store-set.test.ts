import { describe, expect, it } from "vitest";

import type { SceneSet } from "@app-screenshot-ai/schemas";

import { EvaluateStoreSetUseCase } from "./evaluate-store-set";

const validAsset = {
  id: "screen-1",
  screenIndex: 1,
  store: "app-store" as const,
  device: "iphone-6.9",
  locale: "en-US",
  fileName: "01-hook.png",
  contentType: "image/png" as const,
  width: 1320,
  height: 2868,
  bytes: new Uint8Array([1, 2, 3]),
};

const validScreen = {
  id: "hook",
  index: 1,
  role: "hook",
  headline: "Turn books into routes",
  sourceScreenshotPath: "input/home.png",
};

const premiumSceneSet: SceneSet = {
  id: "premium-scenes",
  recipeId: "utility-blue-depth",
  brandKit: {
    source: "manual",
    palette: { background: "#EEF4FF", surface: "#FFFFFF", text: "#0F172A", primary: "#172554", accent: "#2563EB" },
    typography: { weight: 790, mood: "modern-saas" },
    imagery: { style: "3d", keywords: ["cubes"] },
    tone: ["premium"],
  },
  continuity: { sharedBackground: "gradient", recurringObjects: ["cubes"], deviceTreatment: "progressive" },
  scenes: [
    { id: "one", index: 1, role: "hook", composition: "hero-poster", copy: { headline: "Fast work" }, background: { kind: "gradient", paletteRole: "background", intensity: 0.8 }, devices: [{ screenshotId: "home", x: 0.4, y: 0.5, scale: 0.7, tilt: -6, crop: "full", depth: 2 }], objects: [{ assetId: "cube", kind: "3d-cube", x: 0.8, y: 0.2, scale: 0.8, rotation: 0, depth: 4 }], callouts: [] },
    { id: "two", index: 2, role: "feature", composition: "split-devices", copy: { headline: "Two flows" }, background: { kind: "gradient", paletteRole: "surface", intensity: 0.8 }, devices: [{ screenshotId: "home", x: 0.3, y: 0.5, scale: 0.7, tilt: -6, crop: "full", depth: 2 }, { screenshotId: "map", x: 0.6, y: 0.5, scale: 0.6, tilt: 8, crop: "edge-right", depth: 3 }], objects: [{ assetId: "cube", kind: "3d-cube", x: 0.8, y: 0.2, scale: 0.8, rotation: 0, depth: 4 }], callouts: [] },
    { id: "three", index: 3, role: "proof", composition: "proof-poster", copy: { headline: "Trusted" }, background: { kind: "mesh", paletteRole: "background", intensity: 0.8 }, devices: [{ screenshotId: "detail", x: 0.4, y: 0.5, scale: 0.7, tilt: 0, crop: "full", depth: 2 }], objects: [{ assetId: "badge", kind: "badge", x: 0.7, y: 0.2, scale: 0.7, rotation: 0, depth: 4 }], callouts: [] },
  ],
};

describe("EvaluateStoreSetUseCase", () => {
  it("passes a compliant rendered set", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({ assets: [validAsset], screens: [validScreen] });

    expect(report.passed).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.scores.storeCompliance).toBe(1);
  });

  it("fails assets with dimensions that do not match their target device", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: [{ ...validAsset, width: 1200 }],
      screens: [validScreen],
    });

    expect(report.passed).toBe(false);
    expect(report.issues).toContainEqual({
      code: "invalid_app_store_iphone_6_9_dimensions",
      severity: "error",
      message: "App Store iPhone 6.9 screenshots must be 1320x2868.",
      screenId: "screen-1",
    });
  });

  it("warns when headlines are too long for store screenshots", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: [validAsset],
      screens: [
        {
          ...validScreen,
          headline: "Turn your favorite novels into deeply contextual city walks with literary places",
        },
      ],
    });

    expect(report.passed).toBe(true);
    expect(report.issues).toContainEqual({
      code: "headline_too_long",
      severity: "warning",
      message: "Keep screenshot headlines at 8 words or fewer.",
      screenId: "hook",
    });
    expect(report.scores.textQuality).toBeLessThan(1);
  });

  it("scores premium scene sets for composition diversity, depth, and continuity", () => {
    const report = new EvaluateStoreSetUseCase().execute({ assets: [], screens: [], sceneSet: premiumSceneSet });

    expect(report.premium).toMatchObject({ rating: "premium-candidate" });
    expect(report.premium!.score).toBeGreaterThan(0.8);
  });

  it("warns when a premium scene set lacks composition and object depth", () => {
    const weakSceneSet: SceneSet = {
      ...premiumSceneSet,
      scenes: premiumSceneSet.scenes.map((scene) => ({ ...scene, composition: "hero-poster", objects: [], devices: scene.devices.slice(0, 1).map((device) => ({ ...device, crop: "full" })) })),
      continuity: { sharedBackground: "solid", recurringObjects: [], deviceTreatment: "consistent" },
    };

    const report = new EvaluateStoreSetUseCase().execute({ assets: [], screens: [], sceneSet: weakSceneSet });

    expect(report.premium!.rating).toBe("needs-iteration");
    expect(report.issues.map((issue) => issue.code)).toContain("premium_scene_set_needs_more_depth");
  });

  it("warns when a full set repeats too few layout treatments", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: Array.from({ length: 5 }, (_, index) => ({ ...validAsset, id: `screen-${index + 1}`, screenIndex: index + 1 })),
      screens: Array.from({ length: 5 }, (_, index) => ({
        ...validScreen,
        id: `screen-${index + 1}`,
        index: index + 1,
        treatment: "hero-device" as const,
      })),
    });

    expect(report.passed).toBe(true);
    expect(report.issues).toContainEqual({
      code: "too_little_layout_diversity",
      severity: "warning",
      message: "Use at least 3 distinct screenshot treatments across a 5-screen set.",
    });
    expect(report.scores.campaignConsistency).toBeLessThan(1);
  });
});
