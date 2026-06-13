import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { RenderStoreSetUseCase } from "./render-store-set";

const visualSystem = {
  id: "warm-editorial-v1",
  layoutFamily: "map-route-editorial" as const,
  motif: "route-line" as const,
  palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
  typography: { headlineFamily: "Inter", headlineWeight: 760 },
  layout: { safeMargin: 96, headlineY: 140, deviceY: 620, deviceWidthRatio: 0.62 },
};

const target = { store: "app-store" as const, device: "iphone-6.9", locale: "en-US", width: 1320, height: 2868 };

describe("RenderStoreSetUseCase", () => {
  it("renders a whole set with shared campaign context and secondary screenshots", async () => {
    const red = new Uint8Array(await sharp({ create: { width: 390, height: 844, channels: 4, background: "#FF0000" } }).png().toBuffer());
    const blue = new Uint8Array(await sharp({ create: { width: 390, height: 844, channels: 4, background: "#0000FF" } }).png().toBuffer());
    const loaded: string[] = [];
    const useCase = new RenderStoreSetUseCase();

    const assets = await useCase.execute({
      visualSystem,
      target,
      storyboard: {
        screens: [
          { id: "one", index: 1, role: "hook", headline: "Turn books into routes", treatment: "map-route-editorial", sourceScreenshotPath: "one.png", secondarySourceScreenshotPath: "two.png" },
          { id: "two", index: 2, role: "map", headline: "Walk the story", treatment: "map-route-editorial", sourceScreenshotPath: "two.png" },
        ],
      },
      async loadSourceScreenshot(sourcePath) {
        loaded.push(sourcePath);
        return { bytes: sourcePath === "two.png" ? blue : red, contentType: "image/png" };
      },
    });

    expect(assets).toHaveLength(2);
    expect(assets.map((asset) => asset.fileName)).toEqual(["01-hook.png", "02-map.png"]);
    expect(loaded).toEqual(["one.png", "two.png", "two.png"]);
  }, 10_000);
});
