import { describe, expect, it } from "vitest";

import { BuildPremiumProjectContextUseCase } from "./build-premium-project-context";

const appInput = {
  appName: "LiteraryTrip",
  category: "travel",
  targetAudience: "readers who travel",
  mainValueProposition: "turn books into walkable routes",
  targetStores: ["app-store" as const],
  baseLocale: "en-US",
  brand: { colors: ["#101010", "#FAFAFA", "#FF9900"] },
  screenshots: [
    { id: "home", path: "input/home.png", kind: "functional" as const },
    { id: "search", path: "input/search.png", kind: "functional" as const },
    { id: "map", path: "input/map.png", kind: "functional" as const },
  ],
};

describe("BuildPremiumProjectContextUseCase", () => {
  it("builds a brand kit where manual colors override category defaults and screen inventory describes source screenshots", async () => {
    const result = await new BuildPremiumProjectContextUseCase().execute({ input: appInput });

    expect(result.brandKit.source).toBe("manual");
    expect(result.brandKit.palette.primary).toBe("#101010");
    expect(result.brandKit.palette.background).toBe("#FAFAFA");
    expect(result.brandKit.palette.accent).toBe("#FF9900");
    expect(result.productUnderstanding).toMatchObject({
      appName: "LiteraryTrip",
      category: "travel",
      valueProposition: "turn books into walkable routes",
      audience: "readers who travel",
    });
    expect(result.productUnderstanding.screenInventory.map((screen) => [screen.screenshotId, screen.role])).toEqual([
      ["home", "home"],
      ["search", "search"],
      ["map", "map"],
    ]);
  });
});
