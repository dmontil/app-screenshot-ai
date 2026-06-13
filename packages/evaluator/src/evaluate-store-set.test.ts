import { describe, expect, it } from "vitest";

import { EvaluateStoreSetUseCase } from "./evaluate-store-set";

const validAsset = {
  id: "screen-1",
  screenIndex: 1,
  store: "app-store" as const,
  device: "iphone-6.9",
  locale: "en-US",
  fileName: "01-hook.png",
  contentType: "image/png" as const,
  width: 1320,
  height: 2868,
  bytes: new Uint8Array([1, 2, 3]),
};

const validScreen = {
  id: "hook",
  index: 1,
  role: "hook",
  headline: "Turn books into routes",
  sourceScreenshotPath: "input/home.png",
};

describe("EvaluateStoreSetUseCase", () => {
  it("passes a compliant rendered set", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({ assets: [validAsset], screens: [validScreen] });

    expect(report.passed).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.scores.storeCompliance).toBe(1);
  });

  it("fails assets with dimensions that do not match their target device", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: [{ ...validAsset, width: 1200 }],
      screens: [validScreen],
    });

    expect(report.passed).toBe(false);
    expect(report.issues).toContainEqual({
      code: "invalid_app_store_iphone_6_9_dimensions",
      severity: "error",
      message: "App Store iPhone 6.9 screenshots must be 1320x2868.",
      screenId: "screen-1",
    });
  });

  it("warns when headlines are too long for store screenshots", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: [validAsset],
      screens: [
        {
          ...validScreen,
          headline: "Turn your favorite novels into deeply contextual city walks with literary places",
        },
      ],
    });

    expect(report.passed).toBe(true);
    expect(report.issues).toContainEqual({
      code: "headline_too_long",
      severity: "warning",
      message: "Keep screenshot headlines at 8 words or fewer.",
      screenId: "hook",
    });
    expect(report.scores.textQuality).toBeLessThan(1);
  });

  it("warns when a full set repeats too few layout treatments", () => {
    const useCase = new EvaluateStoreSetUseCase();

    const report = useCase.execute({
      assets: Array.from({ length: 5 }, (_, index) => ({ ...validAsset, id: `screen-${index + 1}`, screenIndex: index + 1 })),
      screens: Array.from({ length: 5 }, (_, index) => ({
        ...validScreen,
        id: `screen-${index + 1}`,
        index: index + 1,
        treatment: "hero-device" as const,
      })),
    });

    expect(report.passed).toBe(true);
    expect(report.issues).toContainEqual({
      code: "too_little_layout_diversity",
      severity: "warning",
      message: "Use at least 3 distinct screenshot treatments across a 5-screen set.",
    });
    expect(report.scores.campaignConsistency).toBeLessThan(1);
  });
});
