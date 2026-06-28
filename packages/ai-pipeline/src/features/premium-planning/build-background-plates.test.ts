import { describe, expect, it } from "vitest";

import type { BrandKit, ProductUnderstanding } from "@app-screenshot-ai/schemas";

import { BuildBackgroundPlatesUseCase } from "./build-background-plates";

const brandKit: BrandKit = {
  source: "category-default",
  palette: { background: "#F7F1E7", surface: "#FFFAF2", text: "#24160F", primary: "#3B2416", accent: "#D99A32" },
  typography: { weight: 780, mood: "serif-editorial" },
  imagery: { style: "illustration", keywords: ["books", "maps", "routes"] },
  tone: ["warm", "editorial", "premium"],
};

const product: ProductUnderstanding = {
  appName: "LiteraryTrip",
  category: "travel",
  valueProposition: "turn books into walkable routes",
  audience: "readers who travel",
  screenInventory: [{ screenshotId: "home", sourcePath: "input/home.png", role: "home", dominantColors: ["#D99A32"], visualDensity: "medium", bestFor: ["hook"] }],
};

describe("BuildBackgroundPlatesUseCase", () => {
  it("builds several premium category-native background plates with safe negative space", () => {
    const plates = new BuildBackgroundPlatesUseCase().execute({ brandKit, productUnderstanding: product });

    expect(plates.map((plate) => plate.style)).toEqual([
      "travel-map-sketch",
      "travel-map-sketch",
      "abstract-material",
    ]);
    expect(plates[0]).toMatchObject({
      texture: "aged-paper",
      contrast: "low",
      motifs: ["map-lines", "route-stops", "city-sketch"],
      safeZone: { x: 0.06, y: 0.2, width: 0.62, height: 0.74 },
    });
    expect(plates.every((plate) => plate.safeZone.height >= 0.68)).toBe(true);
  });

  it("uses a clearly different plate family for utility apps", () => {
    const plates = new BuildBackgroundPlatesUseCase().execute({
      brandKit: {
        ...brandKit,
        palette: { background: "#EAF2FF", surface: "#F8FBFF", text: "#0F172A", primary: "#1D4ED8", accent: "#2563EB" },
        imagery: { style: "abstract", keywords: ["cubes", "cards", "automation"] },
        tone: ["crisp", "practical", "premium"],
      },
      productUnderstanding: { ...product, category: "utility" },
    });

    expect(plates[0]?.style).toBe("utility-flow-system");
    expect(plates[0]?.texture).toBe("blueprint");
    expect(plates[0]?.palette.base).not.toBe("#F7F1E7");
  });
});
