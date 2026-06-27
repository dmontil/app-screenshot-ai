import type { AiImageScenePlan } from "./plan-ai-image-scene";

export type AiImageDirectSceneType = "cover" | "feature";

export type AiImageDirectInput = {
  projectId?: string;
  appName: string;
  category: string;
  targetAudience: string;
  valueProposition: string;
  headline?: string;
  subheadline?: string;
  outputWidth?: number;
  outputHeight?: number;
  referenceStyleImagePath: string;
  screenshotImagePath?: string;
  sceneType: AiImageDirectSceneType;
  productVisualAnchor?: string;
  avoidGenericCliches?: string[];
  approvedCoverImagePath?: string;
  outputDir?: string;
};

export type AiImageDirectResult = {
  imageUrl: string;
  prompt: string;
  provider: "fal";
  model: "fal-ai/nano-banana-2/edit";
  sceneType: AiImageDirectSceneType;
  outputWidth: number;
  outputHeight: number;
  artifacts: {
    promptPath?: string;
    rawResponsePath?: string;
    outputImagePath?: string;
    inputPath?: string;
    scenePlanPath?: string;
    scenePlanPromptPath?: string;
    scenePlanResponsePath?: string;
  };
  scenePlan: AiImageScenePlan;
};

export type NormalizedAiImageDirectInput = AiImageDirectInput & {
  headline: string;
  subheadline: string;
  productVisualAnchor: string;
  avoidGenericCliches: string[];
  outputWidth: number;
  outputHeight: number;
};
