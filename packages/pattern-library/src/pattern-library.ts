import type { DesignPattern, PremiumRecipe } from "@app-screenshot-ai/schemas";

export type PatternRetrievalQuery = {
  category: string;
  tone: string[];
  limit?: number;
};

export type PremiumRecipeRetrievalQuery = {
  category: string;
  tone: string[];
  limit?: number;
};

export function createDefaultPremiumRecipeLibrary(): PremiumRecipeLibrary {
  return new PremiumRecipeLibrary([
    premiumRecipe({
      id: "travel-editorial-panorama",
      category: "travel",
      name: "Editorial route panorama",
      qualityTarget: "top-1-percent",
      tone: ["warm", "editorial", "premium"],
      scenes: ["hero-poster", "panoramic-sequence", "split-devices", "cropped-edge-device", "object-led"],
      assets: [["3d-object"], ["gradient", "3d-object"], ["3d-object"], ["gradient"], ["3d-object"]],
    }),
    premiumRecipe({
      id: "utility-blue-depth",
      category: "utility",
      name: "Blue utility depth",
      qualityTarget: "top-1-percent",
      tone: ["crisp", "practical", "premium"],
      scenes: ["hero-poster", "split-devices", "proof-poster", "cropped-edge-device", "object-led"],
      assets: [["3d-object"], ["3d-object"], ["badge"], ["3d-object"], ["3d-object"]],
    }),
    premiumRecipe({
      id: "finance-trust-proof",
      category: "finance",
      name: "Trust proof system",
      qualityTarget: "premium",
      tone: ["trust", "secure", "premium"],
      scenes: ["hero-poster", "proof-poster", "split-devices", "cropped-edge-device", "object-led"],
      assets: [["badge"], ["badge", "3d-object"], ["3d-object"], ["badge"], ["3d-object"]],
    }),
    premiumRecipe({
      id: "fitness-neon-energy",
      category: "fitness",
      name: "Neon energy system",
      qualityTarget: "premium",
      tone: ["bold", "energetic", "premium"],
      scenes: ["hero-poster", "object-led", "split-devices", "proof-poster", "cropped-edge-device"],
      assets: [["3d-object"], ["3d-object"], ["3d-object"], ["badge"], ["3d-object"]],
    }),
    premiumRecipe({
      id: "education-bright-cards",
      category: "education",
      name: "Bright learning cards",
      qualityTarget: "premium",
      tone: ["friendly", "clear", "bright"],
      scenes: ["hero-poster", "split-devices", "proof-poster", "before-after", "object-led"],
      assets: [["3d-object"], ["3d-object"], ["badge"], ["gradient"], ["3d-object"]],
    }),
    premiumRecipe({
      id: "social-avatar-gradient",
      category: "social",
      name: "Avatar gradient story",
      qualityTarget: "premium",
      tone: ["social", "lively", "premium"],
      scenes: ["hero-poster", "split-devices", "object-led", "proof-poster", "cropped-edge-device"],
      assets: [["avatar"], ["avatar", "3d-object"], ["avatar"], ["badge"], ["gradient"]],
    }),
  ]);
}

function premiumRecipe(params: {
  id: string;
  category: string;
  name: string;
  qualityTarget: PremiumRecipe["qualityTarget"];
  tone: string[];
  scenes: [PremiumRecipe["scenes"][number]["composition"], PremiumRecipe["scenes"][number]["composition"], PremiumRecipe["scenes"][number]["composition"], PremiumRecipe["scenes"][number]["composition"], PremiumRecipe["scenes"][number]["composition"]];
  assets: Array<PremiumRecipe["scenes"][number]["requiredAssets"]>;
}): PremiumRecipe {
  return {
    id: params.id,
    category: params.category,
    name: params.name,
    qualityTarget: params.qualityTarget,
    tone: params.tone,
    setRhythm: ["hook", "feature", "proof", "comparison", "cta"],
    scenes: params.scenes.map((composition, index) => ({
      composition,
      requiredAssets: params.assets[index] ?? ["none"],
      deviceSlots: composition === "split-devices" || composition === "before-after" ? 2 : 1,
      copyStyle: composition === "proof-poster" ? "proof-heavy" : index === 0 ? "big-loud" : "minimal-premium",
    })),
  };
}

export class PremiumRecipeLibrary {
  private readonly recipes: PremiumRecipe[];

  constructor(recipes: readonly PremiumRecipe[]) {
    this.recipes = [...recipes];
  }

  retrieve(query: PremiumRecipeRetrievalQuery): PremiumRecipe[] {
    const normalizedCategory = canonicalCategory(query.category);
    const requestedTone = new Set(query.tone.map((tone) => tone.toLowerCase()));
    const limit = query.limit ?? 5;

    return this.recipes
      .filter((recipe) => canonicalCategory(recipe.category) === normalizedCategory)
      .map((recipe) => ({ recipe, score: scorePremiumRecipe(recipe, requestedTone) }))
      .sort((a, b) => b.score - a.score || a.recipe.id.localeCompare(b.recipe.id))
      .slice(0, limit)
      .map(({ recipe }) => recipe);
  }
}

export class PatternLibrary {
  private readonly patterns: DesignPattern[];

  constructor(patterns: readonly DesignPattern[]) {
    this.patterns = [...patterns];
  }

  retrieve(query: PatternRetrievalQuery): DesignPattern[] {
    const normalizedCategory = canonicalCategory(query.category);
    const requestedTone = new Set(query.tone.map((tone) => tone.toLowerCase()));
    const limit = query.limit ?? 5;

    return this.patterns
      .filter((pattern) => canonicalCategory(pattern.category) === normalizedCategory)
      .map((pattern) => ({ pattern, score: scorePattern(pattern, requestedTone) }))
      .sort((a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id))
      .slice(0, limit)
      .map(({ pattern }) => pattern);
  }
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

function scorePremiumRecipe(recipe: PremiumRecipe, requestedTone: Set<string>): number {
  const compositionDiversity = new Set(recipe.scenes.map((scene) => scene.composition)).size;
  const assetDepth = new Set(recipe.scenes.flatMap((scene) => scene.requiredAssets).filter((asset) => asset !== "none")).size;
  const toneScore = recipe.tone.reduce((score, tone) => requestedTone.has(tone.toLowerCase()) ? score + 2 : score, 0);
  const targetBonus = recipe.qualityTarget === "top-1-percent" ? 2 : 0;
  return toneScore + compositionDiversity + assetDepth + targetBonus;
}

function scorePattern(pattern: DesignPattern, requestedTone: Set<string>): number {
  if (requestedTone.size === 0) return 0;

  return pattern.tone.reduce((score, tone) => {
    return requestedTone.has(tone.toLowerCase()) ? score + 1 : score;
  }, 0);
}
