import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import type { ImageEditProvider } from "@app-screenshot-ai/model-gateway";

import { buildCoverPrompt } from "./build-cover-prompt";
import { buildFeaturePrompt } from "./build-feature-prompt";
import { GenerateAiImageDirectPackUseCase, validateAndNormalize } from "./generate-ai-image-direct-pack";
import { GenerateAiImageDirectSequencePackUseCase } from "./generate-ai-image-direct-sequence-pack";
import { PlanAiImageSceneUseCase } from "./plan-ai-image-scene";
import type { NormalizedAiImageDirectInput } from "./types";

const baseInput: NormalizedAiImageDirectInput = {
  appName: "VanTrip",
  category: "Travel / Campervan",
  targetAudience: "Campervan owners",
  valueProposition: "Create personalized van trips fast",
  headline: "Plan Perfect Van Routes Instantly",
  subheadline: "Effortless journeys for every RV adventure",
  productVisualAnchor: "campervan, route pin, map, compass",
  avoidGenericCliches: ["animal mascot", "bear", "fake badges"],
  outputWidth: 1320,
  outputHeight: 2868,
  referenceStyleImagePath: "/tmp/reference.png",
  screenshotImagePath: "/tmp/screenshot.png",
  sceneType: "feature",
};

describe("AI Image Direct", () => {
  it("builds a cover prompt from the user's product and style reference", () => {
    const { screenshotImagePath: _screenshotImagePath, ...coverInput } = baseInput;
    const prompt = buildCoverPrompt({ ...coverInput, sceneType: "cover" });

    expect(prompt).toContain("Use IMAGE 1 as the visual style reference");
    expect(prompt).toContain("1320 × 2868");
    expect(prompt).toContain("VanTrip");
    expect(prompt).toContain("Plan Perfect Van Routes Instantly");
    expect(prompt).toContain("No other readable text");
  });

  it("builds a feature prompt that preserves the real app screenshot and uses semantic anchors", () => {
    const prompt = buildFeaturePrompt({
      ...baseInput,
      productVisualAnchor: "campervan, route pin, map, compass",
      avoidGenericCliches: ["animal mascot", "bear", "fake badges"],
    });

    expect(prompt).toContain("Use IMAGE 1 as the visual style reference");
    expect(prompt).toContain("Use IMAGE 2 as the real app screenshot");
    expect(prompt).toContain("Do not redraw, replace, translate, simplify, or reinterpret the UI");
    expect(prompt).toContain("campervan, route pin, map, compass");
    expect(prompt).toContain("- bear");
    expect(prompt).toContain("No laurels");
    expect(prompt).toContain("No bottom proof blocks");
  });

  it("plans a specific VanTrip scene when headline and anchors are missing", async () => {
    const plan = await new PlanAiImageSceneUseCase().execute({
      appName: "Vantrip",
      category: "travel",
      targetAudience: "Campervan owners and digital nomads",
      valueProposition: "Create personalized vantrips",
      sceneType: "feature",
    });

    expect(plan.headline).toBe("Plan Perfect Routes");
    expect(plan.subheadline).toBe("In minutes, not hours");
    expect(plan.productVisualAnchor).toContain("campervan");
    expect(plan.avoidGenericCliches).toContain("bear mascot");
    expect(plan.avoidGenericCliches).toContain("laurels");
  });

  it("validates feature scenes require a screenshot", () => {
    const { screenshotImagePath: _screenshotImagePath, ...invalidInput } = baseInput;
    expect(() => validateAndNormalize(invalidInput)).toThrow("Screenshot image is required");
  });

  it("sends reference, screenshot and approved cover to the image edit provider in order", async () => {
    const calls: Array<{ prompt: string; imagePaths: string[] }> = [];
    const provider: ImageEditProvider = {
      async edit(input) {
        calls.push({ prompt: input.prompt, imagePaths: input.imagePaths });
        return { imageUrl: "data:image/png;base64,iVBORw0KGgo=", raw: { ok: true } };
      },
    };

    await new GenerateAiImageDirectPackUseCase(provider).execute({
      ...baseInput,
      approvedCoverImagePath: "/tmp/cover.png",
    });

    expect(calls[0]!.imagePaths).toEqual(["/tmp/reference.png", "/tmp/screenshot.png", "/tmp/cover.png"]);
    expect(calls[0]!.prompt).toContain("Use the approved campaign reference images only for style continuity");
  });

  it("puts feature screenshots last in sequential pack generations so continuity images cannot replace the real UI", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ai-image-direct-sequence-"));
    const calls: Array<{ prompt: string; imagePaths: string[] }> = [];
    const provider: ImageEditProvider = {
      async edit(input) {
        calls.push({ prompt: input.prompt, imagePaths: input.imagePaths });
        return { imageUrl: "data:image/png;base64,iVBORw0KGgo=", raw: { ok: true } };
      },
    };

    await new GenerateAiImageDirectSequencePackUseCase(provider).execute({
      appName: "VanTrip",
      category: "Travel / Campervan",
      targetAudience: "Campervan owners",
      valueProposition: "Create personalized van trips fast",
      referenceStyleImagePath: "/tmp/reference.png",
      outputWidth: 1320,
      outputHeight: 2868,
      outputDir: dir,
      screens: [
        { sceneType: "cover" },
        { sceneType: "feature", screenshotImagePath: "/tmp/screenshot-02.png" },
        { sceneType: "feature", screenshotImagePath: "/tmp/screenshot-03.png" },
      ],
    });

    expect(calls[0]!.imagePaths).toEqual(["/tmp/reference.png"]);
    expect(calls[1]!.imagePaths).toEqual(["/tmp/reference.png", path.join(dir, "renders", "screen-01.png"), "/tmp/screenshot-02.png"]);
    expect(calls[1]!.prompt).toContain("Use IMAGE 3 (the LAST image) exactly as provided");
    expect(calls[2]!.imagePaths).toEqual(["/tmp/reference.png", path.join(dir, "renders", "screen-01.png"), "/tmp/screenshot-03.png"]);
    expect(calls[2]!.prompt).toContain("Use IMAGE 3 (the LAST image) exactly as provided");
  });

  it("persists input, prompt, raw response and output image artifacts", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "ai-image-direct-"));
    const pngPath = path.join(dir, "source.png");
    await writeFile(pngPath, new Uint8Array([1, 2, 3]));
    const provider: ImageEditProvider = {
      async edit() {
        return { imageUrl: `file://${pngPath}`, raw: { id: "fixture" } };
      },
    };

    const { headline: _headline, subheadline: _subheadline, productVisualAnchor: _anchor, avoidGenericCliches: _avoid, ...unplannedInput } = baseInput;
    const result = await new GenerateAiImageDirectPackUseCase(provider).execute({
      ...unplannedInput,
      outputDir: dir,
    });

    expect(result.scenePlan.headline).toBe("Plan Perfect Routes");
    expect(result.prompt).toContain("Plan Perfect Routes");
    expect(result.prompt).toContain("bear mascot");
    expect(result.prompt).not.toContain("the app value proposition, core product mechanic, and visible app screenshot");
    expect(result.artifacts.promptPath).toContain("prompt.txt");
    expect(result.artifacts.rawResponsePath).toContain("fal-response.json");
    expect(result.artifacts.scenePlanPath).toContain("scene-plan.json");
    expect(result.artifacts.outputImagePath).toContain("feature.png");
  });
});
