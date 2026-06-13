import { SceneSetSchema, type BrandKit, type PremiumRecipe, type ProductUnderstanding, type SceneObject, type SceneSet } from "@app-screenshot-ai/schemas";

import { BuildPremiumSceneSetUseCase } from "./build-premium-scene-set";

export type PremiumCandidateVariant = "balanced" | "object-rich" | "split-heavy" | "dark-premium" | "director-cut";

export type PremiumSceneSetCandidate = {
  variant: PremiumCandidateVariant;
  sceneSet: SceneSet;
};

export type BuildPremiumCandidateSceneSetsInput = {
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
  recipe: PremiumRecipe;
};

export class BuildPremiumCandidateSceneSetsUseCase {
  execute(input: BuildPremiumCandidateSceneSetsInput): PremiumSceneSetCandidate[] {
    const base = new BuildPremiumSceneSetUseCase().execute(input);
    return [
      { variant: "balanced", sceneSet: withVariantId(base, "balanced") },
      { variant: "object-rich", sceneSet: makeObjectRich(base) },
      { variant: "split-heavy", sceneSet: makeSplitHeavy(base) },
      { variant: "dark-premium", sceneSet: makeDarkPremium(base) },
      { variant: "director-cut", sceneSet: makeDirectorCut(base) },
    ];
  }
}

function withVariantId(sceneSet: SceneSet, variant: PremiumCandidateVariant): SceneSet {
  return SceneSetSchema.parse({ ...sceneSet, id: `${sceneSet.id}-${variant}` });
}

function makeObjectRich(sceneSet: SceneSet): SceneSet {
  return SceneSetSchema.parse({
    ...sceneSet,
    id: `${sceneSet.id}-object-rich`,
    continuity: {
      ...sceneSet.continuity,
      recurringObjects: Array.from(new Set([...sceneSet.continuity.recurringObjects, "depth-cubes", "floating-cards"])),
    },
    scenes: sceneSet.scenes.map((scene, index) => ({
      ...scene,
      background: { ...scene.background, kind: index % 2 === 0 ? "mesh" : scene.background.kind, intensity: Math.min(1, scene.background.intensity + 0.08) },
      devices: scene.devices.map((device, deviceIndex) => ({
        ...device,
        tilt: device.tilt + (deviceIndex % 2 === 0 ? -3 : 3),
        depth: device.depth + 1,
      })),
      objects: [
        ...scene.objects,
        decorativeObject(sceneSet, index, 0),
        ...(index % 2 === 0 ? [decorativeObject(sceneSet, index, 1)] : []),
      ],
    })),
  });
}

function makeSplitHeavy(sceneSet: SceneSet): SceneSet {
  return SceneSetSchema.parse({
    ...sceneSet,
    id: `${sceneSet.id}-split-heavy`,
    scenes: sceneSet.scenes.map((scene, index) => {
      if (index === 0 || index === sceneSet.scenes.length - 1) return scene;
      const primary = scene.devices[0];
      const fallback = sceneSet.scenes.flatMap((candidate) => candidate.devices).find((device) => device.screenshotId !== primary?.screenshotId) ?? primary;
      if (!primary || !fallback) return scene;
      return {
        ...scene,
        composition: "split-devices",
        devices: [
          { ...primary, x: 0.34, y: 0.54, scale: Math.max(0.58, primary.scale * 0.9), tilt: -10, crop: "full", depth: 3 },
          { ...fallback, x: 0.64, y: 0.56, scale: Math.max(0.52, fallback.scale * 0.82), tilt: 9, crop: "edge-right", depth: 4 },
        ],
        callouts: scene.callouts.length > 0 ? scene.callouts : [{ label: "Compare flows", x: 0.62, y: 0.66, anchorDevice: 1 }],
        objects: [...scene.objects, decorativeObject(sceneSet, index, 0)],
      };
    }),
  });
}

function makeDarkPremium(sceneSet: SceneSet): SceneSet {
  return SceneSetSchema.parse({
    ...sceneSet,
    id: `${sceneSet.id}-dark-premium`,
    brandKit: {
      ...sceneSet.brandKit,
      palette: {
        ...sceneSet.brandKit.palette,
        background: "#080A12",
        surface: "#111827",
        text: "#F8FAFC",
        primary: sceneSet.brandKit.palette.primary,
        accent: sceneSet.brandKit.palette.accent,
      },
      tone: Array.from(new Set([...sceneSet.brandKit.tone, "cinematic", "dark-premium"])),
    },
    continuity: { ...sceneSet.continuity, sharedBackground: "gradient", deviceTreatment: "progressive" },
    scenes: sceneSet.scenes.map((scene, index) => ({
      ...scene,
      background: { kind: "dark-stage", paletteRole: "background", intensity: 1 },
      objects: [...scene.objects, decorativeObject(sceneSet, index, 0)],
    })),
  });
}

function makeDirectorCut(sceneSet: SceneSet): SceneSet {
  return SceneSetSchema.parse({
    ...sceneSet,
    id: `${sceneSet.id}-director-cut`,
    continuity: {
      ...sceneSet.continuity,
      sharedBackground: "panorama",
      recurringObjects: Array.from(new Set([...sceneSet.continuity.recurringObjects, "depth-cards", "premium-route"])),
      deviceTreatment: "progressive",
    },
    scenes: sceneSet.scenes.map((scene, index) => {
      const compositions: SceneSet["scenes"][number]["composition"][] = ["hero-poster", "panoramic-sequence", "split-devices", "cropped-edge-device", "object-led"];
      const backgroundKinds: SceneSet["scenes"][number]["background"]["kind"][] = ["panorama", "mesh", "gradient", "panorama", "dark-stage"];
      const baseDevices = scene.devices.map((device, deviceIndex) => ({
        ...device,
        x: index === 4 ? (deviceIndex === 0 ? 0.55 : 0.66) : device.x,
        y: index === 0 ? 0.52 : index === 3 ? 0.46 : device.y,
        scale: index === 4 ? device.scale * 0.9 : device.scale,
        tilt: device.tilt + (index % 2 === 0 ? -4 : 4),
        depth: device.depth + 1,
      }));
      const splitFallback = sceneSet.scenes.flatMap((candidate) => candidate.devices).find((device) => device.screenshotId !== baseDevices[0]?.screenshotId) ?? baseDevices[0];
      const devices = index === 2 && baseDevices[0] && splitFallback
        ? [
            { ...baseDevices[0], x: 0.32, y: 0.54, scale: 0.66, tilt: -12, crop: "full", depth: 3 },
            { ...splitFallback, x: 0.64, y: 0.56, scale: 0.54, tilt: 10, crop: "edge-right", depth: 5 },
          ]
        : baseDevices;

      return {
        ...scene,
        composition: compositions[index] ?? scene.composition,
        background: { kind: backgroundKinds[index] ?? scene.background.kind, paletteRole: scene.background.paletteRole, intensity: 1 },
        devices,
        callouts: index === 2 ? [{ label: "Compare flows", x: 0.64, y: 0.58, anchorDevice: 1 }] : scene.callouts,
        objects: [
          ...scene.objects,
          decorativeObject(sceneSet, index, 0),
          decorativeObject(sceneSet, index, 1),
          ...(index === 4 ? [decorativeObject(sceneSet, index, 2)] : []),
        ],
      };
    }),
  });
}

function decorativeObject(sceneSet: SceneSet, sceneIndex: number, objectIndex: number): SceneObject {
  const kind = sceneSet.brandKit.imagery.keywords.includes("coins")
    ? "coin"
    : sceneSet.brandKit.imagery.keywords.includes("trophy")
      ? "trophy"
      : sceneSet.brandKit.imagery.keywords.includes("books")
        ? "book"
        : objectIndex === 0 ? "3d-cube" : "card";
  return {
    assetId: `${sceneSet.recipeId}/decor-${sceneIndex + 1}-${objectIndex + 1}`,
    kind,
    x: objectIndex === 0 ? 0.82 : 0.18,
    y: objectIndex === 0 ? 0.18 + (sceneIndex % 2) * 0.12 : 0.72,
    scale: objectIndex === 0 ? 0.72 : 0.52,
    rotation: objectIndex === 0 ? -14 + sceneIndex * 3 : 12,
    depth: 5 + objectIndex,
  };
}
