import { describe, expect, it } from "vitest";

import { AppInputSchema, BrandKitSchema, SceneSetSchema, StoryboardSchema } from "./index";

describe("AppInputSchema", () => {
  it("accepts the minimum universal product input", () => {
    const result = AppInputSchema.safeParse({
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
    });

    expect(result.success).toBe(true);
  });

  it("rejects input without a target store", () => {
    const result = AppInputSchema.safeParse({
      appName: "LiteraryTrip",
      category: "travel",
      targetAudience: "readers who travel",
      mainValueProposition: "turn books into walkable routes",
      targetStores: [],
      baseLocale: "en-US",
      screenshots: [],
    });

    expect(result.success).toBe(false);
  });
});

describe("BrandKitSchema", () => {
  it("accepts a brand kit that records manual brand color precedence", () => {
    const result = BrandKitSchema.safeParse({
      source: "manual",
      palette: {
        background: "#F7F1E7",
        surface: "#FFFAF2",
        text: "#24160F",
        primary: "#3B2416",
        accent: "#D99A32",
      },
      typography: {
        displayFamily: "Inter",
        uiFamily: "Inter",
        weight: 780,
        mood: "serif-editorial",
      },
      imagery: {
        style: "3d",
        keywords: ["books", "maps", "routes"],
      },
      tone: ["warm", "editorial", "premium"],
    });

    expect(result.success).toBe(true);
  });
});

describe("SceneSetSchema", () => {
  it("accepts a premium scene set with split devices, proof objects, and continuity", () => {
    const result = SceneSetSchema.safeParse({
      id: "literarytrip-premium-v1",
      brandKit: {
        source: "mixed",
        palette: {
          background: "#F7F1E7",
          surface: "#FFFAF2",
          text: "#24160F",
          primary: "#3B2416",
          accent: "#D99A32",
        },
        typography: { weight: 780, mood: "serif-editorial" },
        imagery: { style: "3d", keywords: ["book", "map"] },
        tone: ["premium", "editorial"],
      },
      recipeId: "travel-editorial-panorama",
      continuity: {
        sharedBackground: "panorama",
        recurringObjects: ["book", "route-line"],
        deviceTreatment: "progressive",
      },
      scenes: [
        {
          id: "hook",
          index: 1,
          role: "hook",
          composition: "split-devices",
          copy: { headline: "Walk the story", subheadline: "Turn books into city routes" },
          background: { kind: "gradient", paletteRole: "background", intensity: 0.8 },
          devices: [
            { screenshotId: "home", x: 0.18, y: 0.32, scale: 0.62, tilt: -8, crop: "full", depth: 2 },
            { screenshotId: "map", x: 0.58, y: 0.38, scale: 0.58, tilt: 7, crop: "edge-right", depth: 3 },
          ],
          objects: [
            { assetId: "travel/book-3d", kind: "3d-cube", x: 0.78, y: 0.18, scale: 0.8, rotation: -12, depth: 4 },
          ],
          callouts: [{ label: "Route-ready", x: 0.68, y: 0.52, anchorDevice: 1 }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});

describe("StoryboardSchema", () => {
  it("accepts per-screen editable text layer overrides", () => {
    const result = StoryboardSchema.safeParse({
      screens: [
        {
          id: "hook",
          index: 1,
          role: "hook",
          headline: "Walk the pages",
          sourceScreenshotPath: "input/home.png",
          text: {
            headline: {
              fontFamily: "Georgia",
              fontSize: 92,
              fontWeight: 700,
              x: 0.1,
              y: 0.18,
              align: "start",
              maxCharsPerLine: 18,
            },
            subheadline: { fontSize: 30, y: 0.32 },
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });
});
