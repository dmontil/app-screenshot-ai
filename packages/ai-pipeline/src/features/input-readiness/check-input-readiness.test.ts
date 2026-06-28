import { describe, expect, it } from "vitest";

import { CheckInputReadinessUseCase } from "./check-input-readiness";
import type { AppInput } from "@app-screenshot-ai/schemas";

function validInput(overrides: Partial<AppInput> = {}): AppInput {
  return {
    appName: "LiteraryTrip",
    category: "travel",
    targetAudience: "readers who travel",
    mainValueProposition: "turn books into walkable routes",
    targetStores: ["app-store"],
    baseLocale: "en-US",
    screenshots: [
      { id: "home", path: "input/home.png", kind: "functional" },
      { id: "search", path: "input/search.png", kind: "functional" },
      { id: "map", path: "input/map.png", kind: "functional" },
    ],
    ...overrides,
  };
}

describe("CheckInputReadinessUseCase", () => {
  it("blocks generation when no screenshots are provided", async () => {
    const useCase = new CheckInputReadinessUseCase();

    const report = await useCase.execute(validInput({ screenshots: [] }));

    expect(report.status).toBe("blocked");
    expect(report.canGenerate).toBe(false);
    expect(report.issues).toContainEqual({
      code: "too_few_screenshots",
      severity: "error",
      message: "Upload at least 1 in-app screenshot.",
    });
  });

  it("blocks generation when no functional screenshots are provided", async () => {
    const useCase = new CheckInputReadinessUseCase();

    const report = await useCase.execute(
      validInput({
        screenshots: [{ id: "launch", path: "input/launch.png", kind: "splash" }],
      }),
    );

    expect(report.status).toBe("blocked");
    expect(report.canGenerate).toBe(false);
    expect(report.issues).toContainEqual({
      code: "too_few_functional_screenshots",
      severity: "error",
      message: "Upload at least 1 screenshot with functional in-app UI visible.",
    });
  });

  it("blocks generation when more than one splash or logo screenshot is provided", async () => {
    const useCase = new CheckInputReadinessUseCase();

    const report = await useCase.execute(
      validInput({
        screenshots: [
          { id: "launch", path: "input/launch.png", kind: "splash" },
          { id: "logo", path: "input/logo.png", kind: "logo" },
          { id: "home", path: "input/home.png", kind: "functional" },
          { id: "map", path: "input/map.png", kind: "functional" },
        ],
      }),
    );

    expect(report.status).toBe("blocked");
    expect(report.canGenerate).toBe(false);
    expect(report.issues).toContainEqual({
      code: "too_many_splash_or_logo_screenshots",
      severity: "error",
      message: "Use no more than 1 splash or logo screenshot.",
    });
  });

  it("allows generation with one functional screenshot", async () => {
    const useCase = new CheckInputReadinessUseCase();

    const report = await useCase.execute(
      validInput({ screenshots: [{ id: "home", path: "input/home.png", kind: "functional" }] }),
    );

    expect(report).toEqual({
      status: "ready",
      canGenerate: true,
      issues: [],
    });
  });
});
