import sharp from "sharp";

import { EvaluateStoreSetUseCase } from "@app-screenshot-ai/evaluator";
import { ExportStorePackUseCase } from "@app-screenshot-ai/export-engine";
import type { ModelGateway } from "@app-screenshot-ai/model-gateway";
import type { PatternLibrary } from "@app-screenshot-ai/pattern-library";
import {
  type AppInput,
  type ExportManifest,
  type InputReadinessReport,
  type QualityReport,
  type RenderedAsset,
  type RenderTarget,
  type StandardStyleReference,
  type Storyboard,
  type VisualSystem,
  type StyleReferenceAnalysis,
} from "@app-screenshot-ai/schemas";

import { CheckInputReadinessUseCase } from "../input-readiness";
import { GenerateStorePackError, type SourceScreenshotLoaderPort } from "./generate-store-pack";
import { styleReferenceAnalysisTaskContract } from "./ai-task-contracts";

export type PremiumDirectCandidate = {
  id: string;
  index: number;
  promptVersion: "premium-direct/v1";
  prompts: Array<{ screenId: string; prompt: string }>;
  assets: RenderedAsset[];
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
};

export type GeneratePremiumDirectStorePackInput = {
  input: AppInput;
  provider: string;
  model: string;
  imageModel: string;
  target: RenderTarget;
  styleReference: StandardStyleReference;
  includeCoverScreen?: boolean;
  candidateCount?: number;
};

export type GeneratePremiumDirectStorePackResult = {
  readiness: InputReadinessReport;
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  candidates: PremiumDirectCandidate[];
  selectedCandidate: PremiumDirectCandidate;
  assets: RenderedAsset[];
  qualityReport: QualityReport;
  exportManifest: ExportManifest;
  zipBytes: Uint8Array;
};

export class GeneratePremiumDirectStorePackUseCase {
  private readonly modelGateway: ModelGateway;
  private readonly patternLibrary: PatternLibrary;
  private readonly readiness = new CheckInputReadinessUseCase();
  private readonly evaluator = new EvaluateStoreSetUseCase();
  private readonly exporter = new ExportStorePackUseCase();
  private readonly sourceScreenshotLoader: SourceScreenshotLoaderPort | undefined;

  constructor(params: {
    modelGateway: ModelGateway;
    patternLibrary: PatternLibrary;
    sourceScreenshotLoader?: SourceScreenshotLoaderPort;
  }) {
    this.modelGateway = params.modelGateway;
    this.patternLibrary = params.patternLibrary;
    this.sourceScreenshotLoader = params.sourceScreenshotLoader;
  }

  async execute(params: GeneratePremiumDirectStorePackInput): Promise<GeneratePremiumDirectStorePackResult> {
    const readiness = await this.readiness.execute(params.input);
    if (!readiness.canGenerate) throw new GenerateStorePackError(readiness);
    if (!params.styleReference.imageBase64) throw new Error("Premium Direct Mode requires an attached style reference image.");

    const styleReferenceAnalysis = await this.analyzeStyleReference(params);
    const outputScreenCount = params.input.screenshots.length + (params.includeCoverScreen ? 1 : 0);
    const visualSystem = buildPremiumDirectVisualSystem(params.input);
    const storyboard = buildPremiumDirectStoryboard({
      input: params.input,
      outputScreenCount,
      includeCoverScreen: Boolean(params.includeCoverScreen),
    });

    const candidateCount = Math.max(1, Math.min(3, params.candidateCount ?? 3));
    const candidates: PremiumDirectCandidate[] = [];
    for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex += 1) {
      candidates.push(await this.generateCandidate({
        ...params,
        storyboard,
        candidateIndex,
        ...(styleReferenceAnalysis ? { styleReferenceAnalysis } : {}),
      }));
    }

    const selectedCandidate = candidates[0]!;
    const exported = await this.exporter.execute({ assets: selectedCandidate.assets });

    return {
      readiness,
      visualSystem,
      storyboard,
      candidates,
      selectedCandidate,
      assets: selectedCandidate.assets,
      qualityReport: selectedCandidate.qualityReport,
      exportManifest: exported.manifest,
      zipBytes: exported.zipBytes,
    };
  }

  private async analyzeStyleReference(params: GeneratePremiumDirectStorePackInput): Promise<StyleReferenceAnalysis | undefined> {
    if (params.provider !== "openai" && params.provider !== "gemini" && params.provider !== "fixture") return undefined;
    const contract = styleReferenceAnalysisTaskContract({ app: params.input, styleReference: params.styleReference });
    try {
      return (await this.modelGateway.generateObject({
        provider: params.provider,
        model: params.model,
        task: contract.task,
        schema: contract.schema,
        input: contract.input,
      })).object;
    } catch {
      return undefined;
    }
  }

  private async generateCandidate(params: GeneratePremiumDirectStorePackInput & {
    storyboard: Storyboard;
    candidateIndex: number;
    styleReferenceAnalysis?: StyleReferenceAnalysis;
  }): Promise<PremiumDirectCandidate> {
    const prompts: PremiumDirectCandidate["prompts"] = [];
    const assets = await Promise.all(params.storyboard.screens.map(async (screen) => {
      const prompt = buildPremiumDirectFullCompositionPrompt(params, screen);
      prompts.push({ screenId: screen.id, prompt });
      const sourceScreenshot = this.sourceScreenshotLoader && !(params.includeCoverScreen && screen.index === 1)
        ? await this.sourceScreenshotLoader.load(screen.sourceScreenshotPath)
        : undefined;
      const image = await this.modelGateway.generateImage({
        provider: params.provider,
        model: params.imageModel,
        task: "premium-direct.full-composition.generate",
        prompt,
        referenceImages: [
          { bytes: base64ToBytes(params.styleReference.imageBase64!), contentType: params.styleReference.mimeType },
          ...(sourceScreenshot ? [{ bytes: sourceScreenshot.bytes, contentType: sourceScreenshot.contentType }] : []),
        ],
      });
      return renderOpenAiFinalImageAsAsset({ image, target: params.target, screen });
    }));
    const qualityReport = this.evaluator.execute({ assets, screens: params.storyboard.screens });
    const exportManifest = (await this.exporter.execute({ assets })).manifest;
    return {
      id: `premium-direct-${params.candidateIndex + 1}`,
      index: params.candidateIndex + 1,
      promptVersion: "premium-direct/v1",
      prompts: prompts.sort((a, b) => a.screenId.localeCompare(b.screenId)),
      assets,
      qualityReport,
      exportManifest,
    };
  }
}

function buildPremiumDirectVisualSystem(input: AppInput): VisualSystem {
  const colors = input.brand?.colors ?? [];
  return {
    id: "premium-direct-openai-full-poster-v1",
    layoutFamily: "cinematic-atlas",
    motif: "atlas-glow",
    palette: {
      background: colors[0] ?? "#101820",
      primary: colors[1] ?? "#FFFFFF",
      accent: colors[2] ?? "#6957FF",
      text: "#FFFFFF",
    },
    typography: {
      headlineFamily: "Inter",
      headlineWeight: 900,
    },
    layout: {
      safeMargin: 96,
      headlineY: 160,
      deviceY: 760,
      deviceWidthRatio: 0.62,
    },
  };
}

function buildPremiumDirectStoryboard(params: {
  input: AppInput;
  outputScreenCount: number;
  includeCoverScreen: boolean;
}): Storyboard {
  const roles = params.includeCoverScreen
    ? ["hook", "feature", "comparison", "proof", "cta"]
    : ["hook", "feature", "comparison", "proof", "cta"];
  const source = (index: number) => params.input.screenshots[index]?.path ?? params.input.screenshots[0]?.path ?? "input/screenshot.png";
  const firstHeadline = titleCase(params.input.mainValueProposition).split(/\s+/).slice(0, 6).join(" ");
  const category = params.input.category.toLowerCase();
  const defaultHeadlines = category.includes("travel") || category.includes("route")
    ? [firstHeadline, "Discover Every Stop", "Build Routes Faster", "Travel With Confidence", "Start Your Next Trip"]
    : [firstHeadline, "See The Core Flow", "Get More Done", "Proof You Can Trust", "Start With Confidence"];

  return {
    screens: Array.from({ length: params.outputScreenCount }, (_, index) => {
      const isCover = params.includeCoverScreen && index === 0;
      const screenshotIndex = params.includeCoverScreen ? Math.max(0, index - 1) : index;
      const role = roles[index] ?? "feature";
      return {
        id: `${role}-${index + 1}`,
        index: index + 1,
        role,
        headline: defaultHeadlines[index] ?? defaultHeadlines[defaultHeadlines.length - 1]!,
        subheadline: index === 0 ? `For ${params.input.targetAudience}` : params.input.appName,
        treatment: "cinematic-poster",
        sourceScreenshotPath: source(screenshotIndex),
        ...(isCover ? {} : { secondarySourceScreenshotPath: source((screenshotIndex + 1) % Math.max(1, params.input.screenshots.length)) }),
      };
    }),
  };
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function buildPremiumDirectFullCompositionPrompt(
  params: GeneratePremiumDirectStorePackInput & { storyboard: Storyboard; candidateIndex: number; styleReferenceAnalysis?: StyleReferenceAnalysis },
  screen: Storyboard["screens"][number],
): string {
  const variant = [
    "balanced premium App Store poster, strong hierarchy, real screenshot clearly visible",
    "bolder top-1% composition with stronger depth, lighting, and distinctive category-specific art direction",
    "clean high-conversion version focused on thumbnail readability and screenshot clarity",
  ][params.candidateIndex] ?? "balanced premium";
  const isCover = Boolean(params.includeCoverScreen && screen.index === 1);
  const campaignStoryboard = params.storyboard.screens
    .map((storyScreen) => `${storyScreen.index}. ${storyScreen.role}: ${storyScreen.headline}`)
    .join(" | ");
  return [
    "You are ChatGPT acting as a senior App Store screenshot designer. Create the COMPLETE final App Store screenshot poster. Do not leave anything for another renderer.",
    `This is poster ${screen.index} of ${params.input.screenshots.length + (params.includeCoverScreen ? 1 : 0)} in ONE coherent App Store screenshot campaign.`,
    `Candidate direction: ${variant}.`,
    `App: ${params.input.appName}. Category: ${params.input.category}. Audience: ${params.input.targetAudience}. Value proposition: ${params.input.mainValueProposition}.`,
    "STEP 1 — EXTRACT THE REFERENCE DNA",
    "Use the first attached image as the campaign master. Before designing, infer its portable visual system:",
    "- palette relationships and color hierarchy",
    "- lighting model and contrast level",
    "- depth/shadow language",
    "- background material/texture language",
    "- phone/device mockup style",
    "- screenshot treatment and placement style",
    "- typography style, headline scale and headline placement",
    "- spacing rhythm and negative-space rules",
    "- decorative density and object/material vocabulary",
    "- premium finishing details such as glow, blur, grain, reflections or outlines",
    "Do this analysis silently. Do not describe it in the image.",
    "CRITICAL FORMAT AND TYPOGRAPHY RULES",
    "Design for an ultra-tall App Store screenshot poster close to iPhone 6.9 aspect ratio (1320×2868, about 9:19.5).",
    "Keep all important content inside a central safe area with at least 10% horizontal padding and 7% vertical padding.",
    "Never let headline or subheadline touch/cross the image edges.",
    "The headline must be fully visible. Break it into 2–3 balanced lines if needed. Use the exact requested words, but choose line breaks and font size so nothing is cropped.",
    "Typography alignment must be derived from the reference and consistent across the whole set: if the reference uses centered headlines, center all headlines; if it uses left-aligned headlines, left-align all headlines.",
    "Do not mix centered typography in one poster and left-aligned typography in another unless the reference clearly does that as a deliberate system.",
    "STEP 2 — APPLY THAT DNA TO THIS WHOLE SET",
    "All posters in this run must look like they belong to the exact same campaign derived from the reference DNA.",
    "Reuse the extracted palette relationships, lighting model, depth style, shadow style, background material, device mockup style, typography style, spacing rhythm, and decorative vocabulary.",
    "Vary the composition per poster, but never change art direction.",
    "Imagine the 3–5 final images viewed side by side in the App Store: consistency must be immediate.",
    "STEP 3 — DO NOT COPY NON-PORTABLE REFERENCE ELEMENTS",
    "Do not copy exact reference text, logos, brands, app UI, characters, faces, trademarks, exact objects, or a recognizable exact layout.",
    "Imitate the system, not the content.",
    campaignStoryboard ? `Full set narrative for consistency: ${campaignStoryboard}` : "",
    `Final readable headline text to place: ${screen.headline}`,
    screen.subheadline ? `Final readable subheadline text to place: ${screen.subheadline}` : "No subheadline is required unless it improves the design.",
    `Scene ${screen.index}: role=${screen.role}.`,
    params.styleReferenceAnalysis ? `Portable visual DNA from the style reference: ${params.styleReferenceAnalysis.visualSummary}. Rhythm: ${params.styleReferenceAnalysis.layoutRhythm.join("; ")}. Typography: ${params.styleReferenceAnalysis.typographyStyle.join("; ")}. Lighting/color: ${params.styleReferenceAnalysis.colorAndLighting.join("; ")}. Composition rules: ${params.styleReferenceAnalysis.compositionRules.join("; ")}.` : "Use the first attached image as style reference. Adapt its visual DNA, premium feeling, lighting, depth, composition energy and hierarchy. Do not copy its text, brand, UI or exact layout.",
    isCover
      ? "This is a cover/portada image: create a complete premium campaign opener with headline text and no app screenshot if that looks better."
      : "Use the second attached image as the app screenshot source. Place it inside a polished phone mockup or premium device composition. Preserve the app UI as accurately as possible and keep it readable.",
    "The final poster must already include: background, objects, lighting, phone/device, screenshot, headline, optional subheadline, shadows, depth and finished composition.",
    "Avoid cheap template look. Avoid generic gradients with random cards. Make it feel like a premium App Store campaign designed by a top mobile growth designer.",
    "Do not include extra random text, lorem ipsum, unrelated labels, logos, watermarks, fake brands, faces, or copyrighted elements. Only use the requested headline/subheadline as readable marketing text.",
    "Output one complete vertical App Store screenshot poster that is consistent with the rest of this campaign.",
  ].filter(Boolean).join("\n\n");
}

async function renderOpenAiFinalImageAsAsset(params: {
  image: { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" };
  target: RenderTarget;
  screen: Storyboard["screens"][number];
}): Promise<RenderedAsset> {
  const source = Buffer.from(params.image.bytes);
  const background = await sharp(source)
    .resize(params.target.width, params.target.height, { fit: "cover", position: "center" })
    .blur(24)
    .modulate({ brightness: 0.82, saturation: 1.08 })
    .png()
    .toBuffer();
  const foreground = await sharp(source)
    .resize(params.target.width, params.target.height, { fit: "contain", position: "center" })
    .png()
    .toBuffer();
  const bytes = await sharp(background)
    .composite([{ input: foreground, gravity: "center" }])
    .png()
    .toBuffer();
  return {
    id: `premium-direct-${params.screen.index}`,
    screenIndex: params.screen.index,
    store: params.target.store,
    device: params.target.device,
    locale: params.target.locale,
    fileName: `${String(params.screen.index).padStart(2, "0")}-${slugify(params.screen.role)}.png`,
    contentType: "image/png",
    width: params.target.width,
    height: params.target.height,
    bytes: new Uint8Array(bytes),
  };
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen";
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}
