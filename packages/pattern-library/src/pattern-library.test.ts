import { describe, expect, it } from "vitest";

import type { DesignPattern } from "@app-screenshot-ai/schemas";

import { PatternLibrary } from "./pattern-library";

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

describe("PatternLibrary", () => {
  it("retrieves patterns that match the app category", () => {
    const library = new PatternLibrary(patterns);

    const result = library.retrieve({ category: "travel", tone: [] });

    expect(result.map((pattern) => pattern.id)).toEqual(["travel_editorial_01"]);
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
