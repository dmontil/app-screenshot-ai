import { describe, expect, it } from "vitest";

import { FixtureAdapter } from "./fixture-adapter";

describe("FixtureAdapter", () => {
  it("returns category-specific visual systems so fixture generations visibly change", async () => {
    const adapter = new FixtureAdapter();

    const travel = await adapter.generateObject({
      task: "visual-system.generate",
      model: "fixture-v1",
      input: { app: { category: "travel" } },
    });
    const utility = await adapter.generateObject({
      task: "visual-system.generate",
      model: "fixture-v1",
      input: { app: { category: "utility" } },
    });

    expect(utility).not.toEqual(travel);
    expect(utility).toMatchObject({
      id: "fixture-utility-focus-v1",
      layoutFamily: "classic-device",
      motif: "cards",
      palette: { background: "#EEF4FF", primary: "#172554", accent: "#2563EB", text: "#0F172A" },
    });
  });

  it("returns category-specific storyboards with different treatments and copy", async () => {
    const adapter = new FixtureAdapter();
    const screenshots = [{ path: "one.png" }, { path: "two.png" }, { path: "three.png" }];

    const travel = await adapter.generateObject({
      task: "storyboard.generate",
      model: "fixture-v1",
      input: { app: { category: "travel", screenshots } },
    });
    const utility = await adapter.generateObject({
      task: "storyboard.generate",
      model: "fixture-v1",
      input: { app: { category: "utility", screenshots } },
    });

    expect(utility).not.toEqual(travel);
    expect(utility).toMatchObject({
      screens: [
        { headline: "Get the job done faster", treatment: "hero-device" },
        { headline: "Keep tools one tap away", treatment: "premium-proof-card", secondarySourceScreenshotPath: "one.png" },
        { headline: "Spot issues instantly", treatment: "callout-zoom" },
        { headline: "Automate the boring parts", treatment: "hero-device", secondarySourceScreenshotPath: "three.png" },
        { headline: "Ship with confidence", treatment: "cinematic-poster" },
      ],
    });
  });
});
