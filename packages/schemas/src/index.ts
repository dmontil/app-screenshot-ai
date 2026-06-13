import { z } from "zod";

export const StoreTargetSchema = z.enum(["app-store", "google-play"]);
export type StoreTarget = z.infer<typeof StoreTargetSchema>;

export const ScreenshotKindSchema = z.enum(["functional", "splash", "logo", "empty", "unknown"]);
export type ScreenshotKind = z.infer<typeof ScreenshotKindSchema>;

export const RawScreenshotSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  kind: ScreenshotKindSchema.default("unknown"),
});
export type RawScreenshot = z.infer<typeof RawScreenshotSchema>;

export const AppInputSchema = z.object({
  appName: z.string().min(1),
  category: z.string().min(1),
  targetAudience: z.string().min(1),
  mainValueProposition: z.string().min(1),
  screenshots: z.array(RawScreenshotSchema),
  targetStores: z.array(StoreTargetSchema).min(1),
  baseLocale: z.string().min(2),
  brand: z
    .object({
      colors: z.array(z.string()).optional(),
      logoPath: z.string().optional(),
      websiteUrl: z.string().url().optional(),
    })
    .optional(),
});
export type AppInput = z.infer<typeof AppInputSchema>;

export const ReadinessIssueCodeSchema = z.enum([
  "too_few_screenshots",
  "too_few_functional_screenshots",
  "too_many_splash_or_logo_screenshots",
]);
export type ReadinessIssueCode = z.infer<typeof ReadinessIssueCodeSchema>;

export const ReadinessIssueSchema = z.object({
  code: ReadinessIssueCodeSchema,
  severity: z.enum(["error", "warning"]),
  message: z.string().min(1),
});
export type ReadinessIssue = z.infer<typeof ReadinessIssueSchema>;

export const InputReadinessReportSchema = z.object({
  status: z.enum(["ready", "blocked"]),
  canGenerate: z.boolean(),
  issues: z.array(ReadinessIssueSchema),
});
export type InputReadinessReport = z.infer<typeof InputReadinessReportSchema>;

export const DesignPatternSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  conversionIntent: z.string().min(1),
  layoutFamily: z.string().min(1),
  tone: z.array(z.string().min(1)),
  rules: z.object({
    maxHeadlineWords: z.number().int().positive(),
    backgroundComplexity: z.enum(["low", "medium", "high"]),
    uiVisibility: z.enum(["low", "medium", "high"]),
  }),
  whyItWorks: z.array(z.string().min(1)),
});
export type DesignPattern = z.infer<typeof DesignPatternSchema>;

export const CreativeDirectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rationale: z.string().min(1),
  tone: z.array(z.string().min(1)),
});
export type CreativeDirection = z.infer<typeof CreativeDirectionSchema>;

export const CreativeDirectionsSchema = z.object({
  directions: z.array(CreativeDirectionSchema).min(1),
});
export type CreativeDirections = z.infer<typeof CreativeDirectionsSchema>;

export const LayoutFamilySchema = z.enum([
  "classic-device",
  "map-route-editorial",
  "premium-proof-cards",
  "cinematic-atlas",
]);
export type LayoutFamily = z.infer<typeof LayoutFamilySchema>;

export const ScreenTreatmentSchema = z.enum([
  "hero-device",
  "map-route-editorial",
  "premium-proof-card",
  "cinematic-poster",
  "callout-zoom",
]);
export type ScreenTreatment = z.infer<typeof ScreenTreatmentSchema>;

export const VisualSystemSchema = z.object({
  id: z.string().min(1),
  layoutFamily: LayoutFamilySchema.catch("classic-device").optional(),
  motif: z.enum(["route-line", "cards", "atlas-glow", "none"]).catch("none").optional(),
  palette: z.object({
    background: z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    text: z.string().min(1),
  }),
  typography: z.object({
    headlineFamily: z.string().min(1),
    headlineWeight: z.number().int().positive(),
  }),
  layout: z.object({
    safeMargin: z.number().nonnegative(),
    headlineY: z.number().nonnegative(),
    deviceY: z.number().nonnegative(),
    deviceWidthRatio: z.number().positive(),
  }),
});
export type VisualSystem = z.infer<typeof VisualSystemSchema>;

export const TextLayerOverrideSchema = z.object({
  fontFamily: z.string().min(1).optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.number().int().positive().optional(),
  x: z.number().min(0).max(1).optional(),
  y: z.number().min(0).max(1).optional(),
  align: z.enum(["start", "middle", "end"]).optional(),
  maxCharsPerLine: z.number().int().positive().optional(),
});
export type TextLayerOverride = z.infer<typeof TextLayerOverrideSchema>;

export const ScreenTextOverridesSchema = z.object({
  headline: TextLayerOverrideSchema.optional(),
  subheadline: TextLayerOverrideSchema.optional(),
});
export type ScreenTextOverrides = z.infer<typeof ScreenTextOverridesSchema>;

export const ScreenPlanSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().positive(),
  role: z.string().min(1),
  headline: z.string().min(1),
  subheadline: z.string().nullish().transform((value) => value ?? undefined),
  text: ScreenTextOverridesSchema.nullish().transform((value) => value ?? undefined),
  treatment: ScreenTreatmentSchema.catch("hero-device").optional(),
  sourceScreenshotPath: z.string().min(1),
  secondarySourceScreenshotPath: z.string().min(1).nullish().transform((value) => value ?? undefined),
  device: z
    .object({
      scale: z.number().positive().optional(),
      tilt: z.number().optional(),
      crop: z.string().optional(),
    })
    .nullish()
    .transform((value) => value ?? undefined),
  callouts: z
    .array(
      z.object({
        label: z.string().min(1),
        x: z.number().min(0).max(1).catch(0.5),
        y: z.number().min(0).max(1).catch(0.5),
      }),
    )
    .nullish()
    .transform((value) => value ?? undefined),
});
export type ScreenPlan = z.infer<typeof ScreenPlanSchema>;

export const StoryboardSchema = z.object({
  screens: z.array(ScreenPlanSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;

export const RenderTargetSchema = z.object({
  store: StoreTargetSchema,
  device: z.string().min(1),
  locale: z.string().min(2),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type RenderTarget = z.infer<typeof RenderTargetSchema>;

export const RenderedAssetSchema = z.object({
  id: z.string().min(1),
  screenIndex: z.number().int().positive(),
  store: StoreTargetSchema,
  device: z.string().min(1),
  locale: z.string().min(2),
  fileName: z.string().min(1),
  contentType: z.enum(["image/png", "image/jpeg"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.instanceof(Uint8Array),
});
export type RenderedAsset = z.infer<typeof RenderedAssetSchema>;

export const QualityIssueSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(["error", "warning"]),
  message: z.string().min(1),
  screenId: z.string().optional(),
});
export type QualityIssue = z.infer<typeof QualityIssueSchema>;

export const QualityReportSchema = z.object({
  passed: z.boolean(),
  scores: z.object({
    storeCompliance: z.number().min(0).max(1),
    textQuality: z.number().min(0).max(1),
    campaignConsistency: z.number().min(0).max(1),
  }),
  issues: z.array(QualityIssueSchema),
});
export type QualityReport = z.infer<typeof QualityReportSchema>;

export const ExportManifestItemSchema = z.object({
  assetId: z.string().min(1),
  path: z.string().min(1),
  contentType: z.enum(["image/png", "image/jpeg"]),
  byteLength: z.number().int().nonnegative(),
});
export type ExportManifestItem = z.infer<typeof ExportManifestItemSchema>;

export const ExportManifestSchema = z.object({
  items: z.array(ExportManifestItemSchema),
});
export type ExportManifest = z.infer<typeof ExportManifestSchema>;
