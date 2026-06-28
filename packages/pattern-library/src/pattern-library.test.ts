import { describe, expect, it } from "vitest";

import type { DesignPattern, PremiumRecipe } from "@app-screenshot-ai/schemas";

import { createDefaultPremiumRecipeLibrary, PatternLibrary, PremiumRecipeLibrary } from "./pattern-library";

const patterns: DesignPattern[] = [
  {
    id: "travel_editorial_01",
    category: "travel",
    conversionIntent: "discovery",
    layoutFamily: "top_headline_center_device",
    tone: ["editorial", "warm", "premium"],
    rules: { maxHeadlineWords: 6, backgroundComplexity: "low", uiVisibility: "high" },
    whyItWorks: ["Keeps destination UI visible"],
  },
  {
    id: "productivity_calm_01",
    category: "productivity",
    conversionIntent: "clarity",
    layoutFamily: "top_headline_center_device",
    tone: ["calm", "focused"],
    rules: { maxHeadlineWords: 5, backgroundComplexity: "low", uiVisibility: "high" },
    whyItWorks: ["Keeps task UI visible"],
  },
];

const premiumRecipes: PremiumRecipe[] = [
  {
    id: "travel-editorial-panorama",
    category: "travel",
    name: "Editorial route panorama",
    qualityTarget: "top-1-percent",
    tone: ["editorial", "warm", "premium"],
    setRhythm: ["hook", "feature", "proof", "comparison", "cta"],
    scenes: [
      { composition: "hero-poster", requiredAssets: ["gradient"], deviceSlots: 1, copyStyle: "big-loud" },
      { composition: "panoramic-sequence", requiredAssets: ["3d-object"], deviceSlots: 1, copyStyle: "minimal-premium" },
      { composition: "split-devices", requiredAssets: ["3d-object"], deviceSlots: 2, copyStyle: "big-loud" },
    ],
  },
  {
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
    ],
  },
];

describe("createDefaultPremiumRecipeLibrary", () => {
  it("provides category recipes with premium compositions for the core demo categories", () => {
    const library = createDefaultPremiumRecipeLibrary();

    expect(library.retrieve({ category: "travel", tone: ["premium"] })[0]?.id).toBe("travel-editorial-panorama");
    expect(library.retrieve({ category: "utility", tone: ["practical"] })[0]?.scenes.map((scene) => scene.composition)).toContain("split-devices");
    expect(library.retrieve({ category: "utilities", tone: ["practical"] })[0]?.id).toBe("utility-blue-depth");
    expect(library.retrieve({ category: "finance", tone: ["trust"] })[0]?.scenes.map((scene) => scene.composition)).toContain("proof-poster");
    expect(library.retrieve({ category: "fitness", tone: ["energetic"] })[0]?.scenes.map((scene) => scene.composition)).toContain("object-led");
  });
});

describe("PremiumRecipeLibrary", () => {
  it("retrieves category-native premium recipes with structural composition differences", () => {
    const library = new PremiumRecipeLibrary(premiumRecipes);

    const travel = library.retrieve({ category: "travel", tone: ["premium"] });
    const utility = library.retrieve({ category: "utility", tone: ["practical"] });

    expect(travel[0]?.id).toBe("travel-editorial-panorama");
    expect(utility[0]?.id).toBe("utility-blue-depth");
    expect(travel[0]?.scenes.map((scene) => scene.composition)).not.toEqual(
      utility[0]?.scenes.map((scene) => scene.composition),
    );
  });
});

describe("PatternLibrary", () => {
  it("retrieves patterns that match the app category", () => {
    const library = new PatternLibrary(patterns);

    const result = library.retrieve({ category: "travel", tone: [] });
    const utilityAlias = library.retrieve({ category: "utilities", tone: [] });

    expect(result.map((pattern) => pattern.id)).toEqual(["travel_editorial_01"]);
    expect(utilityAlias.map((pattern) => pattern.id)).toEqual(["productivity_calm_01"]);
  });

  it("prioritizes patterns that match requested tone", () => {
    const library = new PatternLibrary([
      ...patterns,
      {
        id: "travel_bold_01",
        category: "travel",
        conversionIntent: "energy",
        layoutFamily: "diagonal_split_device",
        tone: ["bold", "energetic"],
        rules: { maxHeadlineWords: 4, backgroundComplexity: "medium", uiVisibility: "medium" },
        whyItWorks: ["Creates high contrast for fast scanning"],
      },
    ]);

    const result = library.retrieve({ category: "travel", tone: ["bold"] });

    expect(result.map((pattern) => pattern.id)).toEqual(["travel_bold_01", "travel_editorial_01"]);
  });
});
