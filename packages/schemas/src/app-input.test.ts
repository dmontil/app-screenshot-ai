import { describe, expect, it } from "vitest";

import { AppInputSchema, StoryboardSchema } from "./index";

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
