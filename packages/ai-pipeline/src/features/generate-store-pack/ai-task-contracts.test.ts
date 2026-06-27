import { describe, expect, it } from "vitest";

import { storyboardTaskContract, visualSystemTaskContract } from "./ai-task-contracts";

const app = {
  appName: "LiteraryTrip",
  category: "travel",
  targetAudience: "readers who travel",
  mainValueProposition: "turn books into routes",
  targetStores: ["app-store" as const],
  baseLocale: "en-US",
  screenshots: [
    { id: "home", path: "input/home.png", kind: "functional" as const },
    { id: "search", path: "input/search.png", kind: "functional" as const },
  ],
};

const patterns = [
  {
    id: "travel_discovery_01",
    category: "travel",
    conversionIntent: "discovery",
    layoutFamily: "top_headline_center_device",
    tone: ["warm"],
    rules: { maxHeadlineWords: 6, backgroundComplexity: "low" as const, uiVisibility: "high" as const },
    whyItWorks: ["Keeps UI visible"],
  },
];

const styleReference = {
  id: "premium-dark-01",
  name: "Premium Dark Reference",
  path: "standard-style-references/premium-dark-01.jpeg",
  mimeType: "image/jpeg" as const,
  width: 1280,
  height: 720,
  imageBase64: "base64-reference",
};

describe("AI task contracts", () => {
  it("describes the VisualSystem generation task in one contract", () => {
    const contract = visualSystemTaskContract({ app, patterns });

    expect(contract.task).toBe("visual-system.generate");
    expect(contract.input).toMatchObject({ app, patterns });
    expect(contract.input.outputContract.constraints).toContain("Return only valid JSON matching requiredJsonShape.");
    expect(contract.schema.safeParse(contract.fixture()).success).toBe(true);
  });

  it("passes landing page context into model tasks so providers can write better copy", () => {
    const landingPage = {
      url: "https://routemuse.example",
      headline: "Walk through the books you love",
      description: "Discover book locations and turn them into walkable city routes.",
      extractedColors: ["#123456", "#FF3366"],
    };

    const visualSystem = visualSystemTaskContract({ app, patterns, landingPage });
    const storyboard = storyboardTaskContract({ app, patterns, visualSystem: visualSystem.fixture(), landingPage });

    expect(visualSystem.input.landingPage).toEqual(landingPage);
    expect(storyboard.input.landingPage).toEqual(landingPage);
    expect(storyboard.input.outputContract.constraints).toContain("Use landingPage headline/description as product context when it is provided, but keep every screenshot headline under 8 words.");
  });

  it("passes the selected visual reference into model tasks with style-following constraints", () => {
    const visualSystem = visualSystemTaskContract({ app, patterns, styleReference });
    const storyboard = storyboardTaskContract({ app, patterns, visualSystem: visualSystem.fixture(), styleReference });

    expect(visualSystem.input.styleReference).toEqual(styleReference);
    expect(storyboard.input.styleReference).toEqual(styleReference);
    expect(visualSystem.input.outputContract.constraints).toContain("Use the selected styleReference as the primary art direction reference; adapt its layout rhythm, depth, lighting, typography feel, icon/drawing language, and color relationships without copying its text, exact app UI, trademarked elements, or brand identity.");
    expect(storyboard.input.outputContract.constraints).toContain("Write copy and screen roles for the user's app while preserving the selected styleReference's composition hierarchy, icon/drawing language, and pacing.");
    expect(storyboard.input.outputContract.constraints).toContain("Adapt the selected styleReference; do not copy its text, exact app UI, trademarked elements, or brand identity.");
  });

  it("describes the Storyboard generation task with source screenshot constraints", () => {
    const visualSystem = visualSystemTaskContract({ app, patterns }).fixture();
    const contract = storyboardTaskContract({ app, patterns, visualSystem });

    expect(contract.task).toBe("storyboard.generate");
    expect(contract.input.outputContract.constraints).toContain("Return exactly 2 screens.");
    expect(contract.input.outputContract.requiredJsonShape.screens[0]?.sourceScreenshotPath).toBe("input/home.png");
    expect(contract.schema.safeParse(contract.fixture()).success).toBe(true);
  });
});
