import sharp from "sharp";

import type { BackgroundPlateSpec, ProductUnderstanding, RenderedAsset, RenderTarget, Scene, SceneDevice, SceneObject, SceneSet } from "@app-screenshot-ai/schemas";

export type RenderSceneSetSource = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

export type RenderSceneSetInput = {
  sceneSet: SceneSet;
  productUnderstanding: ProductUnderstanding;
  target: RenderTarget;
  loadSourceScreenshot?: (path: string) => Promise<RenderSceneSetSource>;
  generatedStyleBackground?: RenderSceneSetSource;
  generatedStyleBackgrounds?: Record<string, RenderSceneSetSource>;
};

type LoadedDevice = {
  plan: SceneDevice;
  sourcePath: string;
  source?: RenderSceneSetSource;
};

type DeviceFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  tilt: number;
  depth: number;
};

export type SceneSetRenderDiagnostics = {
  artDirection: "travel" | "finance" | "fitness" | "utility";
  effectivePalette: SceneSet["brandKit"]["palette"];
  foregroundDecorativeObjects: number;
  framesByScene: Array<{
    sceneId: string;
    composition: Scene["composition"];
    frames: DeviceFrame[];
  }>;
};

export function getSceneSetRenderDiagnostics(input: Pick<RenderSceneSetInput, "sceneSet" | "target">): SceneSetRenderDiagnostics {
  return {
    artDirection: artDirectionFor(input.sceneSet),
    effectivePalette: effectivePaletteFor(input.sceneSet),
    foregroundDecorativeObjects: 0,
    framesByScene: input.sceneSet.scenes.map((scene) => ({
      sceneId: scene.id,
      composition: scene.composition,
      frames: scene.devices.map((device) => frameForDevice(input.target, scene.composition, device)),
    })),
  };
}

export class RenderSceneSetUseCase {
  async execute(input: RenderSceneSetInput): Promise<RenderedAsset[]> {
    const sourcePathByScreenshotId = new Map(
      input.productUnderstanding.screenInventory.map((screen) => [screen.screenshotId, screen.sourcePath]),
    );
    const fallbackPath = input.productUnderstanding.screenInventory[0]?.sourcePath ?? "input/screenshot.png";
    const assets: RenderedAsset[] = [];

    for (const scene of input.sceneSet.scenes) {
      const loadedDevices: LoadedDevice[] = [];
      for (const device of scene.devices) {
        const sourcePath = sourcePathByScreenshotId.get(device.screenshotId) ?? fallbackPath;
        loadedDevices.push({
          plan: device,
          sourcePath,
          ...(input.loadSourceScreenshot ? { source: await input.loadSourceScreenshot(sourcePath) } : {}),
        });
      }

      const svg = buildSceneSvg({ ...input, scene, loadedDevices });
      const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
      assets.push({
        id: `scene-${scene.index}`,
        screenIndex: scene.index,
        store: input.target.store,
        device: input.target.device,
        locale: input.target.locale,
        fileName: `${String(scene.index).padStart(2, "0")}-${slugify(scene.role)}.png`,
        contentType: "image/png",
        width: input.target.width,
        height: input.target.height,
        bytes: new Uint8Array(bytes),
      });
    }

    return assets;
  }
}

function buildSceneSvg(input: RenderSceneSetInput & { scene: Scene; loadedDevices: LoadedDevice[] }): string {
  const { target, scene, sceneSet } = input;
  const frames = input.loadedDevices.map((device) => frameForDevice(target, scene.composition, device.plan));
  const compositionClass = scene.composition.replaceAll("-", " ").toUpperCase();

  return svgShell(target, `
    <defs>${sceneDefs(input, frames)}</defs>
    ${renderBackground(input)}
    ${renderArtDirectionLayer(input)}
    ${renderContinuityMotif(input)}
    ${renderCompositionBackdrop(input)}
    ${renderSceneObjects(input, "behind")}
    ${renderProofPoster(input)}
    ${renderHeadline(input)}
    ${input.loadedDevices.map((device, index) => renderDevice(input, device, frames[index]!, index)).join("")}
    ${renderSceneObjects(input, "front")}
    ${renderCallouts(input, frames)}
    <text x="86" y="${target.height - 92}" font-family="Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="4" fill="${escapeXml(effectivePaletteFor(sceneSet).accent)}" opacity="0.62">${escapeXml(compositionClass)}</text>
  `);
}

function renderBackground(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, sceneSet, scene } = input;
  const palette = effectivePaletteFor(sceneSet);
  const artDirection = artDirectionFor(sceneSet);
  const categoryStage = categoryStagePalette(artDirection, palette);
  const bg = categoryStage.background;
  const surface = categoryStage.surface;
  const primary = categoryStage.primary;
  const accent = categoryStage.accent;
  const text = categoryStage.text;

  if (styleBackgroundFor(input)) {
    return renderGeneratedStyleBackground(input);
  }

  const plate = backgroundPlateFor(sceneSet, scene);
  if (plate) {
    return renderPlateBase(input, plate);
  }

  if (scene.background.kind === "dark-stage") {
    return `
      <rect width="100%" height="100%" fill="#070912" />
      <radialGradient id="darkGlow" cx="50%" cy="18%" r="85%"><stop offset="0%" stop-color="${escapeXml(accent)}" stop-opacity="0.42"/><stop offset="55%" stop-color="${escapeXml(primary)}" stop-opacity="0.25"/><stop offset="100%" stop-color="#070912"/></radialGradient>
      <rect width="100%" height="100%" fill="url(#darkGlow)" />
    `;
  }

  return `
    <linearGradient id="premiumBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${escapeXml(bg)}"/>
      <stop offset="48%" stop-color="${escapeXml(surface)}"/>
      <stop offset="100%" stop-color="${escapeXml(artDirection === "utility" ? "#DCEBFF" : tint(accent, 0.86))}"/>
    </linearGradient>
    <rect width="100%" height="100%" fill="url(#premiumBg)" />
    <radialGradient id="heroGlow" cx="72%" cy="18%" r="65%"><stop offset="0%" stop-color="${escapeXml(accent)}" stop-opacity="${0.34 * scene.background.intensity}"/><stop offset="100%" stop-color="${escapeXml(surface)}" stop-opacity="0"/></radialGradient>
    <rect width="100%" height="100%" fill="url(#heroGlow)" />
    <circle cx="${target.width * 0.16}" cy="${target.height * 0.76}" r="330" fill="${escapeXml(primary)}" opacity="${artDirection === "utility" ? 0.14 : 0.09}" />
    <circle cx="${target.width * 0.86}" cy="${target.height * 0.23}" r="240" fill="${escapeXml(artDirection === "utility" ? "#60A5FA" : accent)}" opacity="${artDirection === "utility" ? 0.22 : 0.18}" />
    <text x="${target.width - 80}" y="${target.height - 96}" text-anchor="end" font-family="Arial Black, Arial" font-size="154" font-weight="900" fill="${escapeXml(text)}" opacity="0.05">${String(scene.index).padStart(2, "0")}</text>
  `;
}

function renderGeneratedStyleBackground(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, sceneSet } = input;
  const generatedStyleBackground = styleBackgroundFor(input);
  if (!generatedStyleBackground) return "";
  const href = `data:${generatedStyleBackground.contentType};base64,${Buffer.from(generatedStyleBackground.bytes).toString("base64")}`;
  const palette = effectivePaletteFor(sceneSet);
  return `
    <image href="${href}" x="-${target.width * 0.04}" y="-${target.height * 0.04}" width="${target.width * 1.08}" height="${target.height * 1.08}" preserveAspectRatio="xMidYMid slice" filter="url(#aiBackgroundSanitize)" />
    <linearGradient id="aiBgLegibility" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="36%" stop-color="#FFFFFF" stop-opacity="0.06"/><stop offset="100%" stop-color="${escapeXml(palette.background)}" stop-opacity="0.16"/></linearGradient>
    <rect width="100%" height="100%" fill="url(#aiBgLegibility)" />
  `;
}

function styleBackgroundFor(input: RenderSceneSetInput & { scene: Scene }): RenderSceneSetSource | undefined {
  return input.generatedStyleBackgrounds?.[input.scene.id]
    ?? input.generatedStyleBackgrounds?.[String(input.scene.index)]
    ?? input.generatedStyleBackground;
}

function effectivePaletteFor(sceneSet: SceneSet): SceneSet["brandKit"]["palette"] {
  return categoryStagePalette(artDirectionFor(sceneSet), sceneSet.brandKit.palette);
}

function categoryStagePalette(artDirection: SceneSetRenderDiagnostics["artDirection"], palette: SceneSet["brandKit"]["palette"]): SceneSet["brandKit"]["palette"] {
  if (artDirection === "utility") return { ...palette, background: "#EAF2FF", surface: "#F8FBFF", text: "#0F172A", primary: "#1D4ED8", accent: "#2563EB", secondary: "#BFDBFE" };
  if (artDirection === "finance") return { ...palette, background: "#F2FBF7", surface: "#FFFFFF", text: "#082118", primary: palette.primary, accent: palette.accent };
  if (artDirection === "fitness") return { ...palette, background: "#111827", surface: "#1F2937", text: "#F8FAFC", primary: palette.primary, accent: palette.accent };
  return palette;
}

function renderArtDirectionLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  if (styleBackgroundFor(input)) return "";
  const plate = backgroundPlateFor(input.sceneSet, input.scene);
  if (plate) return renderBackgroundPlate(input, plate);
  const artDirection = artDirectionFor(input.sceneSet);
  if (artDirection === "travel") return renderTravelEditorialLayer(input);
  if (artDirection === "finance") return renderFinanceTrustLayer(input);
  if (artDirection === "fitness") return renderFitnessEnergyLayer(input);
  return renderUtilityDepthLayer(input);
}

function backgroundPlateFor(sceneSet: SceneSet, scene: Scene): BackgroundPlateSpec | undefined {
  return sceneSet.backgroundPlates?.find((plate) => plate.id === scene.background.plateId) ?? sceneSet.backgroundPlates?.[scene.index - 1] ?? sceneSet.backgroundPlates?.[0];
}

function renderPlateBase(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target, scene } = input;
  const base = scene.background.kind === "dark-stage" ? "#070912" : plate.palette.base;
  const paperNoise = plate.texture === "aged-paper" || plate.texture === "ledger-paper"
    ? `<filter id="paperNoise"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="${scene.index + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0.72 0 0 0 0 0.64 0 0 0 0 0.50 0 0 0 0.12 0"/></filter><rect width="100%" height="100%" filter="url(#paperNoise)" opacity="0.42"/>`
    : `<filter id="softNoise"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="${scene.index + 13}"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#softNoise)" opacity="0.08"/>`;
  return `
    <rect width="100%" height="100%" fill="${escapeXml(base)}" />
    <linearGradient id="plateWash" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0.38"/><stop offset="42%" stop-color="${escapeXml(plate.palette.base)}" stop-opacity="0.10"/><stop offset="100%" stop-color="${escapeXml(plate.palette.accent)}" stop-opacity="0.24"/></linearGradient>
    <rect width="100%" height="100%" fill="url(#plateWash)" />
    ${paperNoise}
    <rect x="${target.width * plate.safeZone.x}" y="${target.height * plate.safeZone.y}" width="${target.width * plate.safeZone.width}" height="${target.height * plate.safeZone.height}" rx="80" fill="#fff" opacity="0.015" />
  `;
}

function renderBackgroundPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  if (plate.style === "travel-map-sketch") return renderLiteraryMapPlate(input, plate);
  if (plate.style === "utility-flow-system") return renderUtilityFlowPlate(input, plate);
  if (plate.style === "finance-ledger-engraving") return renderFinanceLedgerPlate(input, plate);
  if (plate.style === "fitness-kinetic") return renderFitnessKineticPlate(input, plate);
  return renderAbstractMaterialPlate(input, plate);
}

function renderLiteraryMapPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target, scene } = input;
  const ink = plate.palette.ink;
  const accent = plate.palette.accent;
  const coast = `M ${target.width * 0.56} ${target.height * 0.05} C ${target.width * 0.74} ${target.height * 0.13}, ${target.width * 0.63} ${target.height * 0.26}, ${target.width * 0.83} ${target.height * 0.34} C ${target.width * 0.66} ${target.height * 0.44}, ${target.width * 0.87} ${target.height * 0.54}, ${target.width * 0.70} ${target.height * 0.66} C ${target.width * 0.88} ${target.height * 0.78}, ${target.width * 0.69} ${target.height * 0.88}, ${target.width * 0.91} ${target.height * 0.97}`;
  return `
    <g opacity="0.86">
      <g transform="translate(${target.width * 0.56}, ${target.height * 0.05}) scale(1.18)" opacity="0.46">
        <path d="M80 0 C190 40, 130 160, 270 220 C170 300, 310 390, 205 500 C320 610, 185 720, 330 850" fill="none" stroke="${escapeXml(ink)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M210 90 C270 126, 260 205, 336 240 M120 340 C218 318, 250 410, 350 380 M150 610 C230 560, 285 700, 390 650" fill="none" stroke="${escapeXml(ink)}" stroke-width="2.5" stroke-linecap="round" opacity="0.72" />
        <path d="M48 188 C102 152, 156 190, 170 250 C112 270, 72 238, 48 188 Z M220 455 C284 420, 334 470, 320 536 C250 544, 220 510, 220 455 Z" fill="none" stroke="${escapeXml(ink)}" stroke-width="2.5" opacity="0.58" />
      </g>
      <path d="${coast}" fill="none" stroke="${escapeXml(ink)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.32" />
      <path d="M ${target.width * 0.64} ${target.height * 0.19} C ${target.width * 0.78} ${target.height * 0.25}, ${target.width * 0.76} ${target.height * 0.42}, ${target.width * 0.92} ${target.height * 0.47}" fill="none" stroke="${escapeXml(ink)}" stroke-width="3" stroke-dasharray="8 16" opacity="0.34" />
      <path d="M ${target.width * 0.52} ${target.height * 0.60} C ${target.width * 0.68} ${target.height * 0.52}, ${target.width * 0.78} ${target.height * 0.73}, ${target.width * 0.96} ${target.height * 0.64}" fill="none" stroke="${escapeXml(accent)}" stroke-width="5" stroke-dasharray="18 18" opacity="0.32" />
      ${Array.from({ length: 11 }, (_, index) => `<circle cx="${target.width * (0.58 + ((index * 37) % 34) / 100)}" cy="${target.height * (0.12 + index * 0.074)}" r="${18 + (index % 3) * 7}" fill="none" stroke="${escapeXml(ink)}" stroke-width="1.5" opacity="0.12"/>`).join("")}
      <g transform="translate(${target.width * 0.82}, ${target.height * (0.25 + (scene.index % 2) * 0.08)}) rotate(-18)" opacity="0.50">
        <path d="M-104 -46 C-56 -88, -10 -74, 0 -28 C12 -78, 64 -86, 112 -42 L106 68 C58 34, 20 42, 0 84 C-20 42, -58 34, -106 68 Z" fill="none" stroke="${escapeXml(ink)}" stroke-width="6" stroke-linejoin="round"/>
        <path d="M0 -28 V84" stroke="${escapeXml(ink)}" stroke-width="3" />
        <path d="M-76 -20 C-48 -36, -22 -28, -8 -10 M28 -16 C56 -30, 80 -24, 96 -6" fill="none" stroke="${escapeXml(ink)}" stroke-width="2" opacity="0.55"/>
      </g>
      <g transform="translate(${target.width * 0.22}, ${target.height * 0.38})" opacity="0.28">
        <path d="M-120 60 L-60 8 L0 58 L70 -10 L150 70" fill="none" stroke="${escapeXml(ink)}" stroke-width="5"/>
        <path d="M-126 88 H154" stroke="${escapeXml(ink)}" stroke-width="3"/>
        <path d="M-86 64 V88 M-30 38 V88 M44 30 V88 M104 48 V88" stroke="${escapeXml(ink)}" stroke-width="3"/>
      </g>
      <text x="${target.width * 0.63}" y="${target.height * 0.18}" font-family="Georgia, serif" font-size="28" fill="${escapeXml(ink)}" opacity="0.42" font-style="italic">${escapeXml(input.productUnderstanding.appName)}</text>
      <text x="${target.width * 0.65}" y="${target.height * 0.63}" font-family="Georgia, serif" font-size="25" fill="${escapeXml(ink)}" opacity="0.30" font-style="italic">${escapeXml(input.productUnderstanding.category)}</text>
    </g>
  `;
}

function renderUtilityFlowPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target, scene } = input;
  const ink = plate.palette.ink;
  const accent = plate.palette.accent;
  return `
    <g opacity="0.82">
      ${Array.from({ length: 10 }, (_, index) => `<path d="M ${target.width * (0.52 + index * 0.045)} 0 V ${target.height}" stroke="${escapeXml(ink)}" stroke-width="2" opacity="0.06"/>`).join("")}
      ${Array.from({ length: 16 }, (_, index) => `<path d="M ${target.width * 0.48} ${target.height * (0.12 + index * 0.055)} H ${target.width}" stroke="${escapeXml(ink)}" stroke-width="2" opacity="0.045"/>`).join("")}
      <path d="M ${target.width * 0.55} ${target.height * 0.24} C ${target.width * 0.74} ${target.height * 0.16}, ${target.width * 0.75} ${target.height * 0.48}, ${target.width * 0.93} ${target.height * 0.38}" fill="none" stroke="${escapeXml(accent)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="22 24" opacity="0.22" />
      ${[0, 1, 2, 3].map((index) => `<g transform="translate(${target.width * (0.68 + (index % 2) * 0.16)}, ${target.height * (0.18 + index * 0.13)}) rotate(${-8 + index * 5})" filter="url(#softShadow)" opacity="${0.34 - index * 0.03}"><rect x="-110" y="-58" width="220" height="116" rx="28" fill="#fff"/><circle cx="-62" cy="0" r="15" fill="${escapeXml(accent)}"/><rect x="-32" y="-14" width="88" height="14" rx="7" fill="${escapeXml(ink)}"/><rect x="-32" y="14" width="124" height="12" rx="6" fill="${escapeXml(accent)}" opacity="0.42"/></g>`).join("")}
      <text x="${target.width * 0.62}" y="${target.height * 0.83}" font-family="Arial Black, Arial" font-size="132" fill="${escapeXml(accent)}" opacity="0.045">FLOW</text>
    </g>
  `;
}

function renderFinanceLedgerPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target } = input;
  const ink = plate.palette.ink;
  const accent = plate.palette.accent;
  return `<g opacity="0.74">${Array.from({ length: 18 }, (_, index) => `<path d="M ${target.width * 0.52} ${target.height * (0.1 + index * 0.045)} H ${target.width * 0.96}" stroke="${escapeXml(ink)}" stroke-width="2" opacity="0.10"/>`).join("")}<circle cx="${target.width * 0.78}" cy="${target.height * 0.28}" r="240" fill="none" stroke="${escapeXml(accent)}" stroke-width="12" opacity="0.14"/><circle cx="${target.width * 0.78}" cy="${target.height * 0.28}" r="154" fill="none" stroke="${escapeXml(ink)}" stroke-dasharray="20 18" opacity="0.18"/></g>`;
}

function renderFitnessKineticPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target } = input;
  const ink = plate.palette.ink;
  const accent = plate.palette.accent;
  return `<g opacity="0.78"><path d="M ${target.width * 0.52} ${target.height * 0.72} C ${target.width * 0.74} ${target.height * 0.30}, ${target.width * 0.78} ${target.height * 0.80}, ${target.width * 1.05} ${target.height * 0.28}" fill="none" stroke="${escapeXml(accent)}" stroke-width="30" stroke-linecap="round" opacity="0.16"/><path d="M ${target.width * 0.48} ${target.height * 0.62} C ${target.width * 0.70} ${target.height * 0.22}, ${target.width * 0.82} ${target.height * 0.68}, ${target.width * 1.04} ${target.height * 0.42}" fill="none" stroke="${escapeXml(ink)}" stroke-width="6" stroke-dasharray="18 20" opacity="0.28"/></g>`;
}

function renderAbstractMaterialPlate(input: RenderSceneSetInput & { scene: Scene }, plate: BackgroundPlateSpec): string {
  const { target, scene } = input;
  const dark = scene.background.kind === "dark-stage";
  const baseShadow = dark ? "#111827" : "#8A5A2B";
  return `
    <g>
      <radialGradient id="materialGlow-${scene.index}" cx="70%" cy="28%" r="78%"><stop offset="0%" stop-color="${escapeXml(plate.palette.accent)}" stop-opacity="${dark ? 0.30 : 0.28}"/><stop offset="44%" stop-color="#FFFFFF" stop-opacity="${dark ? 0.04 : 0.18}"/><stop offset="100%" stop-color="${escapeXml(plate.palette.base)}" stop-opacity="0"/></radialGradient>
      <rect width="100%" height="100%" fill="url(#materialGlow-${scene.index})" />
      <ellipse cx="${target.width * 0.76}" cy="${target.height * 0.33}" rx="${target.width * 0.48}" ry="${target.height * 0.22}" fill="#FFFFFF" opacity="${dark ? 0.08 : 0.24}" filter="url(#premiumBlur)" transform="rotate(-14 ${target.width * 0.76} ${target.height * 0.33})" />
      <ellipse cx="${target.width * 0.38}" cy="${target.height * 0.82}" rx="${target.width * 0.62}" ry="${target.height * 0.24}" fill="${escapeXml(plate.palette.accent)}" opacity="${dark ? 0.12 : 0.20}" filter="url(#premiumBlur)" transform="rotate(10 ${target.width * 0.38} ${target.height * 0.82})" />
      <rect x="${target.width * 0.50}" y="${target.height * 0.10}" width="${target.width * 0.66}" height="${target.height * 0.66}" rx="120" fill="#FFFFFF" opacity="${dark ? 0.07 : 0.22}" transform="rotate(8 ${target.width * 0.82} ${target.height * 0.46})" filter="url(#softShadow)" />
      <rect x="${target.width * 0.60}" y="${target.height * 0.22}" width="${target.width * 0.36}" height="${target.height * 0.30}" rx="74" fill="${escapeXml(baseShadow)}" opacity="${dark ? 0.10 : 0.08}" transform="rotate(-10 ${target.width * 0.78} ${target.height * 0.36})" />
    </g>
  `;
}

function artDirectionFor(sceneSet: SceneSet): SceneSetRenderDiagnostics["artDirection"] {
  const keywords = sceneSet.brandKit.imagery.keywords.map((keyword) => keyword.toLowerCase());
  if (keywords.some((keyword) => ["books", "maps", "routes"].includes(keyword))) return "travel";
  if (keywords.some((keyword) => ["coins", "proof"].includes(keyword))) return "finance";
  if (keywords.some((keyword) => ["rings", "trophy", "energy"].includes(keyword))) return "fitness";
  return "utility";
}

function renderTravelEditorialLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  const isDark = scene.background.kind === "dark-stage";
  const panelFill = isDark ? "#111827" : "#FFFFFF";
  const panelOpacity = isDark ? 0.20 : 0.34;
  const bookStack = scene.composition === "object-led" || scene.index % 2 === 1
    ? `<g transform="translate(${target.width * 0.78}, ${target.height * 0.70}) rotate(-8)" filter="url(#softShadow)" opacity="0.58">
        <rect x="-150" y="-66" width="300" height="132" rx="18" fill="${escapeXml(palette.primary)}" />
        <rect x="-128" y="-46" width="256" height="92" rx="14" fill="${escapeXml(palette.surface)}" opacity="0.90" />
        <rect x="-104" y="-126" width="260" height="126" rx="18" fill="${escapeXml(palette.accent)}" opacity="0.82" />
        <rect x="-84" y="-106" width="220" height="86" rx="14" fill="#fff" opacity="0.40" />
      </g>`
    : "";

  return `
    <g>
      <rect x="${target.width * 0.58}" y="${target.height * 0.16}" width="${target.width * 0.46}" height="${target.height * 0.55}" rx="92" fill="${panelFill}" opacity="${panelOpacity}" filter="url(#softShadow)" transform="rotate(7 ${target.width * 0.80} ${target.height * 0.44})" />
      <circle cx="${target.width * 0.18}" cy="${target.height * 0.72}" r="180" fill="${escapeXml(palette.accent)}" opacity="${isDark ? 0.10 : 0.08}" />
      ${scene.composition === "split-devices" || scene.composition === "cropped-edge-device" ? `<g opacity="0.34"><circle cx="${target.width * 0.78}" cy="${target.height * 0.55}" r="170" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="10"/><circle cx="${target.width * 0.78}" cy="${target.height * 0.55}" r="78" fill="${escapeXml(palette.accent)}" opacity="0.12"/></g>` : ""}
      ${bookStack}
    </g>
  `;
}

function renderFinanceTrustLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  const cards = Array.from({ length: 3 }, (_, index) => `
    <g transform="translate(${target.width * (0.58 + index * 0.06)}, ${target.height * (0.24 + index * 0.08)}) rotate(${-12 + index * 9})" filter="url(#softShadow)">
      <rect x="-146" y="-92" width="292" height="184" rx="34" fill="#fff" opacity="${0.55 - index * 0.08}" />
      <rect x="-104" y="-34" width="208" height="20" rx="10" fill="${escapeXml(palette.accent)}" opacity="0.42" />
      <rect x="-104" y="16" width="144" height="20" rx="10" fill="${escapeXml(palette.primary)}" opacity="0.22" />
    </g>`).join("");
  return `
    <g>
      <circle cx="${target.width * 0.74}" cy="${target.height * 0.24}" r="300" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="28" opacity="0.09" />
      <circle cx="${target.width * 0.74}" cy="${target.height * 0.24}" r="210" fill="none" stroke="${escapeXml(palette.primary)}" stroke-width="5" stroke-dasharray="24 26" opacity="0.18" />
      ${cards}
      <g transform="translate(${target.width * 0.18}, ${target.height * 0.74})" opacity="${scene.composition === "proof-poster" ? 0.95 : 0.56}">
        <rect x="-140" y="-72" width="280" height="144" rx="36" fill="${escapeXml(palette.primary)}" filter="url(#softShadow)" />
        <text x="0" y="-10" text-anchor="middle" font-family="Arial Black, Arial" font-size="42" fill="#fff">99%</text>
        <text x="0" y="34" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="#fff" opacity="0.76">SECURE FLOW</text>
      </g>
    </g>
  `;
}

function renderFitnessEnergyLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  return `
    <g>
      <path d="M -60 ${target.height * 0.55} C ${target.width * 0.30} ${target.height * 0.20}, ${target.width * 0.60} ${target.height * 0.82}, ${target.width + 80} ${target.height * 0.42}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="28" stroke-linecap="round" opacity="0.12" />
      <path d="M -60 ${target.height * 0.60} C ${target.width * 0.30} ${target.height * 0.25}, ${target.width * 0.60} ${target.height * 0.87}, ${target.width + 80} ${target.height * 0.47}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.28" />
      ${[0, 1, 2].map((index) => `<circle cx="${target.width * (0.68 + index * 0.055)}" cy="${target.height * (0.22 + index * 0.08)}" r="${150 - index * 28}" fill="none" stroke="${escapeXml(index % 2 ? palette.primary : palette.accent)}" stroke-width="${14 - index * 3}" opacity="${0.18 - index * 0.035}" />`).join("")}
      <g transform="translate(${target.width * 0.17}, ${target.height * 0.75})" filter="url(#softShadow)">
        <rect x="-122" y="-84" width="244" height="168" rx="42" fill="#fff" opacity="0.72" />
        ${[0, 1, 2, 3].map((index) => `<rect x="${-82 + index * 48}" y="${46 - index * 32}" width="28" height="${38 + index * 32}" rx="14" fill="${escapeXml(index % 2 ? palette.primary : palette.accent)}" opacity="0.76"/>`).join("")}
      </g>
    </g>
  `;
}

function renderUtilityDepthLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  return `
    <g>
      <path d="M ${target.width * 0.08} ${target.height * 0.39} L ${target.width * 0.88} ${target.height * 0.24} L ${target.width * 0.78} ${target.height * 0.82} L ${target.width * 0.02} ${target.height * 0.68} Z" fill="${escapeXml(palette.accent)}" opacity="0.08" />
      ${[0, 1, 2].map((index) => `<g transform="translate(${target.width * (0.64 + index * 0.06)}, ${target.height * (0.22 + index * 0.1)}) rotate(${-8 + index * 8})" filter="url(#softShadow)"><rect x="-112" y="-78" width="224" height="156" rx="36" fill="#fff" opacity="${0.55 - index * 0.1}"/><circle cx="-58" cy="-20" r="18" fill="${escapeXml(palette.accent)}" opacity="0.66"/><rect x="-28" y="-32" width="98" height="18" rx="9" fill="${escapeXml(palette.primary)}" opacity="0.22"/><rect x="-58" y="24" width="128" height="16" rx="8" fill="${escapeXml(palette.accent)}" opacity="0.22"/></g>`).join("")}
      ${scene.composition === "object-led" ? `<text x="${target.width * 0.52}" y="${target.height * 0.82}" font-family="Arial Black, Arial" font-size="136" fill="${escapeXml(palette.primary)}" opacity="0.055">FLOW</text>` : ""}
    </g>
  `;
}

function renderContinuityMotif(input: RenderSceneSetInput & { scene: Scene }): string {
  if (styleBackgroundFor(input)) return "";
  const { target, sceneSet, scene } = input;
  const palette = effectivePaletteFor(sceneSet);
  if (sceneSet.continuity.sharedBackground === "solid") return "";

  const setWidth = target.width * Math.max(5, sceneSet.scenes.length);
  const offsetX = -(scene.index - 1) * target.width;
  const warmBand = `M ${-target.width * 0.5} ${target.height * 0.74} C ${target.width * 0.7} ${target.height * 0.55}, ${target.width * 1.8} ${target.height * 0.88}, ${target.width * 3.0} ${target.height * 0.62} C ${target.width * 4.2} ${target.height * 0.38}, ${target.width * 4.9} ${target.height * 0.78}, ${target.width * 5.8} ${target.height * 0.52} L ${target.width * 5.8} ${target.height * 1.08} L ${-target.width * 0.5} ${target.height * 1.08} Z`;
  const softHills = `M ${-target.width * 0.4} ${target.height * 0.48} C ${target.width * 0.9} ${target.height * 0.28}, ${target.width * 1.7} ${target.height * 0.54}, ${target.width * 2.8} ${target.height * 0.34} C ${target.width * 3.8} ${target.height * 0.16}, ${target.width * 4.6} ${target.height * 0.42}, ${target.width * 5.6} ${target.height * 0.24} L ${target.width * 5.6} ${target.height * 0.70} L ${-target.width * 0.4} ${target.height * 0.70} Z`;
  const accentRibbon = `M ${-target.width * 0.3} ${target.height * 0.60} C ${target.width * 0.9} ${target.height * 0.40}, ${target.width * 1.8} ${target.height * 0.70}, ${target.width * 3.0} ${target.height * 0.48} C ${target.width * 4.1} ${target.height * 0.28}, ${target.width * 4.7} ${target.height * 0.60}, ${target.width * 5.6} ${target.height * 0.40}`;

  return `
    <g transform="translate(${offsetX} 0)">
      <linearGradient id="panoramaWash-${scene.index}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.44"/><stop offset="48%" stop-color="${escapeXml(palette.secondary ?? palette.accent)}" stop-opacity="0.16"/><stop offset="100%" stop-color="${escapeXml(palette.accent)}" stop-opacity="0.20"/></linearGradient>
      <rect x="${-target.width * 0.5}" y="0" width="${setWidth + target.width}" height="${target.height}" fill="url(#panoramaWash-${scene.index})" opacity="0.92" />
      <path d="${softHills}" fill="${escapeXml(palette.secondary ?? palette.accent)}" opacity="0.42" filter="url(#premiumBlur)" />
      <path d="${warmBand}" fill="${escapeXml(palette.accent)}" opacity="0.26" filter="url(#premiumBlur)" />
      <path d="${accentRibbon}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="26" stroke-linecap="round" opacity="0.28" filter="url(#premiumBlur)" />
      <path d="${accentRibbon}" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.38" />
      ${Array.from({ length: 11 }, (_, index) => {
        const x = target.width * (0.45 + index * 0.52);
        const y = target.height * (0.18 + (index % 4) * 0.13);
        return `<circle cx="${x}" cy="${y}" r="${130 + (index % 3) * 62}" fill="#fff" opacity="0.14" filter="url(#premiumBlur)" />`;
      }).join("")}
    </g>
    <text x="86" y="${target.height - 76}" font-family="Arial" font-size="22" font-weight="900" fill="${escapeXml(palette.accent)}" letter-spacing="5" opacity="0.42">${escapeXml(scene.role.toUpperCase())}</text>
  `;
}

function renderCompositionBackdrop(input: RenderSceneSetInput & { scene: Scene }): string {
  if (styleBackgroundFor(input)) return "";
  const { target, scene, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  if (scene.composition === "split-devices" || scene.composition === "before-after") {
    return `
      <path d="M ${target.width * 0.08} ${target.height * 0.34} L ${target.width * 0.92} ${target.height * 0.22} L ${target.width * 0.78} ${target.height * 0.86} L ${target.width * 0.02} ${target.height * 0.72} Z" fill="#fff" opacity="0.38" />
      <rect x="${target.width * 0.09}" y="${target.height * 0.66}" width="${target.width * 0.82}" height="190" rx="56" fill="#fff" opacity="0.42" filter="url(#softShadow)" />
    `;
  }
  if (scene.composition === "proof-poster") {
    return `
      <rect x="70" y="${target.height * 0.50}" width="${target.width - 140}" height="${target.height * 0.34}" rx="74" fill="#fff" opacity="0.62" filter="url(#softShadow)" />
      <circle cx="${target.width * 0.18}" cy="${target.height * 0.64}" r="128" fill="${escapeXml(palette.accent)}" opacity="0.22" />
    `;
  }
  if (scene.composition === "object-led") {
    return `<circle cx="${target.width * 0.5}" cy="${target.height * 0.56}" r="520" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="4" opacity="0.34" />`;
  }
  return "";
}

function renderHeadline(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  const isDark = scene.background.kind === "dark-stage";
  const fill = isDark ? "#FFFFFF" : palette.text;
  const x = scene.composition === "proof-poster" ? 96 : 86;
  const y = scene.composition === "proof-poster" ? 176 : 148;
  const words = scene.copy.headline.split(/\s+/).filter(Boolean);
  const action = words[0]?.toUpperCase() ?? scene.copy.headline.toUpperCase();
  const descriptor = words.slice(1).join(" ").toUpperCase();
  const actionSize = scene.composition === "proof-poster" ? 122 : 132;
  const descriptorSize = scene.composition === "proof-poster" ? 72 : 78;
  const descriptorLines = wrapWords(descriptor, scene.composition === "split-devices" ? 14 : 17).slice(0, 3);
  const descriptorY = y + actionSize - 10;
  const subY = descriptorY + descriptorLines.length * (descriptorSize + 2) + 34;

  const stroke = isDark ? "#07101F" : "#FFFFFF";
  const generatedBackground = Boolean(styleBackgroundFor(input));
  const scrimHeight = Math.min(target.height * 0.28, subY - y + 72);
  return `
    ${generatedBackground ? `<linearGradient id="headlineScrim-${scene.index}" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.78"/><stop offset="72%" stop-color="#FFFFFF" stop-opacity="0.36"/><stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient><rect x="42" y="42" width="${target.width * 0.86}" height="${scrimHeight}" rx="34" fill="url(#headlineScrim-${scene.index})"/>` : ""}
    <text x="${x}" y="${y}" font-family="${escapeXml(sceneSet.brandKit.typography.displayFamily ?? "Inter")}, Arial, sans-serif" font-size="${actionSize}" font-weight="950" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="10" paint-order="stroke" letter-spacing="-7">${escapeXml(action)}</text>
    <text x="${x}" y="${descriptorY}" font-family="${escapeXml(sceneSet.brandKit.typography.displayFamily ?? "Inter")}, Arial, sans-serif" font-size="${descriptorSize}" font-weight="950" fill="${escapeXml(fill)}" stroke="${escapeXml(stroke)}" stroke-width="7" paint-order="stroke" letter-spacing="-3.5">
      ${descriptorLines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : descriptorSize + 2}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    ${scene.copy.subheadline ? `<text x="${x}" y="${subY}" font-family="Arial, sans-serif" font-size="34" font-weight="850" fill="${escapeXml(isDark ? "#FFFFFF" : palette.text)}" stroke="${escapeXml(stroke)}" stroke-width="5" paint-order="stroke">${escapeXml(shorten(scene.copy.subheadline, 68))}</text>` : ""}
  `;
}

function renderProofPoster(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  if (styleBackgroundFor(input) || scene.composition !== "proof-poster") return "";
  const palette = effectivePaletteFor(sceneSet);
  return `
    <g transform="translate(${target.width * 0.12}, ${target.height * 0.43})" filter="url(#softShadow)">
      <rect x="0" y="0" width="${target.width * 0.76}" height="320" rx="58" fill="${escapeXml(palette.primary)}" />
      <text x="64" y="98" font-family="Arial Black, Arial" font-size="56" font-weight="900" fill="#fff">${escapeXml(scene.copy.badge ?? "Premium ready")}</text>
      <text x="64" y="174" font-family="Arial" font-size="34" fill="#fff" opacity="0.78">★★★★★  App Store campaign quality</text>
      <rect x="64" y="224" width="260" height="62" rx="31" fill="${escapeXml(palette.accent)}" />
      <text x="194" y="265" text-anchor="middle" font-family="Arial" font-size="24" font-weight="900" fill="#fff">TRUST SIGNAL</text>
    </g>
  `;
}

function renderDevice(input: RenderSceneSetInput & { scene: Scene }, device: LoadedDevice, frame: DeviceFrame, index: number): string {
  const screen = screenRect(frame);
  const clipId = `screenClip-${input.scene.index}-${index}`;
  const image = device.source
    ? `<image x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" href="data:${device.source.contentType};base64,${Buffer.from(device.source.bytes).toString("base64")}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`
    : renderPlaceholder(screen, effectivePaletteFor(input.sceneSet));
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;

  return `
    <g transform="rotate(${frame.tilt} ${cx} ${cy})" filter="url(#deviceShadow-${Math.min(4, frame.depth)})">
      <rect x="${frame.x - 7}" y="${frame.y + frame.height * 0.2}" width="12" height="160" rx="6" fill="#111827" />
      <rect x="${frame.x + frame.width - 4}" y="${frame.y + frame.height * 0.25}" width="12" height="210" rx="6" fill="#111827" />
      <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${frame.radius + 24}" fill="#070707" />
      <rect x="${frame.x + 12}" y="${frame.y + 12}" width="${frame.width - 24}" height="${frame.height - 24}" rx="${frame.radius + 12}" fill="#191919" />
      <clipPath id="${clipId}"><rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" /></clipPath>
      <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" fill="#fff" />
      ${image}
      <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" fill="url(#glassSheen)" opacity="0.24" clip-path="url(#${clipId})" />
      <rect x="${frame.x + frame.width * 0.36}" y="${frame.y + 18}" width="${frame.width * 0.28}" height="28" rx="14" fill="#050505" />
    </g>
  `;
}

function renderSceneObjects(input: RenderSceneSetInput & { scene: Scene }, layer: "behind" | "front"): string {
  if (styleBackgroundFor(input)) return "";
  const objects = input.scene.objects
    .filter((object) => layer === "front" ? object.depth >= 5 : object.depth < 5)
    .map((object) => renderObject(input, object))
    .join("");
  return `<g>${objects}</g>`;
}

function renderObject(input: RenderSceneSetInput & { scene: Scene }, object: SceneObject): string {
  const { target, sceneSet } = input;
  const palette = effectivePaletteFor(sceneSet);
  const x = target.width * object.x;
  const y = target.height * object.y;
  const scale = object.scale;
  const transform = `translate(${x}, ${y}) rotate(${object.rotation}) scale(${scale})`;

  if (object.kind === "badge") {
    return `<g transform="${transform}" filter="url(#softShadow)"><circle r="82" fill="${escapeXml(palette.accent)}"/><circle r="56" fill="#fff" opacity="0.24"/><text y="12" text-anchor="middle" font-family="Arial" font-size="32" font-weight="900" fill="#fff">★</text></g>`;
  }
  if (object.kind === "card") {
    return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-160" y="-104" width="320" height="208" rx="44" fill="#fff"/><rect x="-110" y="-40" width="220" height="24" rx="12" fill="${escapeXml(palette.accent)}" opacity="0.35"/><rect x="-110" y="18" width="144" height="24" rx="12" fill="${escapeXml(palette.primary)}" opacity="0.2"/><circle cx="104" cy="46" r="28" fill="${escapeXml(palette.accent)}" opacity="0.26"/></g>`;
  }
  if (object.kind === "coin") {
    return `<g transform="${transform}" filter="url(#softShadow)"><ellipse cx="0" cy="0" rx="118" ry="118" fill="${escapeXml(palette.accent)}"/><ellipse cx="-18" cy="-14" rx="70" ry="70" fill="#fff" opacity="0.26"/><text y="24" text-anchor="middle" font-family="Arial" font-size="64" font-weight="900" fill="#fff">$</text></g>`;
  }
  if (object.kind === "trophy") {
    return `<g transform="${transform}" filter="url(#softShadow)"><path d="M-108 -102 H108 L76 52 H-76 Z" fill="${escapeXml(palette.accent)}"/><rect x="-34" y="52" width="68" height="118" rx="24" fill="${escapeXml(palette.primary)}"/><rect x="-116" y="160" width="232" height="50" rx="25" fill="#fff" opacity="0.42"/></g>`;
  }
  if (object.kind === "book") {
    return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-132" y="-172" width="264" height="344" rx="34" fill="${escapeXml(palette.primary)}"/><rect x="-102" y="-136" width="204" height="272" rx="24" fill="${escapeXml(palette.surface)}" opacity="0.86"/><path d="M0 -136 V136" stroke="${escapeXml(palette.accent)}" stroke-width="8"/><rect x="-72" y="-72" width="144" height="22" rx="11" fill="${escapeXml(palette.accent)}" opacity="0.28"/><rect x="-72" y="-26" width="104" height="18" rx="9" fill="${escapeXml(palette.primary)}" opacity="0.18"/></g>`;
  }
  if (object.kind === "map-pin") {
    return `<g transform="${transform}" filter="url(#softShadow)"><path d="M0 -150 C88 -150 150 -88 150 -6 C150 96 42 160 0 214 C-42 160 -150 96 -150 -6 C-150 -88 -88 -150 0 -150 Z" fill="${escapeXml(palette.accent)}"/><circle r="68" fill="#fff" opacity="0.34"/><circle r="34" fill="${escapeXml(palette.primary)}" opacity="0.72"/></g>`;
  }

  return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-92" y="-92" width="184" height="184" rx="34" fill="${escapeXml(palette.accent)}"/><path d="M92 -60 L158 -96 L158 88 L92 128 Z" fill="${escapeXml(palette.primary)}" opacity="0.84"/><path d="M-92 92 H92 L158 88 L88 138 H-138 Z" fill="#fff" opacity="0.35"/><circle r="40" fill="#fff" opacity="0.36"/></g>`;
}

function renderCallouts(input: RenderSceneSetInput & { scene: Scene; loadedDevices: LoadedDevice[] }, frames: DeviceFrame[]): string {
  if (styleBackgroundFor(input)) return "";
  const palette = effectivePaletteFor(input.sceneSet);
  return input.scene.callouts.slice(0, 1).map((callout, index) => {
    const deviceIndex = callout.anchorDevice ?? 0;
    const frame = frames[deviceIndex];
    const loadedDevice = input.loadedDevices[deviceIndex];
    const screen = frame ? screenRect(frame) : undefined;
    const x = input.target.width * callout.x;
    const y = input.target.height * callout.y;
    const anchorX = frame ? frame.x + frame.width / 2 : x - 100;
    const anchorY = frame ? frame.y + frame.height * 0.42 : y + 80;
    const clipId = `zoomClip-${input.scene.index}-${index}`;
    const zoomSize = 330;
    const zoomImage = loadedDevice?.source && screen
      ? `<image x="${x - zoomSize * 0.82}" y="${y - zoomSize * 0.88}" width="${zoomSize * 1.65}" height="${zoomSize * 1.65}" href="data:${loadedDevice.source.contentType};base64,${Buffer.from(loadedDevice.source.bytes).toString("base64")}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`
      : `<rect x="${x - zoomSize / 2}" y="${y - zoomSize / 2}" width="${zoomSize}" height="${zoomSize}" fill="#fff" clip-path="url(#${clipId})" />`;
    return `
      <g filter="url(#softShadow)">
        <path d="M ${anchorX} ${anchorY} C ${x - 130} ${y - 120}, ${x - 80} ${y - 80}, ${x - 18} ${y - 18}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="8" stroke-linecap="round" stroke-dasharray="18 18" opacity="0.86" />
        <clipPath id="${clipId}"><circle cx="${x}" cy="${y}" r="${zoomSize / 2}" /></clipPath>
        <circle cx="${x}" cy="${y}" r="${zoomSize / 2 + 16}" fill="#fff" opacity="0.94" />
        ${zoomImage}
        <circle cx="${x}" cy="${y}" r="${zoomSize / 2}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="14" />
        <rect x="${x - 150}" y="${y + zoomSize / 2 + 28}" width="300" height="72" rx="36" fill="#fff" />
        <text x="${x}" y="${y + zoomSize / 2 + 75}" text-anchor="middle" font-family="Arial" font-size="25" font-weight="900" fill="${escapeXml(palette.text)}">${escapeXml(callout.label)}</text>
      </g>
    `;
  }).join("");
}

function sceneDefs(_input: RenderSceneSetInput & { scene: Scene }, _frames: DeviceFrame[]): string {
  return `
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#0f172a" flood-opacity="0.18"/></filter>
    <filter id="premiumBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="34"/></filter>
    <filter id="aiBackgroundSanitize" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="14"/><feColorMatrix type="saturate" values="1.12"/><feComponentTransfer><feFuncA type="linear" slope="0.98"/></feComponentTransfer></filter>
    <filter id="deviceShadow-1" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.20"/></filter>
    <filter id="deviceShadow-2" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.24"/></filter>
    <filter id="deviceShadow-3" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="38" stdDeviation="36" flood-color="#0f172a" flood-opacity="0.28"/></filter>
    <filter id="deviceShadow-4" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="48" stdDeviation="44" flood-color="#0f172a" flood-opacity="0.32"/></filter>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0.36"/><stop offset="42%" stop-color="#fff" stop-opacity="0.08"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
  `;
}

function frameForDevice(target: RenderTarget, composition: Scene["composition"], device: SceneDevice): DeviceFrame {
  const desiredHeightRatio = desiredDeviceHeightRatio(composition, device);
  const scaleInfluence = composition === "split-devices" ? 1 : Math.min(1.06, Math.max(0.96, 0.86 + device.scale * 0.2));
  const height = Math.round(target.height * desiredHeightRatio * scaleInfluence);
  const width = Math.round(height / 2.05);
  const cx = target.width * device.x;
  const cy = target.height * device.y;
  let x = Math.round(cx - width / 2);
  if (device.crop === "edge-right") x = Math.round(target.width - width * 0.96);
  if (device.crop === "edge-left") x = Math.round(-width * 0.04);
  const minTop = target.height * (composition === "proof-poster" ? 0.26 : 0.24);
  const maxTop = target.height - height - target.height * 0.045;
  const unclampedY = Math.round(cy - height / 2);
  const y = Math.round(Math.max(minTop, Math.min(maxTop, unclampedY)));
  return {
    x,
    y,
    width,
    height,
    radius: Math.max(54, Math.round(width * 0.13)),
    tilt: device.tilt,
    depth: device.depth,
  };
}

function desiredDeviceHeightRatio(composition: Scene["composition"], device: SceneDevice): number {
  if (composition === "split-devices" || composition === "before-after") return device.depth >= 5 || device.crop !== "full" ? 0.48 : 0.53;
  if (composition === "cropped-edge-device") return 0.60;
  return 0.70;
}

function screenRect(frame: DeviceFrame) {
  return {
    x: frame.x + 22,
    y: frame.y + 22,
    width: frame.width - 44,
    height: frame.height - 44,
    radius: Math.max(28, frame.radius - 22),
  };
}

function renderPlaceholder(screen: ReturnType<typeof screenRect>, palette: SceneSet["brandKit"]["palette"]): string {
  return `
    <rect x="${screen.x + 42}" y="${screen.y + 140}" width="${screen.width - 84}" height="74" rx="26" fill="${escapeXml(palette.primary)}" opacity="0.14" />
    <rect x="${screen.x + 42}" y="${screen.y + 274}" width="${screen.width - 84}" height="300" rx="42" fill="${escapeXml(palette.accent)}" opacity="0.20" />
    <rect x="${screen.x + 42}" y="${screen.y + 650}" width="${screen.width - 120}" height="62" rx="31" fill="${escapeXml(palette.text)}" opacity="0.16" />
  `;
}

function svgShell(target: RenderTarget, body: string): string {
  return `<svg width="${target.width}" height="${target.height}" viewBox="0 0 ${target.width} ${target.height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function shorten(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function wrapWords(value: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let currentLine = "";
  for (const word of value.split(/\s+/).filter(Boolean)) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (nextLine.length > maxCharsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function tint(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const numberValue = Number.parseInt(clean, 16);
  const r = Math.round(((numberValue >> 16) & 255) + (255 - ((numberValue >> 16) & 255)) * amount);
  const g = Math.round(((numberValue >> 8) & 255) + (255 - ((numberValue >> 8) & 255)) * amount);
  const b = Math.round((numberValue & 255) + (255 - (numberValue & 255)) * amount);
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "scene";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
