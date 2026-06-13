import type { AppInput, InputReadinessReport, ReadinessIssue } from "@app-screenshot-ai/schemas";

export class CheckInputReadinessUseCase {
  async execute(input: AppInput): Promise<InputReadinessReport> {
    const issues: ReadinessIssue[] = [];

    if (input.screenshots.length < 3) {
      issues.push({
        code: "too_few_screenshots",
        severity: "error",
        message: "Upload at least 3 distinct in-app screenshots.",
      });
    }

    const functionalScreenshotCount = input.screenshots.filter((screenshot) => screenshot.kind === "functional").length;

    if (functionalScreenshotCount < 2) {
      issues.push({
        code: "too_few_functional_screenshots",
        severity: "error",
        message: "Upload at least 2 screenshots with functional in-app UI visible.",
      });
    }

    const splashOrLogoScreenshotCount = input.screenshots.filter(
      (screenshot) => screenshot.kind === "splash" || screenshot.kind === "logo",
    ).length;

    if (splashOrLogoScreenshotCount > 1) {
      issues.push({
        code: "too_many_splash_or_logo_screenshots",
        severity: "error",
        message: "Use no more than 1 splash or logo screenshot.",
      });
    }

    return {
      status: issues.some((issue) => issue.severity === "error") ? "blocked" : "ready",
      canGenerate: !issues.some((issue) => issue.severity === "error"),
      issues,
    };
  }
}
