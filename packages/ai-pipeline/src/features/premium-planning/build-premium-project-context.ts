import { BrandKitSchema, ProductUnderstandingSchema, type AppInput, type BrandKit, type LandingPageContext, type ProductUnderstanding } from "@app-screenshot-ai/schemas";

export type LandingPageLoaderPort = {
  load(url: string): Promise<string | undefined>;
};

export type BuildPremiumProjectContextInput = {
  input: AppInput;
};

export type BuildPremiumProjectContextOptions = {
  landingPageLoader?: LandingPageLoaderPort;
};

export type PremiumProjectContext = {
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
};

export class BuildPremiumProjectContextUseCase {
  private readonly landingPageLoader: LandingPageLoaderPort;

  constructor(options: BuildPremiumProjectContextOptions = {}) {
    this.landingPageLoader = options.landingPageLoader ?? new FetchLandingPageLoader();
  }

  async execute(params: BuildPremiumProjectContextInput): Promise<PremiumProjectContext> {
    const landingPage = await this.analyzeLandingPage(params.input.brand?.websiteUrl);
    const brandKit = buildBrandKit(params.input, landingPage);
    const category = canonicalCategory(params.input.category);
    const productUnderstanding = ProductUnderstandingSchema.parse({
      appName: params.input.appName,
      category,
      valueProposition: landingPage?.headline ?? params.input.mainValueProposition,
      audience: params.input.targetAudience,
      ...(landingPage ? { landingPage } : {}),
      screenInventory: params.input.screenshots.map((screenshot) => ({
        screenshotId: screenshot.id,
        sourcePath: screenshot.path,
        role: inferScreenRole(screenshot.id, screenshot.path),
        dominantColors: brandKit.palette.secondary
          ? [brandKit.palette.primary, brandKit.palette.accent, brandKit.palette.secondary]
          : [brandKit.palette.primary, brandKit.palette.accent],
        visualDensity: "medium",
        bestFor: inferBestFor(screenshot.id, screenshot.path),
      })),
    });

    return { brandKit, productUnderstanding };
  }

  private async analyzeLandingPage(url: string | undefined): Promise<LandingPageContext | undefined> {
    if (!url) return undefined;
    try {
      const html = await this.landingPageLoader.load(url);
      if (!html) return undefined;
      const context = analyzeLandingPageHtml(url, html);
      if (!context.title && !context.description && !context.headline && context.extractedColors.length === 0) return undefined;
      return context;
    } catch {
      return undefined;
    }
  }
}

class FetchLandingPageLoader implements LandingPageLoaderPort {
  async load(url: string): Promise<string | undefined> {
    if (typeof fetch !== "function") return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "AppScreenshotAI/0.1 brand-context" },
      });
      if (!response.ok) return undefined;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) return undefined;
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildBrandKit(input: AppInput, landingPage: LandingPageContext | undefined): BrandKit {
  const manualColors = input.brand?.colors?.filter(Boolean) ?? [];
  const defaults = categoryBrandDefaults(canonicalCategory(input.category));
  const landingColors = landingPage?.extractedColors ?? [];
  const palette = manualColors.length > 0
    ? {
        background: manualColors[0] ?? defaults.palette.background,
        primary: manualColors[1] ?? defaults.palette.primary,
        accent: manualColors[2] ?? defaults.palette.accent,
        surface: defaults.palette.surface,
        text: defaults.palette.text,
        ...(manualColors[3] ? { secondary: manualColors[3] } : {}),
      }
    : landingColors.length > 0
      ? {
          ...defaults.palette,
          primary: landingColors[0] ?? defaults.palette.primary,
          accent: landingColors[1] ?? landingColors[0] ?? defaults.palette.accent,
          ...(landingColors[2] ? { secondary: landingColors[2] } : defaults.palette.secondary ? { secondary: defaults.palette.secondary } : {}),
        }
      : defaults.palette;

  return BrandKitSchema.parse({
    source: manualColors.length > 0 ? "manual" : landingPage ? "landing" : "category-default",
    palette,
    typography: defaults.typography,
    imagery: {
      ...defaults.imagery,
      keywords: deriveImageryKeywords(input, defaults.imagery.keywords),
    },
    tone: landingPage ? Array.from(new Set([...defaults.tone, "landing-informed"])) : defaults.tone,
  });
}

export function analyzeLandingPageHtml(url: string, html: string): LandingPageContext {
  const title = cleanText(matchTag(html, "title"));
  const description = cleanText(metaContent(html, "description") ?? metaContent(html, "og:description") ?? metaContent(html, "twitter:description"));
  const headline = cleanText(matchTag(html, "h1") ?? metaContent(html, "og:title") ?? title);
  const extractedColors = extractColors(html);

  return {
    url,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(headline ? { headline } : {}),
    extractedColors,
  };
}

function extractColors(html: string): string[] {
  const colors: string[] = [];
  const themeColor = metaContent(html, "theme-color");
  if (themeColor) colors.push(...colorsFromText(themeColor));
  colors.push(...colorsFromText(html));
  return Array.from(new Set(colors.map(normalizeHexColor).filter((color): color is string => Boolean(color)))).slice(0, 8);
}

function colorsFromText(value: string): string[] {
  return value.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
}

function normalizeHexColor(value: string): string | undefined {
  const hex = value.toUpperCase();
  if (/^#[0-9A-F]{3}$/.test(hex)) {
    const [, r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9A-F]{6}$/.test(hex)) return hex;
  return undefined;
}

function matchTag(html: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(html);
  return match?.[1];
}

function metaContent(html: string, nameOrProperty: string): string | undefined {
  const metas = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const meta of metas) {
    const attrs = parseAttributes(meta);
    const key = attrs.name ?? attrs.property;
    if (key?.toLowerCase() === nameOrProperty.toLowerCase()) return attrs.content;
  }
  return undefined;
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    const name = match[1]?.toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (name) attrs[name] = value;
  }
  return attrs;
}

function cleanText(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = decodeHtmlEntities(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function inferScreenRole(id: string, path: string): ProductUnderstanding["screenInventory"][number]["role"] {
  const value = `${id} ${path}`.toLowerCase();
  if (value.includes("search")) return "search";
  if (value.includes("map") || value.includes("route")) return "map";
  if (value.includes("detail") || value.includes("feature")) return "detail";
  if (value.includes("profile") || value.includes("account")) return "profile";
  if (value.includes("checkout") || value.includes("pay")) return "checkout";
  if (value.includes("home") || value.includes("main")) return "home";
  return "unknown";
}

function inferBestFor(id: string, path: string): ProductUnderstanding["screenInventory"][number]["bestFor"] {
  const role = inferScreenRole(id, path);
  if (role === "home") return ["hook", "cta"];
  if (role === "search" || role === "map") return ["feature", "comparison"];
  if (role === "detail") return ["feature", "proof"];
  return ["feature"];
}

function canonicalCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (["utility", "utilities", "productivity", "tools", "tool", "business"].includes(normalized)) return "utility";
  if (["travel", "navigation", "maps", "lifestyle"].includes(normalized)) return "travel";
  if (["finance", "fintech", "banking", "budget", "money"].includes(normalized)) return "finance";
  if (["fitness", "health", "wellness", "sports"].includes(normalized)) return "fitness";
  if (["education", "learning", "courses"].includes(normalized)) return "education";
  if (["social", "social networking", "community"].includes(normalized)) return "social";
  return normalized;
}

function deriveImageryKeywords(input: AppInput, fallback: string[]): string[] {
  const text = `${input.appName} ${input.category} ${input.targetAudience} ${input.mainValueProposition}`.toLowerCase();
  const keywords: string[] = [];
  if (/camper|van|rv|caravan|autocaravana|furgo|furgoneta/.test(text)) keywords.push("camper-van", "routes", "places");
  if (/map|route|ruta|trip|travel|viaje|city|ciudad|place|lugar/.test(text)) keywords.push("maps", "routes", "places");
  if (/book|libro|literary|reader|novel/.test(text)) keywords.push("books");
  if (/friend|social|chat|community/.test(text)) keywords.push("avatars", "social");
  if (/money|finance|bank|budget/.test(text)) keywords.push("coins", "proof");
  if (/fitness|workout|run|sport/.test(text)) keywords.push("rings", "trophy", "energy");
  return Array.from(new Set([...keywords, ...fallback])).slice(0, 5);
}

function categoryBrandDefaults(category: string): Omit<BrandKit, "source"> {
  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory === "utility") {
    return {
      palette: { background: "#EEF4FF", surface: "#FFFFFF", text: "#0F172A", primary: "#172554", accent: "#2563EB", secondary: "#C7D2FE" },
      typography: { displayFamily: "Inter", uiFamily: "Inter", weight: 790, mood: "modern-saas" },
      imagery: { style: "3d", keywords: ["cubes", "cards", "automation"] },
      tone: ["crisp", "practical", "premium"],
    };
  }
  if (normalizedCategory === "fitness") {
    return {
      palette: { background: "#101820", surface: "#181F2A", text: "#F8FAFC", primary: "#F8FAFC", accent: "#22C55E", secondary: "#84CC16" },
      typography: { displayFamily: "Inter", uiFamily: "Inter", weight: 860, mood: "bold-sport" },
      imagery: { style: "3d", keywords: ["rings", "trophy", "energy"] },
      tone: ["bold", "energetic", "premium"],
    };
  }
  if (normalizedCategory === "finance") {
    return {
      palette: { background: "#F4F8F6", surface: "#FFFFFF", text: "#0B1F18", primary: "#064E3B", accent: "#10B981", secondary: "#CDEFE3" },
      typography: { displayFamily: "Inter", uiFamily: "Inter", weight: 760, mood: "modern-saas" },
      imagery: { style: "3d", keywords: ["cards", "coins", "proof"] },
      tone: ["trust", "secure", "premium"],
    };
  }
  return {
    palette: { background: "#F7F1E7", surface: "#FFFAF2", text: "#24160F", primary: "#3B2416", accent: "#D99A32", secondary: "#E8D7BD" },
    typography: { displayFamily: "Inter", uiFamily: "Inter", weight: 780, mood: "serif-editorial" },
    imagery: { style: "3d", keywords: ["maps", "routes", "places"] },
    tone: ["warm", "editorial", "premium"],
  };
}
