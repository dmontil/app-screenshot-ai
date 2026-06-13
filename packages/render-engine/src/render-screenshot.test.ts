import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { RenderScreenshotUseCase } from "./render-screenshot";

const visualSystem = {
  id: "warm-editorial-v1",
  layoutFamily: "map-route-editorial" as const,
  motif: "route-line" as const,
  palette: {
    background: "#F7F1E7",
    primary: "#3B2416",
    accent: "#D99A32",
    text: "#24160F",
  },
  typography: {
    headlineFamily: "Inter",
    headlineWeight: 760,
  },
  layout: {
    safeMargin: 96,
    headlineY: 140,
    deviceY: 620,
    deviceWidthRatio: 0.62,
  },
};

const screenPlan = {
  id: "hook",
  index: 1,
  role: "hook",
  headline: "Turn books into walkable routes",
  treatment: "map-route-editorial" as const,
  sourceScreenshotPath: "input/home.png",
};

const target = {
  store: "app-store" as const,
  device: "iphone-6.9",
  locale: "en-US",
  width: 1320,
  height: 2868,
};

describe("RenderScreenshotUseCase", () => {
  it("renders a screen plan into a PNG with the requested target dimensions", async () => {
    const useCase = new RenderScreenshotUseCase();

    const asset = await useCase.execute({ visualSystem, screenPlan, target });

    expect(asset).toMatchObject({
      id: "screen-1",
      screenIndex: 1,
      store: "app-store",
      device: "iphone-6.9",
      locale: "en-US",
      fileName: "01-hook.png",
      contentType: "image/png",
      width: 1320,
      height: 2868,
    });

    const metadata = await sharp(asset.bytes).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1320);
    expect(metadata.height).toBe(2868);
  }, 10_000);

  it("places the provided source screenshot inside the device frame", async () => {
    const useCase = new RenderScreenshotUseCase();
    const sourceScreenshotBytes = await sharp({
      create: {
        width: 390,
        height: 844,
        channels: 4,
        background: "#FF0000",
      },
    })
      .png()
      .toBuffer();

    const asset = await useCase.execute({
      visualSystem,
      screenPlan,
      target,
      sourceScreenshot: {
        bytes: new Uint8Array(sourceScreenshotBytes),
        contentType: "image/png",
      },
    });

    const sample = await sharp(asset.bytes)
      .extract({ left: 660, top: 1300, width: 1, height: 1 })
      .raw()
      .toBuffer();

    expect(sample[0]).toBeGreaterThan(220);
    expect(sample[1]).toBeLessThan(40);
    expect(sample[2]).toBeLessThan(40);
  }, 10_000);
});
