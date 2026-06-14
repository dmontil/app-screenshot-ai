import { describe, expect, it } from "vitest";

import type { BrandKit, PremiumRecipe, ProductUnderstanding } from "@app-screenshot-ai/schemas";

import { BuildPremiumSceneSetUseCase } from "./build-premium-scene-set";

const brandKit: BrandKit = {
  source: "manual",
  palette: { background: "#EEF4FF", surface: "#FFFFFF", text: "#0F172A", primary: "#172554", accent: "#2563EB" },
  typography: { weight: 790, mood: "modern-saas" },
  imagery: { style: "3d", keywords: ["cubes", "cards"] },
  tone: ["crisp", "practical"],
};

const productUnderstanding: ProductUnderstanding = {
  appName: "Toolbox",
  category: "utility",
  valueProposition: "get important tasks done faster",
  audience: "busy operators",
  screenInventory: [
    { screenshotId: "home", sourcePath: "input/home.png", role: "home", dominantColors: ["#172554"], visualDensity: "medium", bestFor: ["hook", "cta"] },
    { screenshotId: "detail", sourcePath: "input/detail.png", role: "detail", dominantColors: ["#2563EB"], visualDensity: "high", bestFor: ["feature", "proof"] },
    { screenshotId: "map", sourcePath: "input/map.png", role: "map", dominantColors: ["#C7D2FE"], visualDensity: "medium", bestFor: ["comparison"] },
  ],
};

const recipe: PremiumRecipe = {
  id: "utility-blue-depth",
  category: "utility",
  name: "Blue utility depth",
  qualityTarget: "premium",
  tone: ["crisp", "practical"],
  setRhythm: ["hook", "feature", "proof", "comparison", "cta"],
  scenes: [
    { composition: "hero-poster", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "big-loud" },
    { composition: "split-devices", requiredAssets: ["3d-object"], deviceSlots: 2, copyStyle: "minimal-premium" },
    { composition: "proof-poster", requiredAssets: ["badge"], deviceSlots: 1, copyStyle: "proof-heavy" },
    { composition: "cropped-edge-device", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "big-loud" },
    { composition: "object-led", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "minimal-premium" },
  ],
};

describe("BuildPremiumSceneSetUseCase", () => {
  it("turns product understanding and a premium recipe into a scene set with multiple composition types", () => {
    const sceneSet = new BuildPremiumSceneSetUseCase().execute({ brandKit, productUnderstanding, recipe });

    expect(sceneSet.recipeId).toBe("utility-blue-depth");
    expect(sceneSet.scenes).toHaveLength(5);
    expect(sceneSet.scenes.map((scene) => scene.composition)).toEqual([
      "hero-poster",
      "split-devices",
      "proof-poster",
      "cropped-edge-device",
      "object-led",
    ]);
    expect(sceneSet.backgroundPlates?.[0]).toMatchObject({ style: "utility-flow-system", texture: "blueprint" });
    expect(sceneSet.scenes[0]?.background.plateId).toBe(sceneSet.backgroundPlates?.[0]?.id);
    expect(sceneSet.scenes[1]?.devices).toHaveLength(2);
    expect(sceneSet.scenes[0]?.objects[0]).toMatchObject({ kind: "3d-cube", assetId: "utility/cubes-primary" });
  });
});
