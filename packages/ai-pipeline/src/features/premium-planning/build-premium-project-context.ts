import { BrandKitSchema, ProductUnderstandingSchema, type AppInput, type BrandKit, type ProductUnderstanding } from "@app-screenshot-ai/schemas";

export type BuildPremiumProjectContextInput = {
  input: AppInput;
};

export type PremiumProjectContext = {
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
};

export class BuildPremiumProjectContextUseCase {
  async execute(params: BuildPremiumProjectContextInput): Promise<PremiumProjectContext> {
    const brandKit = buildBrandKit(params.input);
    const productUnderstanding = ProductUnderstandingSchema.parse({
      appName: params.input.appName,
      category: params.input.category,
      valueProposition: params.input.mainValueProposition,
      audience: params.input.targetAudience,
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
}

function buildBrandKit(input: AppInput): BrandKit {
  const manualColors = input.brand?.colors?.filter(Boolean) ?? [];
  const defaults = categoryBrandDefaults(input.category);
  const palette = manualColors.length > 0
    ? {
        background: manualColors[0] ?? defaults.palette.background,
        primary: manualColors[1] ?? defaults.palette.primary,
        accent: manualColors[2] ?? defaults.palette.accent,
        surface: defaults.palette.surface,
        text: defaults.palette.text,
        ...(manualColors[3] ? { secondary: manualColors[3] } : {}),
      }
    : defaults.palette;

  return BrandKitSchema.parse({
    source: manualColors.length > 0 ? "manual" : "category-default",
    palette,
    typography: defaults.typography,
    imagery: defaults.imagery,
    tone: defaults.tone,
  });
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
    imagery: { style: "3d", keywords: ["books", "maps", "routes"] },
    tone: ["warm", "editorial", "premium"],
  };
}
