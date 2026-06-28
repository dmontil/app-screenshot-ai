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
    expect(sceneSet.scenes).toHaveLength(productUnderstanding.screenInventory.length);
    expect(sceneSet.scenes.map((scene) => scene.composition)).toEqual([
      "hero-poster",
      "split-devices",
      "proof-poster",
    ]);
    expect(sceneSet.backgroundPlates?.[0]).toMatchObject({ style: "utility-flow-system", texture: "blueprint" });
    expect(sceneSet.scenes[0]?.background.plateId).toBe(sceneSet.backgroundPlates?.[0]?.id);
    expect(sceneSet.scenes[1]?.devices).toHaveLength(2);
    expect(sceneSet.scenes[0]?.objects[0]).toMatchObject({ kind: "3d-cube", assetId: "utility/cubes-primary" });
  });

  it("can add one optional cover while still creating one screen per uploaded screenshot", () => {
    const sceneSet = new BuildPremiumSceneSetUseCase().execute({
      brandKit,
      productUnderstanding,
      recipe,
      outputScreenCount: productUnderstanding.screenInventory.length + 1,
      includeCoverScreen: true,
    });

    expect(sceneSet.scenes).toHaveLength(4);
    expect(sceneSet.scenes[0]?.role).toBe("hook");
    expect(sceneSet.scenes[0]?.devices).toEqual([]);
    expect(sceneSet.scenes.slice(1).map((scene) => scene.devices[0]?.screenshotId)).toEqual(["home", "detail", "map"]);
  });

  it("keeps camper-van travel copy and objects app-specific instead of literary", () => {
    const sceneSet = new BuildPremiumSceneSetUseCase().execute({
      brandKit: {
        ...brandKit,
        imagery: { style: "3d", keywords: ["camper-van", "routes", "places"] },
      },
      productUnderstanding: {
        ...productUnderstanding,
        appName: "Vantrip APP",
        category: "travel",
        valueProposition: "Create routes for camper van with IA",
        audience: "travelers with camper van",
      },
      recipe: { ...recipe, id: "travel-editorial-panorama", category: "travel" },
    });

    const serialized = JSON.stringify(sceneSet).toLowerCase();
    expect(serialized).not.toContain("literary");
    expect(serialized).not.toContain("book");
    expect(sceneSet.scenes.map((scene) => scene.copy.headline)).toContain("Map Every Camper Stop");
    expect(sceneSet.scenes.flatMap((scene) => scene.objects).map((object) => object.kind)).toContain("map-pin");
  });
});
