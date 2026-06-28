import { describe, expect, it } from "vitest";

import type { BrandKit, PremiumRecipe, ProductUnderstanding, SceneSet } from "@app-screenshot-ai/schemas";

import { BuildPremiumCandidateSceneSetsUseCase } from "./build-premium-candidates";

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

function objectCount(sceneSet: SceneSet): number {
  return sceneSet.scenes.reduce((total, scene) => total + scene.objects.length, 0);
}

describe("BuildPremiumCandidateSceneSetsUseCase", () => {
  it("creates several no-human premium candidates with increasingly rich object/depth systems", () => {
    const candidates = new BuildPremiumCandidateSceneSetsUseCase().execute({ brandKit, productUnderstanding, recipe });

    expect(candidates.map((candidate) => candidate.variant)).toEqual(["balanced", "object-rich", "split-heavy", "dark-premium", "director-cut"]);
    expect(candidates.map((candidate) => candidate.sceneSet.id)).toEqual([
      "toolbox-utility-blue-depth-balanced",
      "toolbox-utility-blue-depth-object-rich",
      "toolbox-utility-blue-depth-split-heavy",
      "toolbox-utility-blue-depth-dark-premium",
      "toolbox-utility-blue-depth-director-cut",
    ]);
    expect(objectCount(candidates[1]!.sceneSet)).toBeGreaterThan(objectCount(candidates[0]!.sceneSet));
    expect(candidates[2]!.sceneSet.scenes.filter((scene) => scene.composition === "split-devices").length).toBeGreaterThan(1);
    expect(candidates[3]!.sceneSet.scenes.every((scene) => scene.background.kind === "dark-stage")).toBe(true);
    expect(new Set(candidates[4]!.sceneSet.scenes.map((scene) => scene.background.kind)).size).toBeGreaterThan(1);
    expect(objectCount(candidates[4]!.sceneSet)).toBeGreaterThan(objectCount(candidates[1]!.sceneSet));
  });
});
