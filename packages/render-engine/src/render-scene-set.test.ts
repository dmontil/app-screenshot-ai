import sharp from "sharp";
import { describe, expect, it } from "vitest";

import type { ProductUnderstanding, SceneSet } from "@app-screenshot-ai/schemas";

import { RenderSceneSetUseCase, getSceneSetRenderDiagnostics } from "./render-scene-set";

const sceneSet: SceneSet = {
  id: "utility-premium",
  recipeId: "utility-blue-depth",
  brandKit: {
    source: "manual",
    palette: { background: "#EEF4FF", surface: "#FFFFFF", text: "#0F172A", primary: "#172554", accent: "#2563EB", secondary: "#C7D2FE" },
    typography: { displayFamily: "Inter", uiFamily: "Inter", weight: 820, mood: "modern-saas" },
    imagery: { style: "3d", keywords: ["cubes", "cards"] },
    tone: ["crisp", "premium"],
  },
  continuity: { sharedBackground: "gradient", recurringObjects: ["cubes", "cards"], deviceTreatment: "progressive" },
  scenes: [
    {
      id: "hook",
      index: 1,
      role: "hook",
      composition: "hero-poster",
      copy: { headline: "Get work done faster", subheadline: "All your tools in one crisp flow" },
      background: { kind: "gradient", paletteRole: "background", intensity: 0.9 },
      devices: [{ screenshotId: "home", x: 0.46, y: 0.52, scale: 0.7, tilt: -8, crop: "full", depth: 2 }],
      objects: [{ assetId: "utility/cube", kind: "3d-cube", x: 0.82, y: 0.18, scale: 0.9, rotation: -12, depth: 4 }],
      callouts: [],
    },
    {
      id: "compare",
      index: 2,
      role: "comparison",
      composition: "split-devices",
      copy: { headline: "Compare flows instantly", subheadline: "Show two app states in one premium frame" },
      background: { kind: "mesh", paletteRole: "surface", intensity: 0.85 },
      devices: [
        { screenshotId: "home", x: 0.34, y: 0.54, scale: 0.66, tilt: -9, crop: "full", depth: 2 },
        { screenshotId: "detail", x: 0.64, y: 0.56, scale: 0.58, tilt: 8, crop: "edge-right", depth: 3 },
      ],
      objects: [{ assetId: "utility/card", kind: "card", x: 0.76, y: 0.24, scale: 0.7, rotation: 8, depth: 5 }],
      callouts: [{ label: "Two moments", x: 0.62, y: 0.66, anchorDevice: 1 }],
    },
    {
      id: "proof",
      index: 3,
      role: "proof",
      composition: "proof-poster",
      copy: { headline: "Trusted every day", subheadline: "Turn credibility into a visual asset", badge: "4.9 ★ Rated" },
      background: { kind: "gradient", paletteRole: "background", intensity: 0.9 },
      devices: [{ screenshotId: "detail", x: 0.52, y: 0.62, scale: 0.56, tilt: 0, crop: "full", depth: 2 }],
      objects: [{ assetId: "utility/badge", kind: "badge", x: 0.24, y: 0.68, scale: 0.8, rotation: -4, depth: 4 }],
      callouts: [],
    },
  ],
};

const productUnderstanding: ProductUnderstanding = {
  appName: "UtilityPro",
  category: "utility",
  valueProposition: "get important tasks done faster",
  audience: "busy operators",
  screenInventory: [
    { screenshotId: "home", sourcePath: "input/home.png", role: "home", dominantColors: ["#2563EB"], visualDensity: "medium", bestFor: ["hook"] },
    { screenshotId: "detail", sourcePath: "input/detail.png", role: "detail", dominantColors: ["#172554"], visualDensity: "high", bestFor: ["feature", "comparison", "proof"] },
  ],
};

describe("RenderSceneSetUseCase", () => {
  it("keeps category art direction distinct and makes primary mockups dominate the screenshot", () => {
    const target = { store: "app-store" as const, device: "iphone-6.9" as const, locale: "en-US", width: 1320, height: 2868 };
    const utilityDiagnostics = getSceneSetRenderDiagnostics({ sceneSet, target });
    const travelDiagnostics = getSceneSetRenderDiagnostics({
      sceneSet: {
        ...sceneSet,
        id: "travel-premium",
        recipeId: "travel-editorial-panorama",
        brandKit: {
          ...sceneSet.brandKit,
          imagery: { style: "3d", keywords: ["books", "maps", "routes"] },
        },
      },
      target,
    });

    expect(utilityDiagnostics.artDirection).toBe("utility");
    expect(travelDiagnostics.artDirection).toBe("travel");
    expect(utilityDiagnostics.artDirection).not.toBe(travelDiagnostics.artDirection);
    expect(utilityDiagnostics.effectivePalette.accent).toBe("#2563EB");
    expect(travelDiagnostics.effectivePalette.accent).toBe("#2563EB");
    expect(utilityDiagnostics.foregroundDecorativeObjects).toBe(0);
    expect(utilityDiagnostics.framesByScene[0]!.frames[0]!.height / target.height).toBeGreaterThanOrEqual(0.68);
    expect(utilityDiagnostics.framesByScene[2]!.frames[0]!.height / target.height).toBeGreaterThanOrEqual(0.68);
  });

  it("renders premium SceneSet compositions and loads every device screenshot used by split mockups", async () => {
    const red = new Uint8Array(await sharp({ create: { width: 390, height: 844, channels: 4, background: "#FF5533" } }).png().toBuffer());
    const blue = new Uint8Array(await sharp({ create: { width: 390, height: 844, channels: 4, background: "#3355FF" } }).png().toBuffer());
    const loadedPaths: string[] = [];

    const assets = await new RenderSceneSetUseCase().execute({
      sceneSet,
      productUnderstanding,
      target: { store: "app-store", device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 },
      async loadSourceScreenshot(sourcePath) {
        loadedPaths.push(sourcePath);
        return { bytes: sourcePath.includes("detail") ? blue : red, contentType: "image/png" };
      },
    });

    expect(assets.map((asset) => asset.fileName)).toEqual(["01-hook.png", "02-comparison.png", "03-proof.png"]);
    expect(loadedPaths).toContain("input/home.png");
    expect(loadedPaths).toContain("input/detail.png");
    const first = await sharp(assets[0]!.bytes).metadata();
    expect(first).toMatchObject({ width: 1320, height: 2868 });
    expect(assets.every((asset) => asset.bytes.byteLength > 50_000)).toBe(true);
  }, 10_000);
});
