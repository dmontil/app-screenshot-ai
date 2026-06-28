import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { LocalProjectGenerationSession } from "@app-screenshot-ai/local-project-session";
import { LocalProjectStore } from "@app-screenshot-ai/local-project-store";
import { createModelGateway, type SupportedProvider } from "@app-screenshot-ai/model-gateway";
import { createDefaultPremiumRecipeLibrary, PatternLibrary } from "@app-screenshot-ai/pattern-library";
import { AppInputSchema, getStandardStyleReference, STANDARD_STYLE_REFERENCES, type AppInput, type RawScreenshot, type StandardStyleReference } from "@app-screenshot-ai/schemas";

import { defaultImageModelFor, defaultModelFor, parseScreenshotKind, readActualSecret, readGenerationMode, readPositiveInt, readProvider, readString, slug } from "./generate-route-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const root = appRoot();
    const provider = readProvider(form.get("provider"));
    const projectId = slug(readString(form.get("projectId")) || readString(form.get("appName")) || "app-project");
    const uploadDir = path.join(root, ".local", "projects", projectId, "input", "screenshots");
    await mkdir(uploadDir, { recursive: true });

    const uploadedScreenshots = await persistScreenshots(form, uploadDir, projectId);
    const screenshots = uploadedScreenshots.length > 0 ? uploadedScreenshots : await readStoredScreenshots(root, projectId);
    const input = buildInput(form, screenshots);
    const styleReference = await readSelectedStyleReference({ form, root, provider });

    const geminiApiKey = readActualSecret(readString(form.get("geminiApiKey")), process.env.GEMINI_API_KEY);
    const openaiApiKey = readActualSecret(readString(form.get("openaiApiKey")), process.env.OPENAI_API_KEY);
    const gateway = createModelGateway({
      provider,
      ...(geminiApiKey ? { geminiApiKey } : {}),
      ...(openaiApiKey ? { openaiApiKey } : {}),
    });

    const store = new LocalProjectStore({ rootDir: path.join(root, ".local", "projects") });
    const session = new LocalProjectGenerationSession({
      store,
      modelGateway: gateway,
      patternLibrary: createDefaultPatternLibrary(),
      premiumRecipeLibrary: createDefaultPremiumRecipeLibrary(),
      sourceScreenshotLoader: {
        async load(sourcePath) {
          return {
            bytes: new Uint8Array(await readFile(sourcePath)),
            contentType: sourcePath.endsWith(".jpg") || sourcePath.endsWith(".jpeg") ? "image/jpeg" : "image/png",
          };
        },
      },
    });

    const model = readString(form.get("model")) || defaultModelFor(provider);
    const imageModel = readString(form.get("imageModel")) || defaultImageModelFor(provider);
    const includeCoverScreen = readString(form.get("includeCoverScreen")) === "on";
    const generationMode = readGenerationMode(form.get("generationMode"));
    const premiumDirectCandidateCount = readPositiveInt(form.get("premiumDirectCandidateCount")) ?? 3;
    const result = await session.generateStorePack({
      projectId,
      input,
      provider,
      model,
      label: readString(form.get("generationLabel")) || "AI generation",
      target: { store: "app-store", device: "iphone-6.9", locale: input.baseLocale, width: 1320, height: 2868 },
      styleReference,
      ...(imageModel ? { imageModel } : {}),
      includeCoverScreen,
      generationMode,
      premiumDirectCandidateCount,
    });

    return Response.json(toGenerateResponse(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const readinessIssues = readinessMessages(error);
    return Response.json({ error: readinessIssues.length ? `${message} ${readinessIssues.join(" ")}` : message }, { status: 400 });
  }
}

function readinessMessages(error: unknown): string[] {
  if (!error || typeof error !== "object" || !("readiness" in error)) return [];
  const readiness = (error as { readiness?: { issues?: Array<{ message?: unknown }> } }).readiness;
  return readiness?.issues?.map((issue) => typeof issue.message === "string" ? issue.message : "").filter(Boolean) ?? [];
}

function toGenerateResponse(result: Awaited<ReturnType<LocalProjectGenerationSession["generateStorePack"]>>) {
  return {
    projectId: result.projectId,
    generationId: result.generationId,
    provider: result.provider,
    model: result.model,
    screenshots: result.screenshots.map((asset) => ({
      fileName: asset.fileName,
      dataUrl: `data:${asset.contentType};base64,${Buffer.from(asset.bytes).toString("base64")}`,
    })),
    qualityReport: result.qualityReport,
    visualSystem: result.visualSystem,
    storyboard: result.storyboard,
    exportManifest: result.exportManifest,
    brandKit: result.brandKit,
    productUnderstanding: result.productUnderstanding,
    premiumRecipes: result.premiumRecipes,
    premiumCandidates: result.premiumCandidates,
    sceneSet: result.sceneSet,
    input: result.input,
    styleReference: result.styleReference,
    generationMode: result.generationMode,
    premiumDirect: result.premiumDirect,
    zip: {
      fileName: result.zip.fileName,
      dataUrl: `data:application/zip;base64,${Buffer.from(result.zip.bytes).toString("base64")}`,
    },
    localProjectPath: `.local/projects/${result.projectId}`,
  };
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}

function buildInput(form: FormData, screenshots: RawScreenshot[]): AppInput {
  return AppInputSchema.parse({
    appName: readString(form.get("appName")),
    category: readString(form.get("category")),
    targetAudience: readString(form.get("targetAudience")),
    mainValueProposition: readString(form.get("mainValueProposition")),
    targetStores: ["app-store"],
    baseLocale: readString(form.get("baseLocale")) || "en-US",
    screenshots,
    brand: {
      colors: readString(form.get("brandColors"))
        .split(",")
        .map((color) => color.trim())
        .filter(Boolean),
      websiteUrl: readString(form.get("websiteUrl")) || undefined,
    },
  });
}

async function readStoredScreenshots(root: string, projectId: string): Promise<RawScreenshot[]> {
  try {
    const raw = await readFile(path.join(root, ".local", "projects", projectId, "input", "metadata.json"), "utf8");
    const input = AppInputSchema.parse(JSON.parse(raw));
    return input.screenshots;
  } catch {
    return [];
  }
}

async function persistScreenshots(form: FormData, uploadDir: string, projectId: string): Promise<RawScreenshot[]> {
  const files = form.getAll("screenshots").filter((value): value is File => value instanceof File && value.size > 0);
  const kinds = form.getAll("screenshotKinds").map(readString);

  const screenshots: RawScreenshot[] = [];
  for (const [index, file] of files.entries()) {
    const extension = file.type === "image/jpeg" ? "jpg" : "png";
    const fileName = `${String(index + 1).padStart(2, "0")}-${slug(file.name.replace(/\.[^.]+$/, "") || `${projectId}-${index}`)}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, new Uint8Array(await file.arrayBuffer()));
    screenshots.push({
      id: `screen-${index + 1}`,
      path: filePath,
      kind: parseScreenshotKind(kinds[index] || "functional"),
    });
  }
  return screenshots;
}

async function readSelectedStyleReference(params: { form: FormData; root: string; provider: SupportedProvider }): Promise<StandardStyleReference> {
  const selectedId = readString(params.form.get("styleReferenceId"));
  const reference = selectedId ? getStandardStyleReference(selectedId) : params.provider === "fixture" ? STANDARD_STYLE_REFERENCES[0] : undefined;
  if (!reference) {
    throw new Error("Choose one standard visual reference before generating.");
  }
  const bytes = await readFile(path.join(params.root, reference.path));
  return {
    ...reference,
    imageBase64: Buffer.from(bytes).toString("base64"),
  };
}

function createDefaultPatternLibrary(): PatternLibrary {
  return new PatternLibrary([
    pattern("travel", "discovery", ["editorial", "warm", "premium"]),
    pattern("productivity", "clarity", ["calm", "focused", "premium"]),
    pattern("fitness", "motivation", ["bold", "energetic", "clean"]),
    pattern("finance", "trust", ["secure", "minimal", "confident"]),
    pattern("education", "learning", ["friendly", "clear", "bright"]),
  ]);
}

function pattern(category: string, conversionIntent: string, tone: string[]) {
  return {
    id: `${category}_${conversionIntent}_01`,
    category,
    conversionIntent,
    layoutFamily: "top_headline_center_device",
    tone,
    rules: { maxHeadlineWords: 6, backgroundComplexity: "low" as const, uiVisibility: "high" as const },
    whyItWorks: ["Keeps the app UI visible.", "Uses short readable headlines.", "Maintains visual continuity."],
  };
}

