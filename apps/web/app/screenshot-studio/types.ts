export type TextLayerOverride = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  x?: number;
  y?: number;
  align?: "start" | "middle" | "end";
  maxCharsPerLine?: number;
};

export type EditableScreen = {
  id: string;
  index: number;
  role: string;
  headline: string;
  subheadline?: string;
  text?: { headline?: TextLayerOverride; subheadline?: TextLayerOverride };
  treatment?: string;
  sourceScreenshotPath: string;
  secondarySourceScreenshotPath?: string;
  device?: unknown;
  callouts?: Array<{ label: string; x: number; y: number }>;
};

export type EditableStoryboard = {
  screens: EditableScreen[];
};

export type GenerationSummary = {
  generationId: string;
  projectId: string;
  kind: "ai-generate" | "manual-rerender";
  label?: string;
  createdAt: string;
};

export type ProjectSummary = {
  projectId: string;
  appName?: string;
  currentGenerationId?: string;
  generations: GenerationSummary[];
};

export type GenerateResponse = {
  projectId: string;
  generationId: string | undefined;
  provider: string | undefined;
  model: string | undefined;
  screenshots: Array<{ fileName: string; dataUrl: string }>;
  qualityReport: unknown;
  visualSystem: unknown;
  storyboard: EditableStoryboard;
  exportManifest: unknown;
  brandKit?: unknown;
  productUnderstanding?: unknown;
  premiumRecipes?: unknown;
  sceneSet?: unknown;
  zip: { fileName: string; dataUrl: string };
  localProjectPath: string;
};
