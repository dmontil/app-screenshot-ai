import { SceneSetSchema, type BrandKit, type PremiumRecipe, type ProductUnderstanding, type SceneSet } from "@app-screenshot-ai/schemas";

import { BuildBackgroundPlatesUseCase } from "./build-background-plates";

export type BuildPremiumSceneSetInput = {
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
  recipe: PremiumRecipe;
  outputScreenCount?: number;
  includeCoverScreen?: boolean;
};

export class BuildPremiumSceneSetUseCase {
  execute(input: BuildPremiumSceneSetInput): SceneSet {
    const backgroundPlates = new BuildBackgroundPlatesUseCase().execute(input);
    const outputScreenCount = input.outputScreenCount ?? input.productUnderstanding.screenInventory.length;
    const scenes = Array.from({ length: outputScreenCount }, (_, index) => {
      const recipeScene = input.recipe.scenes[index % input.recipe.scenes.length]!;
      const plate = backgroundPlates[index % backgroundPlates.length];
      const role = roleForIndex(index, Boolean(input.includeCoverScreen));
      const deviceSlots = input.includeCoverScreen && index === 0 ? 0 : recipeScene.deviceSlots;
      const selectedScreens = selectScreens(input.productUnderstanding, role, deviceSlots, index, Boolean(input.includeCoverScreen));
      return {
        id: `${role}-${index + 1}`,
        index: index + 1,
        role,
        composition: recipeScene.composition,
        copy: {
          headline: headlineFor(input.productUnderstanding, role),
          subheadline: subheadlineFor(input.productUnderstanding, role),
          ...(recipeScene.copyStyle === "proof-heavy" ? { badge: proofBadgeFor(input.productUnderstanding.category) } : {}),
        },
        background: {
          kind: backgroundFor(input.recipe.id, recipeScene.composition),
          paletteRole: index % 2 === 0 ? "background" : "surface",
          intensity: input.recipe.qualityTarget === "top-1-percent" ? 0.92 : 0.78,
          ...(plate ? { plateId: plate.id } : {}),
        },
        devices: selectedScreens.map((screen, deviceIndex) => ({
          screenshotId: screen.screenshotId,
          ...deviceLayoutFor(recipeScene.composition, deviceIndex),
          depth: deviceIndex + 2,
        })),
        objects: recipeScene.requiredAssets
          .filter((asset) => asset !== "none")
          .map((asset, objectIndex) => ({
            assetId: assetIdFor(input.productUnderstanding.category, asset, objectIndex),
            kind: objectKindFor(input.productUnderstanding.category, asset),
            x: objectIndex === 0 ? 0.78 : 0.18,
            y: objectIndex === 0 ? 0.18 : 0.76,
            scale: objectIndex === 0 ? 0.82 : 0.62,
            rotation: objectIndex === 0 ? -12 : 10,
            depth: objectIndex + 4,
          })),
        callouts: recipeScene.composition === "split-devices"
          ? [{ label: "Compare flows", x: 0.62, y: 0.55, anchorDevice: 1 }]
          : [],
      };
    });

    return SceneSetSchema.parse({
      id: `${slug(input.productUnderstanding.appName)}-${input.recipe.id}`,
      brandKit: input.brandKit,
      recipeId: input.recipe.id,
      continuity: {
        sharedBackground: input.recipe.id.includes("panorama") ? "panorama" : "gradient",
        recurringObjects: input.brandKit.imagery.keywords.slice(0, 3),
        deviceTreatment: "progressive",
      },
      backgroundPlates,
      scenes,
    });
  }
}

function roleForIndex(index: number, includeCoverScreen: boolean): SceneSet["scenes"][number]["role"] {
  if (includeCoverScreen && index === 0) return "hook";
  const roles: Array<SceneSet["scenes"][number]["role"]> = ["feature", "proof", "comparison", "cta"];
  return roles[(includeCoverScreen ? index - 1 : index) % roles.length] ?? "feature";
}

function selectScreens(product: ProductUnderstanding, role: SceneSet["scenes"][number]["role"], count: number, sceneIndex: number, includeCoverScreen: boolean): ProductUnderstanding["screenInventory"] {
  const fallback = product.screenInventory;
  const fallbackScreen = fallback[0];
  if (!fallbackScreen) throw new Error("Cannot build a premium scene set without source screenshots.");

  const primaryIndex = includeCoverScreen ? Math.max(0, sceneIndex - 1) : sceneIndex;
  const primary = fallback[primaryIndex % fallback.length] ?? fallbackScreen;
  if (count === 1) return [primary];
  return Array.from({ length: count }, (_, index) => fallback[(primaryIndex + index) % fallback.length] ?? fallbackScreen);
}

function headlineFor(product: ProductUnderstanding, role: SceneSet["scenes"][number]["role"]): string {
  const category = product.category.toLowerCase();
  if (role === "hook") return titleCase(product.valueProposition);
  if (category === "travel") {
    if (role === "proof") return "Trusted Routes";
    if (role === "comparison") return "Compare Every Stop";
    if (role === "cta") return travelCtaFor(product);
    return travelFeatureFor(product);
  }
  if (category === "finance") {
    if (role === "proof") return "Security users can see";
    if (role === "comparison") return "Compare money moves instantly";
    if (role === "cta") return "Move forward with confidence";
    return "Make every decision clearer";
  }
  if (category === "fitness") {
    if (role === "proof") return "Progress you can prove";
    if (role === "comparison") return "Compare every training phase";
    if (role === "cta") return "Start stronger today";
    return "Turn effort into momentum";
  }
  if (role === "proof") return "Proof users can trust";
  if (role === "comparison") return "See the difference instantly";
  if (role === "cta") return "Start with confidence";
  return "Show the core workflow";
}

function deviceLayoutFor(composition: SceneSet["scenes"][number]["composition"], deviceIndex: number): Omit<SceneSet["scenes"][number]["devices"][number], "screenshotId" | "depth"> {
  if (composition === "split-devices" || composition === "before-after") {
    return deviceIndex === 0
      ? { x: 0.36, y: 0.61, scale: 0.58, tilt: -7, crop: "full" }
      : { x: 0.68, y: 0.60, scale: 0.50, tilt: 7, crop: "edge-right" };
  }
  if (composition === "cropped-edge-device") return { x: 0.70, y: 0.60, scale: 0.64, tilt: 0, crop: "edge-right" };
  if (composition === "proof-poster") return { x: 0.58, y: 0.64, scale: 0.56, tilt: 4, crop: "full" };
  if (composition === "object-led") return { x: 0.52, y: 0.61, scale: 0.64, tilt: -6, crop: "full" };
  return { x: 0.54, y: 0.60, scale: 0.68, tilt: -5, crop: "full" };
}

function subheadlineFor(product: ProductUnderstanding, role: SceneSet["scenes"][number]["role"]): string {
  const category = product.category.toLowerCase();
  if (role === "hook") return `Built for ${product.audience}.`;
  if (category === "travel") {
    if (role === "proof") return "Turn destinations, routes, and stops into one clear journey.";
    if (role === "comparison") return "Show discovery and navigation in one premium frame.";
    if (role === "cta") return "End with a concrete next trip, not a generic CTA.";
    return "Make the route, map, and key stops legible at a glance.";
  }
  if (category === "finance") {
    if (role === "proof") return "Use visual trust signals before asking users to act.";
    if (role === "comparison") return "Show before-and-after clarity without crowding the screen.";
    if (role === "cta") return "Close with confidence, control, and next-step clarity.";
    return "Explain the core money workflow in one clean composition.";
  }
  if (category === "fitness") {
    if (role === "proof") return "Make consistency, streaks, and progress feel tangible.";
    if (role === "comparison") return "Contrast plan, workout, and progress without losing energy.";
    if (role === "cta") return "Close the set with action and momentum.";
    return "Make the highest-energy workflow impossible to miss.";
  }
  if (role === "proof") return "Turn product credibility into a visual asset.";
  if (role === "comparison") return "Show two app moments in one premium frame.";
  if (role === "cta") return "End the set with one clear next step.";
  return "Make the most important feature easy to understand.";
}

function travelFeatureFor(product: ProductUnderstanding): string {
  const text = `${product.appName} ${product.valueProposition} ${product.audience}`.toLowerCase();
  if (/camper|van|rv|caravan|autocaravana|furgo|furgoneta/.test(text)) return "Map Every Camper Stop";
  if (/city|ciudad|place|lugar/.test(text)) return "Map Every Place";
  return "Map Every Stop";
}

function travelCtaFor(product: ProductUnderstanding): string {
  const text = `${product.appName} ${product.valueProposition} ${product.audience}`.toLowerCase();
  if (/camper|van|rv|caravan|autocaravana|furgo|furgoneta/.test(text)) return "Start Your Next Road Trip";
  return "Start Your Next Trip";
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function proofBadgeFor(category: string): string {
  if (category.toLowerCase() === "finance") return "Secure by design";
  if (category.toLowerCase() === "fitness") return "Progress ready";
  return "Store ready";
}

function backgroundFor(recipeId: string, composition: string): SceneSet["scenes"][number]["background"]["kind"] {
  if (recipeId.includes("panorama")) return "panorama";
  if (composition === "proof-poster") return "mesh";
  if (composition === "object-led") return "gradient";
  return "gradient";
}

function objectKindFor(category: string, asset: string): SceneSet["scenes"][number]["objects"][number]["kind"] {
  if (asset === "badge") return "badge";
  if (category.toLowerCase() === "finance") return "coin";
  if (category.toLowerCase() === "fitness") return "trophy";
  if (category.toLowerCase() === "travel") return "map-pin";
  return "3d-cube";
}

function assetIdFor(category: string, asset: string, index: number): string {
  if (category.toLowerCase() === "utility" && asset === "3d-object") return "utility/cubes-primary";
  return `${category.toLowerCase()}/${asset}-${index + 1}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}
