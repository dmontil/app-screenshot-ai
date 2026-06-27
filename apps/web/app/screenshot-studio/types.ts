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
  category?: string;
  status?: "draft" | "ready" | "blocked" | "exported";
  createdAt?: string;
  updatedAt?: string;
  currentGenerationId?: string;
  favoriteGenerationId?: string;
  lastExportedAt?: string;
  thumbnailDataUrl?: string;
  generations: GenerationSummary[];
};

export type StandardStyleReference = {
  id: string;
  name: string;
  path: string;
  previewPath?: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  imageBase64?: string;
};

export type StoredAppInput = {
  appName: string;
  category: string;
  targetAudience: string;
  mainValueProposition: string;
  baseLocale: string;
  screenshots?: Array<{ id: string; path: string; kind?: string }>;
  brand?: { colors?: string[]; websiteUrl?: string; logoPath?: string };
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
  input?: StoredAppInput;
  brandKit?: unknown;
  productUnderstanding?: unknown;
  premiumRecipes?: unknown;
  premiumCandidates?: unknown;
  sceneSet?: unknown;
  styleReference?: StandardStyleReference;
  zip: { fileName: string; dataUrl: string };
  localProjectPath: string;
  generationMode?: "deterministic" | "premium-direct" | "benchmark";
  premiumDirect?: {
    selectedCandidateId: string;
    candidateCount: number;
    promptVersion: string;
  };
};
