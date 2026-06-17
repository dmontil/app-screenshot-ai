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
    expect(result.brandKit.palette.background).toBe("#101010");
    expect(result.brandKit.palette.primary).toBe("#FAFAFA");
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

  it("extracts brand colors and positioning context from a website URL when manual colors are absent", async () => {
    const result = await new BuildPremiumProjectContextUseCase({
      landingPageLoader: {
        async load() {
          return `
            <html>
              <head>
                <title>RouteMuse — Literary walks</title>
                <meta name="theme-color" content="#123456" />
                <meta name="description" content="Discover book locations and turn them into walkable city routes." />
                <style>:root { --brand-accent: #FF3366; --brand-secondary: #BBDDEE; }</style>
              </head>
              <body><h1>Walk through the books you love</h1></body>
            </html>
          `;
        },
      },
    }).execute({
      input: {
        ...appInput,
        brand: { websiteUrl: "https://routemuse.example" },
      },
    });

    expect(result.brandKit.source).toBe("landing");
    expect(result.brandKit.palette.primary).toBe("#123456");
    expect(result.brandKit.palette.accent).toBe("#FF3366");
    expect(result.brandKit.palette.secondary).toBe("#BBDDEE");
    expect(result.productUnderstanding.valueProposition).toBe("Walk through the books you love");
    expect(result.productUnderstanding.landingPage).toMatchObject({
      url: "https://routemuse.example",
      title: "RouteMuse — Literary walks",
      description: "Discover book locations and turn them into walkable city routes.",
      headline: "Walk through the books you love",
      extractedColors: ["#123456", "#FF3366", "#BBDDEE"],
    });
  });

  it("canonicalizes utility aliases so utility apps do not fall back to travel art direction", async () => {
    const result = await new BuildPremiumProjectContextUseCase().execute({
      input: {
        appName: "Toolbox",
        category: "utilities",
        targetAudience: "busy operators",
        mainValueProposition: "finish tasks faster",
        targetStores: ["app-store" as const],
        baseLocale: "en-US",
        screenshots: [{ id: "home", path: "input/home.png", kind: "functional" as const }],
      },
    });

    expect(result.productUnderstanding.category).toBe("utility");
    expect(result.brandKit.imagery.keywords).toContain("cubes");
    expect(result.brandKit.imagery.keywords).not.toContain("books");
  });
});
