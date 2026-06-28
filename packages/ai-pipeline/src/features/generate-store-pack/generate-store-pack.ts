import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary, PremiumRecipeLibrary } from "@app-screenshot-ai/pattern-library";
import { ComposeGeneratedCompositionsUseCase, RenderSceneSetUseCase, RenderStoreSetUseCase, buildGeneratedCompositions } from "@app-screenshot-ai/render-engine";
import {
  type AppInput,
  type DesignPattern,
  type ExportManifest,
  type InputReadinessReport,
  type QualityReport,
  type RenderedAsset,
  type RenderTarget,
  type Storyboard,
  type VisualSystem,
  type BrandKit,
  type ProductUnderstanding,
  type PremiumRecipe,
  type SceneSet,
  SceneSetSchema,
  type StandardStyleReference,
  type StyleReferenceAnalysis,
  StoryboardSchema,
} from "@app-screenshot-ai/schemas";

import { CheckInputReadinessUseCase } from "../input-readiness";
import { BuildPremiumCandidateSceneSetsUseCase, BuildPremiumProjectContextUseCase, type LandingPageLoaderPort } from "../premium-planning";
import { storyboardTaskContract, styleReferenceAnalysisTaskContract, visualSystemTaskContract } from "./ai-task-contracts";
import { selectBestPremiumCandidate } from "./premium-candidate-selection";

export class GenerateStorePackError extends Error {
  readonly code: "input_not_ready";
  readonly readiness: InputReadinessReport;

  constructor(readiness: InputReadinessReport) {
    super("Input is not ready for generation.");
    this.name = "GenerateStorePackError";
    this.code = "input_not_ready";
    this.readiness = readiness;
  }
}

export type SourceScreenshot = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
};

export type SourceScreenshotLoaderPort = {
  load(path: string): Promise<SourceScreenshot>;
};

export type GenerateStorePackInput = {
  input: AppInput;
  provider: string;
  model: string;
  target: RenderTarget;
  styleReference: StandardStyleReference;
  imageModel?: string;
  includeCoverScreen?: boolean;
};

export type GenerateStorePackResult = {
  readiness: InputReadinessReport;
  patterns: DesignPattern[];
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  assets: RenderedAsset[];
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
  zipBytes: Uint8Array;
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
  premiumRecipes: PremiumRecipe[];
  premiumCandidates: Array<{ variant: string; sceneSet: SceneSet; qualityReport: QualityReport }>;
  sceneSet?: SceneSet;
};

export class GenerateStorePackUseCase {
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly premiumRecipeLibrary: PremiumRecipeLibrary | undefined;
  private readonly readiness = new CheckInputReadinessUseCase();
  private readonly renderer = new RenderStoreSetUseCase();
  private readonly sceneRenderer = new RenderSceneSetUseCase();
  private readonly evaluator = new EvaluateStoreSetUseCase();
  private readonly exporter = new ExportStorePackUseCase();
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;
  private readonly landingPageLoader: LandingPageLoaderPort | undefined;

  constructor(params: {
    modelGateway: ModelGateway;
    patternLibrary: PatternLibrary;
    premiumRecipeLibrary?: PremiumRecipeLibrary;
    sourceScreenshotLoader?: SourceScreenshotLoaderPort;
    landingPageLoader?: LandingPageLoaderPort;
  }) {
    this.modelGateway = params.modelGateway;
    this.patternLibrary = params.patternLibrary;
    this.premiumRecipeLibrary = params.premiumRecipeLibrary;
    this.sourceScreenshotLoader = params.sourceScreenshotLoader;
    this.landingPageLoader = params.landingPageLoader;
  }

  async execute(params: GenerateStorePackInput): Promise<GenerateStorePackResult> {
    const readiness = await this.readiness.execute(params.input);
    if (!readiness.canGenerate) throw new GenerateStorePackError(readiness);
    if (!params.styleReference) throw new Error("Choose one standard visual reference before generating.");

    const useAiFirstReferenceComposition = params.provider === "openai";
    const styleReferenceAnalysis = useAiFirstReferenceComposition ? undefined : await this.analyzeStyleReference(params);
    const patterns = this.patternLibrary.retrieve({ category: params.input.category, tone: [] });
    const premiumContext = await new BuildPremiumProjectContextUseCase({
      ...(this.landingPageLoader ? { landingPageLoader: this.landingPageLoader } : {}),
    }).execute({ input: params.input });
    const premiumRecipes = useAiFirstReferenceComposition
      ? []
      : this.premiumRecipeLibrary?.retrieve({
          category: params.input.category,
          tone: premiumContext.brandKit.tone,
        }) ?? [];
    const outputScreenCount = params.input.screenshots.length + (params.includeCoverScreen ? 1 : 0);
    const premiumCandidates = !useAiFirstReferenceComposition && premiumRecipes[0]
      ? new BuildPremiumCandidateSceneSetsUseCase()
          .execute({
            brandKit: premiumContext.brandKit,
            productUnderstanding: premiumContext.productUnderstanding,
            recipe: premiumRecipes[0],
            outputScreenCount,
            includeCoverScreen: Boolean(params.includeCoverScreen),
          })
          .map((candidate) => ({
            variant: candidate.variant,
            sceneSet: candidate.sceneSet,
            qualityReport: this.evaluator.execute({ assets: [], screens: [], sceneSet: candidate.sceneSet }),
          }))
      : [];
    const sceneSet = selectBestPremiumCandidate(premiumCandidates)?.sceneSet;

    const visualSystemContract = visualSystemTaskContract({
      app: params.input,
      patterns,
      ...(premiumContext.productUnderstanding.landingPage ? { landingPage: premiumContext.productUnderstanding.landingPage } : {}),
      styleReference: params.styleReference,
      ...(styleReferenceAnalysis ? { styleReferenceAnalysis } : {}),
    });
    const visualSystemResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: visualSystemContract.task,
      schema: visualSystemContract.schema,
      input: visualSystemContract.input,
    });

    const storyboardContract = storyboardTaskContract({
      app: params.input,
      patterns,
      visualSystem: visualSystemResult.object,
      ...(premiumContext.productUnderstanding.landingPage ? { landingPage: premiumContext.productUnderstanding.landingPage } : {}),
      styleReference: params.styleReference,
      ...(styleReferenceAnalysis ? { styleReferenceAnalysis } : {}),
      screenCount: outputScreenCount,
      includeCoverScreen: Boolean(params.includeCoverScreen),
    });
    const storyboardResult = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: storyboardContract.task,
      schema: storyboardContract.schema,
      input: storyboardContract.input,
    });

    if (useAiFirstReferenceComposition) {
      const loadSourceScreenshot = this.sourceScreenshotLoader
        ? (sourcePath: string) => this.sourceScreenshotLoader!.load(sourcePath)
        : undefined;
      const generatedBackgrounds = await this.generateOpenAIReferenceCompositions({
        model: params.imageModel ?? "gpt-image-1",
        input: params.input,
        storyboard: storyboardResult.object,
        styleReference: params.styleReference,
        ...(styleReferenceAnalysis ? { styleReferenceAnalysis } : {}),
        includeCoverScreen: Boolean(params.includeCoverScreen),
      });
      const compositions = buildGeneratedCompositions({
        storyboard: storyboardResult.object,
        backgrounds: generatedBackgrounds,
        includeCoverScreen: Boolean(params.includeCoverScreen),
      });
      const assets = await new ComposeGeneratedCompositionsUseCase().execute({
        compositions,
        target: params.target,
        ...(loadSourceScreenshot ? { loadSourceScreenshot } : {}),
      });
      const qualityReport = this.evaluator.execute({ assets, screens: storyboardResult.object.screens });
      const exported = await this.exporter.execute({ assets });
      return {
        readiness,
        patterns,
        visualSystem: visualSystemResult.object,
        storyboard: storyboardResult.object,
        assets,
        qualityReport,
        exportManifest: exported.manifest,
        zipBytes: exported.zipBytes,
        brandKit: premiumContext.brandKit,
        productUnderstanding: premiumContext.productUnderstanding,
        premiumRecipes,
        premiumCandidates,
      };
    }

    const finalSceneSet = sceneSet ? mergeSceneSetCopy(sceneSet, storyboardResult.object) : undefined;
    const storyboard = finalSceneSet
      ? compileSceneSetStoryboard(finalSceneSet, premiumContext.productUnderstanding)
      : storyboardResult.object;

    const generatedStyleBackgrounds = finalSceneSet && params.provider === "openai"
      ? await this.generateOpenAIStyleBackgrounds({
          model: params.imageModel ?? "gpt-image-1",
          input: params.input,
          sceneSet: finalSceneSet,
          styleReference: params.styleReference,
          ...(styleReferenceAnalysis ? { styleReferenceAnalysis } : {}),
        })
      : undefined;

    const loadSourceScreenshot = this.sourceScreenshotLoader
      ? (sourcePath: string) => this.sourceScreenshotLoader!.load(sourcePath)
      : undefined;
    const assets: RenderedAsset[] = finalSceneSet
      ? await this.sceneRenderer.execute({
          sceneSet: finalSceneSet,
          productUnderstanding: premiumContext.productUnderstanding,
          target: params.target,
          ...(loadSourceScreenshot ? { loadSourceScreenshot } : {}),
          ...(generatedStyleBackgrounds ? { generatedStyleBackgrounds } : {}),
        })
      : await this.renderer.execute({
          visualSystem: visualSystemResult.object,
          storyboard,
          target: params.target,
          ...(loadSourceScreenshot ? { loadSourceScreenshot } : {}),
        });

    const qualityReport = this.evaluator.execute({
      assets,
      screens: storyboard.screens,
      ...(finalSceneSet ? { sceneSet: finalSceneSet } : {}),
    });
    const exported = await this.exporter.execute({ assets });

    return {
      readiness,
      patterns,
      visualSystem: visualSystemResult.object,
      storyboard,
      assets,
      qualityReport,
      exportManifest: exported.manifest,
      zipBytes: exported.zipBytes,
      brandKit: premiumContext.brandKit,
      productUnderstanding: premiumContext.productUnderstanding,
      premiumRecipes,
      premiumCandidates,
      ...(finalSceneSet ? { sceneSet: finalSceneSet } : {}),
    };
  }

  private async analyzeStyleReference(params: GenerateStorePackInput): Promise<StyleReferenceAnalysis | undefined> {
    if (!params.styleReference.imageBase64) return undefined;
    if (params.provider !== "openai" && params.provider !== "gemini") return undefined;
    const contract = styleReferenceAnalysisTaskContract({ app: params.input, styleReference: params.styleReference });
    const result = await this.modelGateway.generateObject({
      provider: params.provider,
      model: params.model,
      task: contract.task,
      schema: contract.schema,
      input: contract.input,
    });
    return result.object;
  }

  private async generateOpenAIReferenceCompositions(params: {
    model: string;
    input: AppInput;
    storyboard: Storyboard;
    styleReference: StandardStyleReference;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
    includeCoverScreen: boolean;
  }): Promise<Record<string, { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" }>> {
    const imageBase64 = params.styleReference.imageBase64;
    if (!imageBase64) throw new Error("OpenAI reference composition requires an attached style reference image.");
    const entries = await Promise.all(params.storyboard.screens.map(async (screen) => {
      const image = await this.modelGateway.generateImage({
        provider: "openai",
        model: params.model,
        task: "style-reference.compose-screen",
        prompt: buildAiFirstCompositionPrompt(params, screen),
        referenceImage: {
          bytes: base64ToBytes(imageBase64),
          contentType: params.styleReference.mimeType,
        },
      });
      return [screen.id, image] as const;
    }));
    return Object.fromEntries(entries);
  }

  private async generateOpenAIStyleBackgrounds(params: {
    model: string;
    input: AppInput;
    sceneSet: SceneSet;
    styleReference: StandardStyleReference;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
  }): Promise<Record<string, { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" }> | undefined> {
    const imageBase64 = params.styleReference.imageBase64;
    if (!imageBase64) return undefined;
    const entries = await Promise.all(params.sceneSet.scenes.map(async (scene) => {
      const image = await this.modelGateway.generateImage({
        provider: "openai",
        model: params.model,
        task: "style-reference.edit-scene",
        prompt: buildReferenceEditPrompt(params, scene),
        referenceImage: {
          bytes: base64ToBytes(imageBase64),
          contentType: params.styleReference.mimeType,
        },
      });
      return [scene.id, image] as const;
    }));
    return Object.fromEntries(entries);
  }
}

function buildAiFirstCompositionPrompt(
  params: {
    input: AppInput;
    styleReference: StandardStyleReference;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
    includeCoverScreen: boolean;
  },
  screen: Storyboard["screens"][number],
): string {
  const isCover = params.includeCoverScreen && screen.index === 1;
  return `You are an expert App Store marketing art director.

Your job is NOT to recreate the reference image.

Your job is to infer the hidden visual design system behind the reference and reuse that design language to create a completely new marketing scene for another app.

The attached reference image is the single source of truth for the art direction.

--------------------------------------------------
STEP 1 — EXTRACT THE VISUAL DNA
--------------------------------------------------

Before generating anything, deeply analyze the reference and infer its visual language.

Do NOT copy visible objects.

Instead extract the underlying design system.

Infer:

• overall visual style
• campaign mood
• color palette
• lighting style
• rendering style
• illustration realism
• camera angle
• perspective
• composition rhythm
• spacing rhythm
• negative space usage
• visual hierarchy
• foreground/background layering
• depth treatment
• contrast level
• decorative density
• object scale
• shadow style
• glow treatment
• texture language
• premium cues
• motion feeling
• edge treatment
• framing
• typography placement strategy
• screenshot placement strategy

Treat this extracted language as the Visual DNA.

Never explain it.

Simply reuse it.

--------------------------------------------------
STEP 2 — ADAPT THE DNA
--------------------------------------------------

Apply the extracted Visual DNA to this new app.

App Name:
${params.input.appName}

Category:
${params.input.category}

Audience:
${params.input.targetAudience}

Value Proposition:
${params.input.mainValueProposition}

Scene Role:
${isCover ? "cover / portada" : screen.role}

Headline (used only to reserve layout space):
${screen.headline}

--------------------------------------------------
STEP 3 — BUILD A NEW SCENE
--------------------------------------------------

Create a completely original App Store marketing composition.

The final image must immediately feel like it belongs to the same premium campaign as the reference while being visually unique.

Never copy:

• objects
• layout
• illustrations
• scenery
• icons
• colors literally
• decorations
• textures

Instead recreate the same visual language.

--------------------------------------------------
LAYOUT
--------------------------------------------------

Reserve approximately:

• Top 25% for headline overlay
${isCover ? "• Center for strong cover artwork and campaign focal point" : "• Center for screenshot stage"}
• Decorative edges surrounding the ${isCover ? "cover focal area" : "screenshot"}
• Clear breathing room around important content

${isCover ? "No screenshot area is needed for this cover image." : "The screenshot area must be empty.\n\nDo NOT generate any app UI.\n\nInstead generate a clean premium placeholder stage where the real screenshot will later be inserted."}

--------------------------------------------------
SCREENSHOT STAGE
--------------------------------------------------

${isCover ? "This is a cover / portada. Do not generate a phone, phone mockup, screenshot placeholder, or app UI. Create a polished campaign opener with strong negative space for the final headline." : `Generate one elegant rounded placeholder.

The placeholder should:

• be centered
• have soft lighting
• subtle shadows
• premium depth
• neutral surface
• slightly elevated from background

No buttons.

No interface.

No fake controls.

No fake app.`}

--------------------------------------------------
ILLUSTRATION
--------------------------------------------------

Illustrate only supporting artwork related to the app.

Illustrations should reinforce the value proposition without competing with ${isCover ? "the cover headline area" : "the screenshot"}.

Use only visual metaphors directly implied by this product:

• app name: ${params.input.appName}
• category: ${params.input.category}
• audience: ${params.input.targetAudience}
• value proposition: ${params.input.mainValueProposition}

Avoid clichés.

Never repeat identical icons.

Never overload one side.

--------------------------------------------------
DECORATION
--------------------------------------------------

Generate decorative elements inspired by the extracted DNA.

Possible examples:

• gradients
• glow
• abstract geometry
• light streaks
• particles
• paint strokes
• abstract shapes
• texture fragments

These must support the composition instead of becoming the focus.

--------------------------------------------------
TYPOGRAPHY AREA
--------------------------------------------------

Do NOT generate readable text.

Instead reserve a visually balanced area where bold App Store typography can later be added.

No fake Latin.

No random letters.

No words.

--------------------------------------------------
CONSISTENCY
--------------------------------------------------

This image must belong to the exact same marketing campaign as every future screenshot.

Keep consistent across every scene:

• visual language
• color family
• lighting
• rendering quality
• framing
• decorative vocabulary
• depth
• texture language
• premium feeling

Only the illustration and supporting composition should change between screenshots.

--------------------------------------------------
NEGATIVE PROMPT
--------------------------------------------------

Do NOT generate:

phones

phone mockups

app UI

fake UI

buttons

labels

logos

brands

copyrighted elements

faces

people

characters

mascots

book motifs

reading motifs

fake text

Lorem Ipsum

random letters

watermarks

repeated map pins

generic travel templates

low detail

minimal flat illustrations

cheap stock illustration style

--------------------------------------------------
OUTPUT
--------------------------------------------------

Produce one polished App Store marketing poster.

The final result should look like artwork created by a senior designer for a top-grossing App Store feature.

No readable text.

No UI.

No phones.

Only the final composition with ${isCover ? "a premium cover scene and headline-safe space" : "a premium screenshot stage"}.`;
}

function buildReferenceEditPrompt(
  params: {
    input: AppInput;
    styleReference: StandardStyleReference;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
  },
  scene: SceneSet["scenes"][number],
): string {
  const analysis = params.styleReferenceAnalysis;
  return [
    "Modify/adapt the selected reference image into one vertical App Store screenshot poster stage for this exact app.",
    "The reference is the deterministic art direction source: preserve its rhythm of bold top typography zones, phone-stage energy, saturated color/lighting, depth, shadows, decorative density, and modern app-store composition.",
    "CRITICAL: output a clean visual stage/background only. ZERO readable letters, words, numbers, logos, app names, slogans, fake UI labels, or typography in the generated image. If the reference contains text, replace it with abstract blurred blocks/shape energy, not text.",
    "Do not use generic category templates. Do not use prior example apps. Do not introduce books, literary routes, e-book elements, reading, or LiteraryTrip unless the product metadata explicitly says so.",
    "Do not draw map pins repeatedly. Do not draw phones or app UI. The renderer will add the real phone screenshot and final readable text later.",
    "Do not copy reference text, logos, characters, faces, trademarks, brand names, or exact UI. Replace them with abstract, app-specific shapes and decorative elements.",
    `App: ${params.input.appName}. Category: ${params.input.category}. Audience: ${params.input.targetAudience}. Value proposition: ${params.input.mainValueProposition}.`,
    `Scene ${scene.index} role: ${scene.role}. Intended headline: ${scene.copy.headline}. Composition: ${scene.composition}. ${scene.devices.length === 0 ? "This is a cover/portada scene: create a strong poster-like opener with no phone mockup; leave central space for our final headline." : "This is a screenshot scene: leave room for our real phone screenshot overlay."}`,
    analysis ? `Reference analysis: ${analysis.visualSummary}. Layout: ${analysis.layoutRhythm.join("; ")}. Typography: ${analysis.typographyStyle.join("; ")}. Color/lighting: ${analysis.colorAndLighting.join("; ")}. Composition rules: ${analysis.compositionRules.join("; ")}. Forbidden carryovers: ${analysis.forbiddenCarryovers.join("; ")}.` : "",
    "Output only the visual stage/background. Leave clean negative space for deterministic overlay of the real phone screenshot and final text. No readable text in the generated image.",
  ].filter(Boolean).join(" ");
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function mergeSceneSetCopy(sceneSet: SceneSet, storyboard: Storyboard): SceneSet {
  const screensByIndex = new Map(storyboard.screens.map((screen) => [screen.index, screen]));
  return SceneSetSchema.parse({
    ...sceneSet,
    scenes: sceneSet.scenes.map((scene) => {
      const screen = screensByIndex.get(scene.index);
      if (!screen) return scene;
      return {
        ...scene,
        copy: {
          ...scene.copy,
          headline: screen.headline,
          ...(screen.subheadline ? { subheadline: screen.subheadline } : {}),
        },
        callouts: screen.callouts ?? scene.callouts,
      };
    }),
  });
}

function compileSceneSetStoryboard(sceneSet: SceneSet, productUnderstanding: ProductUnderstanding): Storyboard {
  const sourcePathsByScreenshotId = new Map(
    productUnderstanding.screenInventory.map((screen) => [screen.screenshotId, screen.sourcePath]),
  );
  const fallbackPath = productUnderstanding.screenInventory[0]?.sourcePath ?? "input/screenshot.png";

  return StoryboardSchema.parse({
    screens: sceneSet.scenes.map((scene) => {
      const primaryDevice = scene.devices[0];
      const secondaryDevice = scene.devices[1];
      const primaryPath = primaryDevice ? sourcePathsByScreenshotId.get(primaryDevice.screenshotId) ?? fallbackPath : fallbackPath;
      const secondaryPath = secondaryDevice ? sourcePathsByScreenshotId.get(secondaryDevice.screenshotId) ?? fallbackPath : undefined;

      return {
        id: scene.id,
        index: scene.index,
        role: scene.role,
        headline: scene.copy.headline,
        ...(scene.copy.subheadline ? { subheadline: scene.copy.subheadline } : {}),
        treatment: treatmentForComposition(scene.composition),
        sourceScreenshotPath: primaryPath,
        ...(secondaryPath ? { secondarySourceScreenshotPath: secondaryPath } : {}),
        device: {
          scale: primaryDevice?.scale,
          tilt: primaryDevice?.tilt,
          crop: primaryDevice?.crop,
        },
        callouts: scene.callouts,
      };
    }),
  });
}

function treatmentForComposition(composition: SceneSet["scenes"][number]["composition"]): Storyboard["screens"][number]["treatment"] {
  if (composition === "split-devices" || composition === "proof-poster") return "premium-proof-card";
  if (composition === "object-led") return "cinematic-poster";
  if (composition === "panoramic-sequence") return "map-route-editorial";
  if (composition === "cropped-edge-device" || composition === "before-after") return "callout-zoom";
  return "hero-device";
}
