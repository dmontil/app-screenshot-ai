import type { AiImageScenePlan } from "./plan-ai-image-scene";

export type AiImageDirectSceneType = "cover" | "feature";
export type AiImageDirectPromptVersion = "v1" | "v2" | "v3" | "v4" | "v5" | "v6" | "v7" | "v8" | "v9" | "v10" | "v11" | "v12";

export type AiImageDirectInput = {
  projectId?: string;
  appName: string;
  category: string;
  targetAudience: string;
  valueProposition: string;
  brandColors?: string[];
  websiteUrl?: string;
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
  continuityImagePaths?: string[];
  screenshotLast?: boolean;
  screenshotImageIndex?: number;
  outputBasename?: string;
  promptVersion?: AiImageDirectPromptVersion;
  packScreenIndex?: number;
  packScreenCount?: number;
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

export type AiImageDirectPackScreenInput = {
  id?: string;
  sceneType: AiImageDirectSceneType;
  headline?: string;
  subheadline?: string;
  screenshotImagePath?: string;
  productVisualAnchor?: string;
  avoidGenericCliches?: string[];
};

export type AiImageDirectPackInput = Omit<AiImageDirectInput, "sceneType" | "headline" | "subheadline" | "screenshotImagePath" | "productVisualAnchor" | "avoidGenericCliches" | "approvedCoverImagePath" | "outputBasename"> & {
  screens: AiImageDirectPackScreenInput[];
  approvedCoverImagePath?: string;
};

export type AiImageDirectPackResult = {
  provider: "fal";
  model: "fal-ai/nano-banana-2/edit";
  outputWidth: number;
  outputHeight: number;
  images: Array<AiImageDirectResult & { index: number; id: string }>;
  artifacts: { packPlanPath?: string };
};

export type NormalizedAiImageDirectInput = AiImageDirectInput & {
  headline: string;
  subheadline: string;
  productVisualAnchor: string;
  avoidGenericCliches: string[];
  outputWidth: number;
  outputHeight: number;
};
