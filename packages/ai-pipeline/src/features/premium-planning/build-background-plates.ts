import type { BackgroundPlateSpec, BrandKit, ProductUnderstanding } from "@app-screenshot-ai/schemas";

export type BuildBackgroundPlatesInput = {
  brandKit: BrandKit;
  productUnderstanding: ProductUnderstanding;
};

export class BuildBackgroundPlatesUseCase {
  execute(input: BuildBackgroundPlatesInput): BackgroundPlateSpec[] {
    const category = input.productUnderstanding.category.toLowerCase();
    if (category === "travel") return travelPlates(input.brandKit);
    if (category === "finance") return financePlates(input.brandKit);
    if (category === "fitness") return fitnessPlates(input.brandKit);
    return utilityPlates(input.brandKit);
  }
}

function travelPlates(brandKit: BrandKit): BackgroundPlateSpec[] {
  return [
    plate({
      id: "travel-paper-map-a",
      style: "literary-map-sketch",
      texture: "aged-paper",
      motifs: ["map-lines", "open-book", "city-sketch"],
      palette: { base: "#F0DFC4", ink: "#9B8972", accent: brandKit.palette.accent },
      safeZone: { x: 0.06, y: 0.2, width: 0.62, height: 0.74 },
    }),
    plate({
      id: "travel-paper-map-b",
      style: "literary-map-sketch",
      texture: "aged-paper",
      motifs: ["map-lines", "route-dashes", "book-margin-notes"],
      palette: { base: "#F6E8CF", ink: "#B0A18B", accent: brandKit.palette.accent },
      safeZone: { x: 0.08, y: 0.18, width: 0.58, height: 0.76 },
    }),
    plate({
      id: "travel-material-warm",
      style: "abstract-material",
      texture: "soft-noise",
      motifs: ["paper-folds", "soft-depth", "editorial-stage"],
      palette: { base: "#ECD8B8", ink: "#A68E70", accent: brandKit.palette.accent },
      safeZone: { x: 0.07, y: 0.22, width: 0.6, height: 0.72 },
    }),
  ];
}

function utilityPlates(brandKit: BrandKit): BackgroundPlateSpec[] {
  return [
    plate({
      id: "utility-blueprint-flow-a",
      style: "utility-flow-system",
      texture: "blueprint",
      motifs: ["flow-lines", "system-cards", "soft-grid"],
      palette: { base: "#EAF2FF", ink: "#7BA6E8", accent: "#2563EB" },
      safeZone: { x: 0.06, y: 0.2, width: 0.62, height: 0.74 },
    }),
    plate({
      id: "utility-blueprint-flow-b",
      style: "utility-flow-system",
      texture: "soft-noise",
      motifs: ["automation-nodes", "command-palette", "progress-lines"],
      palette: { base: "#EEF6FF", ink: "#8BB5F7", accent: brandKit.palette.accent || "#2563EB" },
      safeZone: { x: 0.08, y: 0.18, width: 0.58, height: 0.76 },
    }),
    plate({
      id: "utility-material-cool",
      style: "abstract-material",
      texture: "soft-noise",
      motifs: ["glass-panels", "grid-depth", "task-rhythm"],
      palette: { base: "#E3EEFF", ink: "#91AEE2", accent: "#3B82F6" },
      safeZone: { x: 0.07, y: 0.22, width: 0.6, height: 0.72 },
    }),
  ];
}

function financePlates(brandKit: BrandKit): BackgroundPlateSpec[] {
  return [
    plate({ id: "finance-ledger-a", style: "finance-ledger-engraving", texture: "ledger-paper", motifs: ["ledger-lines", "security-rings", "fine-engraving"], palette: { base: "#F2FBF7", ink: "#7BA291", accent: brandKit.palette.accent }, safeZone: { x: 0.06, y: 0.2, width: 0.62, height: 0.74 } }),
    plate({ id: "finance-ledger-b", style: "finance-ledger-engraving", texture: "soft-noise", motifs: ["vault-arc", "receipt-lines", "trust-seal"], palette: { base: "#ECF8F1", ink: "#729D88", accent: brandKit.palette.accent }, safeZone: { x: 0.08, y: 0.18, width: 0.58, height: 0.76 } }),
    plate({ id: "finance-material-green", style: "abstract-material", texture: "soft-noise", motifs: ["soft-ledger", "signal-lines"], palette: { base: "#EAF7EF", ink: "#7CA58E", accent: brandKit.palette.accent }, safeZone: { x: 0.07, y: 0.22, width: 0.6, height: 0.72 } }),
  ];
}

function fitnessPlates(brandKit: BrandKit): BackgroundPlateSpec[] {
  return [
    plate({ id: "fitness-kinetic-a", style: "fitness-kinetic", texture: "dark-grain", motifs: ["kinetic-lines", "energy-rings", "motion-trails"], palette: { base: "#111827", ink: "#4B5563", accent: brandKit.palette.accent }, safeZone: { x: 0.06, y: 0.2, width: 0.62, height: 0.74 } }),
    plate({ id: "fitness-kinetic-b", style: "fitness-kinetic", texture: "dark-grain", motifs: ["pulse-grid", "progress-rings", "velocity"], palette: { base: "#101820", ink: "#475569", accent: brandKit.palette.accent }, safeZone: { x: 0.08, y: 0.18, width: 0.58, height: 0.76 } }),
    plate({ id: "fitness-material-energy", style: "abstract-material", texture: "soft-noise", motifs: ["energy-wash", "sport-gradient"], palette: { base: "#15202B", ink: "#475569", accent: brandKit.palette.accent }, safeZone: { x: 0.07, y: 0.22, width: 0.6, height: 0.72 } }),
  ];
}

function plate(params: Omit<BackgroundPlateSpec, "contrast"> & { contrast?: BackgroundPlateSpec["contrast"] }): BackgroundPlateSpec {
  return { ...params, contrast: params.contrast ?? "low" };
}
