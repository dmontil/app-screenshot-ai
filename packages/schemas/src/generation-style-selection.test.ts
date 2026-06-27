import { describe, expect, it } from "vitest";

import { GenerationStyleSelectionSchema, STANDARD_STYLE_REFERENCES, StandardStyleReferenceSchema, getStandardStyleReference } from "./index";

describe("GenerationStyleSelectionSchema", () => {
  it("requires exactly one standard visual reference and a Gemini/OpenAI provider", () => {
    expect(
      GenerationStyleSelectionSchema.safeParse({
        styleReferenceId: "sc-1",
        aiProvider: "openai",
      }).success,
    ).toBe(true);

    expect(GenerationStyleSelectionSchema.safeParse({ aiProvider: "openai" }).success).toBe(false);
    expect(GenerationStyleSelectionSchema.safeParse({ styleReferenceId: "sc-1" }).success).toBe(false);
    expect(
      GenerationStyleSelectionSchema.safeParse({
        styleReferenceId: "sc-1",
        aiProvider: "fixture",
      }).success,
    ).toBe(false);
  });

  it("exposes four repo-owned standard references with stable preview paths", () => {
    expect(STANDARD_STYLE_REFERENCES.map((reference) => reference.id)).toEqual([
      "sc-1",
      "sc-2",
      "sc-3",
      "sc-4",
    ]);
    expect(STANDARD_STYLE_REFERENCES.every((reference) => StandardStyleReferenceSchema.safeParse(reference).success)).toBe(true);
    expect(getStandardStyleReference("sc-4")?.previewPath).toBe("/style-references/sc_4.jpeg");
  });
});
