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

describe("AI task contracts", () => {
  it("describes the VisualSystem generation task in one contract", () => {
    const contract = visualSystemTaskContract({ app, patterns });

    expect(contract.task).toBe("visual-system.generate");
    expect(contract.input).toMatchObject({ app, patterns });
    expect(contract.input.outputContract.constraints).toContain("Return only valid JSON matching requiredJsonShape.");
    expect(contract.schema.safeParse(contract.fixture()).success).toBe(true);
  });

  it("describes the Storyboard generation task with source screenshot constraints", () => {
    const visualSystem = visualSystemTaskContract({ app, patterns }).fixture();
    const contract = storyboardTaskContract({ app, patterns, visualSystem });

    expect(contract.task).toBe("storyboard.generate");
    expect(contract.input.outputContract.constraints).toContain("Return exactly 5 screens.");
    expect(contract.input.outputContract.requiredJsonShape.screens[0]?.sourceScreenshotPath).toBe("input/home.png");
    expect(contract.schema.safeParse(contract.fixture()).success).toBe(true);
  });
});
