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

export const BrandKitSourceSchema = z.enum(["manual", "landing", "screenshots", "mixed", "category-default"]);
export type BrandKitSource = z.infer<typeof BrandKitSourceSchema>;

export const BrandKitSchema = z.object({
  source: BrandKitSourceSchema,
  palette: z.object({
    background: z.string().min(1),
    surface: z.string().min(1),
    text: z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    secondary: z.string().min(1).optional(),
  }),
  typography: z.object({
    displayFamily: z.string().min(1).optional(),
    uiFamily: z.string().min(1).optional(),
    weight: z.number().int().positive(),
    mood: z.enum(["serif-editorial", "modern-saas", "bold-sport", "friendly"]),
  }),
  imagery: z.object({
    style: z.enum(["none", "3d", "photo", "illustration", "avatar", "abstract"]),
    keywords: z.array(z.string().min(1)),
  }),
  tone: z.array(z.string().min(1)),
});
export type BrandKit = z.infer<typeof BrandKitSchema>;

export const ScreenshotAnalysisSchema = z.object({
  screenshotId: z.string().min(1),
  sourcePath: z.string().min(1),
  role: z.enum(["home", "search", "detail", "map", "profile", "checkout", "unknown"]),
  dominantColors: z.array(z.string().min(1)),
  visualDensity: z.enum(["low", "medium", "high"]),
  bestFor: z.array(z.enum(["hook", "feature", "proof", "comparison", "cta"])),
});
export type ScreenshotAnalysis = z.infer<typeof ScreenshotAnalysisSchema>;

export const ProductUnderstandingSchema = z.object({
  appName: z.string().min(1),
  category: z.string().min(1),
  valueProposition: z.string().min(1),
  audience: z.string().min(1),
  screenInventory: z.array(ScreenshotAnalysisSchema),
});
export type ProductUnderstanding = z.infer<typeof ProductUnderstandingSchema>;

export const PremiumCompositionSchema = z.enum([
  "hero-poster",
  "split-devices",
  "cropped-edge-device",
  "proof-poster",
  "object-led",
  "before-after",
  "panoramic-sequence",
]);
export type PremiumComposition = z.infer<typeof PremiumCompositionSchema>;

export const PremiumRecipeSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1),
  name: z.string().min(1),
  qualityTarget: z.enum(["premium", "top-1-percent"]),
  tone: z.array(z.string().min(1)),
  setRhythm: z.tuple([
    z.enum(["hook", "feature", "proof", "comparison", "cta"]),
    z.enum(["hook", "feature", "proof", "comparison", "cta"]),
    z.enum(["hook", "feature", "proof", "comparison", "cta"]),
    z.enum(["hook", "feature", "proof", "comparison", "cta"]),
    z.enum(["hook", "feature", "proof", "comparison", "cta"]),
  ]),
  scenes: z.array(z.object({
    composition: PremiumCompositionSchema,
    requiredAssets: z.array(z.enum(["3d-object", "badge", "gradient", "photo", "avatar", "none"])),
    deviceSlots: z.number().int().positive(),
    copyStyle: z.enum(["big-loud", "minimal-premium", "proof-heavy"]),
  })).min(1),
});
export type PremiumRecipe = z.infer<typeof PremiumRecipeSchema>;

export const SceneDeviceSchema = z.object({
  screenshotId: z.string().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
  tilt: z.number(),
  crop: z.enum(["full", "top", "bottom", "edge-left", "edge-right"]),
  depth: z.number().int().nonnegative(),
});
export type SceneDevice = z.infer<typeof SceneDeviceSchema>;

export const SceneObjectSchema = z.object({
  assetId: z.string().min(1),
  kind: z.enum(["3d-cube", "badge", "coin", "trophy", "avatar", "card", "orb", "book", "map-pin"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive(),
  rotation: z.number(),
  depth: z.number().int().nonnegative(),
});
export type SceneObject = z.infer<typeof SceneObjectSchema>;

export const SceneSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().positive(),
  role: z.enum(["hook", "feature", "proof", "comparison", "cta"]),
  composition: PremiumCompositionSchema,
  copy: z.object({
    headline: z.string().min(1),
    subheadline: z.string().min(1).optional(),
    badge: z.string().min(1).optional(),
  }),
  background: z.object({
    kind: z.enum(["gradient", "mesh", "photo", "panorama", "dark-stage", "solid"]),
    paletteRole: z.string().min(1),
    intensity: z.number().min(0).max(1),
  }),
  devices: z.array(SceneDeviceSchema),
  objects: z.array(SceneObjectSchema),
  callouts: z.array(z.object({
    label: z.string().min(1),
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    anchorDevice: z.number().int().nonnegative().optional(),
  })),
});
export type Scene = z.infer<typeof SceneSchema>;

export const SceneSetSchema = z.object({
  id: z.string().min(1),
  brandKit: BrandKitSchema,
  recipeId: z.string().min(1),
  continuity: z.object({
    sharedBackground: z.enum(["gradient", "panorama", "photo-blur", "solid"]),
    recurringObjects: z.array(z.string().min(1)),
    deviceTreatment: z.enum(["consistent", "progressive"]),
  }),
  scenes: z.array(SceneSchema).min(1),
});
export type SceneSet = z.infer<typeof SceneSetSchema>;

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

export const PremiumQualityRatingSchema = z.enum(["needs-iteration", "marketable", "premium-candidate", "top-1-percent-candidate"]);
export type PremiumQualityRating = z.infer<typeof PremiumQualityRatingSchema>;

export const QualityReportSchema = z.object({
  passed: z.boolean(),
  scores: z.object({
    storeCompliance: z.number().min(0).max(1),
    textQuality: z.number().min(0).max(1),
    campaignConsistency: z.number().min(0).max(1),
  }),
  premium: z.object({
    score: z.number().min(0).max(1),
    rating: PremiumQualityRatingSchema,
    compositionDiversity: z.number().min(0).max(1),
    objectDepth: z.number().min(0).max(1),
    deviceRichness: z.number().min(0).max(1),
    continuity: z.number().min(0).max(1),
  }).optional(),
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
