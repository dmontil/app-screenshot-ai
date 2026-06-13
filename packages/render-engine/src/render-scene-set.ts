import sharp from "sharp";

import type { ProductUnderstanding, RenderedAsset, RenderTarget, Scene, SceneDevice, SceneObject, SceneSet } from "@app-screenshot-ai/schemas";

export type RenderSceneSetSource = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
};

export type RenderSceneSetInput = {
  sceneSet: SceneSet;
  productUnderstanding: ProductUnderstanding;
  target: RenderTarget;
  loadSourceScreenshot?: (path: string) => Promise<RenderSceneSetSource>;
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
    <text x="86" y="${target.height - 92}" font-family="Arial, sans-serif" font-size="24" font-weight="900" letter-spacing="4" fill="${escapeXml(sceneSet.brandKit.palette.accent)}" opacity="0.62">${escapeXml(compositionClass)}</text>
  `);
}

function renderBackground(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, sceneSet, scene } = input;
  const palette = sceneSet.brandKit.palette;
  const bg = palette.background;
  const surface = palette.surface;
  const primary = palette.primary;
  const accent = palette.accent;
  const text = palette.text;

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
      <stop offset="100%" stop-color="${escapeXml(tint(accent, 0.86))}"/>
    </linearGradient>
    <rect width="100%" height="100%" fill="url(#premiumBg)" />
    <radialGradient id="heroGlow" cx="72%" cy="18%" r="65%"><stop offset="0%" stop-color="${escapeXml(accent)}" stop-opacity="${0.34 * scene.background.intensity}"/><stop offset="100%" stop-color="${escapeXml(surface)}" stop-opacity="0"/></radialGradient>
    <rect width="100%" height="100%" fill="url(#heroGlow)" />
    <circle cx="${target.width * 0.16}" cy="${target.height * 0.76}" r="330" fill="${escapeXml(primary)}" opacity="0.09" />
    <circle cx="${target.width * 0.86}" cy="${target.height * 0.23}" r="240" fill="${escapeXml(accent)}" opacity="0.18" />
    <text x="${target.width - 80}" y="${target.height - 96}" text-anchor="end" font-family="Arial Black, Arial" font-size="154" font-weight="900" fill="${escapeXml(text)}" opacity="0.05">${String(scene.index).padStart(2, "0")}</text>
  `;
}

function renderArtDirectionLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const keywords = input.sceneSet.brandKit.imagery.keywords.map((keyword) => keyword.toLowerCase());
  if (keywords.some((keyword) => ["books", "maps", "routes"].includes(keyword))) return renderTravelEditorialLayer(input);
  if (keywords.some((keyword) => ["coins", "proof"].includes(keyword))) return renderFinanceTrustLayer(input);
  if (keywords.some((keyword) => ["rings", "trophy", "energy"].includes(keyword))) return renderFitnessEnergyLayer(input);
  return renderUtilityDepthLayer(input);
}

function renderTravelEditorialLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = sceneSet.brandKit.palette;
  const headline = scene.role === "cta" ? "START" : scene.role === "proof" ? "TRUST" : "ROUTE";
  const pinY = target.height * (0.58 + (scene.index % 3) * 0.06);
  const paperOpacity = scene.composition === "cropped-edge-device" ? 0.64 : 0.46;
  const bookStack = scene.composition === "object-led" || scene.index % 2 === 1
    ? `<g transform="translate(${target.width * 0.73}, ${target.height * 0.69}) rotate(-8)" filter="url(#softShadow)">
        <rect x="-170" y="-74" width="340" height="148" rx="18" fill="${escapeXml(palette.primary)}" />
        <rect x="-150" y="-54" width="300" height="108" rx="14" fill="${escapeXml(palette.surface)}" opacity="0.86" />
        <rect x="-110" y="-142" width="300" height="148" rx="18" fill="${escapeXml(palette.accent)}" opacity="0.86" />
        <rect x="-92" y="-122" width="264" height="108" rx="14" fill="#fff" opacity="0.48" />
        <path d="M -10 -122 V -14" stroke="${escapeXml(palette.primary)}" stroke-width="7" opacity="0.56" />
      </g>`
    : "";

  return `
    <g>
      <path d="M -80 ${target.height * 0.40} C ${target.width * 0.24} ${target.height * 0.22}, ${target.width * 0.58} ${target.height * 0.72}, ${target.width + 120} ${target.height * 0.36}" fill="none" stroke="${escapeXml(palette.primary)}" stroke-width="2" stroke-dasharray="10 20" opacity="0.18" />
      <path d="M -90 ${target.height * 0.74} C ${target.width * 0.24} ${target.height * 0.58}, ${target.width * 0.55} ${target.height * 0.90}, ${target.width + 120} ${target.height * 0.58}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="6" stroke-dasharray="18 24" opacity="0.26" />
      <g transform="translate(${target.width * 0.62}, ${target.height * 0.32}) rotate(7)">
        <rect x="-238" y="-120" width="476" height="710" rx="42" fill="#fff" opacity="${paperOpacity}" filter="url(#softShadow)" />
        <text x="-188" y="-38" font-family="Arial" font-size="24" font-weight="900" fill="${escapeXml(palette.accent)}" letter-spacing="5" opacity="0.86">${headline} NOTES</text>
        ${Array.from({ length: 6 }, (_, index) => `<path d="M -184 ${42 + index * 82} H 184" stroke="${escapeXml(palette.primary)}" stroke-width="3" opacity="${0.08 + index * 0.01}"/>`).join("")}
        <path d="M -150 120 C -58 48, 48 206, 146 106" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="10" stroke-linecap="round" opacity="0.28" />
        <circle cx="-150" cy="120" r="18" fill="${escapeXml(palette.accent)}" opacity="0.68" />
        <circle cx="146" cy="106" r="18" fill="${escapeXml(palette.primary)}" opacity="0.42" />
      </g>
      <g transform="translate(${target.width * 0.16}, ${pinY})" filter="url(#softShadow)">
        <rect x="-96" y="-42" width="192" height="84" rx="42" fill="#fff" opacity="0.74" />
        <circle cx="-48" cy="0" r="16" fill="${escapeXml(palette.accent)}" />
        <text x="-18" y="9" font-family="Arial" font-size="24" font-weight="900" fill="${escapeXml(palette.text)}">CITY ROUTE</text>
      </g>
      ${bookStack}
    </g>
  `;
}

function renderFinanceTrustLayer(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = sceneSet.brandKit.palette;
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
  const palette = sceneSet.brandKit.palette;
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
  const palette = sceneSet.brandKit.palette;
  return `
    <g>
      <path d="M ${target.width * 0.08} ${target.height * 0.39} L ${target.width * 0.88} ${target.height * 0.24} L ${target.width * 0.78} ${target.height * 0.82} L ${target.width * 0.02} ${target.height * 0.68} Z" fill="${escapeXml(palette.accent)}" opacity="0.08" />
      ${[0, 1, 2].map((index) => `<g transform="translate(${target.width * (0.64 + index * 0.06)}, ${target.height * (0.22 + index * 0.1)}) rotate(${-8 + index * 8})" filter="url(#softShadow)"><rect x="-112" y="-78" width="224" height="156" rx="36" fill="#fff" opacity="${0.55 - index * 0.1}"/><circle cx="-58" cy="-20" r="18" fill="${escapeXml(palette.accent)}" opacity="0.66"/><rect x="-28" y="-32" width="98" height="18" rx="9" fill="${escapeXml(palette.primary)}" opacity="0.22"/><rect x="-58" y="24" width="128" height="16" rx="8" fill="${escapeXml(palette.accent)}" opacity="0.22"/></g>`).join("")}
      ${scene.composition === "object-led" ? `<text x="${target.width * 0.52}" y="${target.height * 0.82}" font-family="Arial Black, Arial" font-size="136" fill="${escapeXml(palette.primary)}" opacity="0.055">FLOW</text>` : ""}
    </g>
  `;
}

function renderContinuityMotif(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, sceneSet, scene } = input;
  const palette = sceneSet.brandKit.palette;
  const opacity = sceneSet.continuity.sharedBackground === "solid" ? 0.08 : 0.22;
  const routePath = `M -120 ${target.height * 0.66} C ${target.width * 0.22} ${target.height * 0.44}, ${target.width * 0.58} ${target.height * 0.88}, ${target.width + 120} ${target.height * 0.54}`;
  const grid = Array.from({ length: 14 }, (_, index) => {
    const x = index * 120 - 120;
    return `<path d="M ${x} 320 L ${x + 620} ${target.height - 260}" stroke="${escapeXml(palette.primary)}" stroke-width="2" opacity="0.035"/>`;
  }).join("");

  return `
    <g opacity="${opacity}">
      ${grid}
      <path d="${routePath}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="14" stroke-linecap="round" stroke-dasharray="28 34" opacity="0.66" />
      <path d="${routePath}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.55" />
      ${sceneSet.continuity.recurringObjects.slice(0, 3).map((object, index) => `<text x="${90 + index * 210}" y="${target.height - 180 - index * 40}" font-family="Arial" font-size="22" font-weight="900" fill="${escapeXml(palette.primary)}" opacity="0.38">${escapeXml(object.toUpperCase())}</text>`).join("")}
      <text x="86" y="104" font-family="Arial" font-size="26" font-weight="900" fill="${escapeXml(palette.accent)}" letter-spacing="5">${escapeXml(scene.role.toUpperCase())}</text>
    </g>
  `;
}

function renderCompositionBackdrop(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  const palette = sceneSet.brandKit.palette;
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
  const palette = sceneSet.brandKit.palette;
  const isDark = scene.background.kind === "dark-stage";
  const fill = isDark ? "#FFFFFF" : palette.text;
  const x = scene.composition === "proof-poster" ? 100 : 86;
  const y = scene.composition === "proof-poster" ? 220 : 188;
  const size = scene.composition === "proof-poster" ? 92 : 104;
  const lines = wrapWords(scene.copy.headline, scene.composition === "split-devices" ? 14 : 16).slice(0, 4);
  const subY = y + lines.length * (size + 4) + 32;

  return `
    <text x="${x}" y="${y}" font-family="${escapeXml(sceneSet.brandKit.typography.displayFamily ?? "Inter")}, Arial, sans-serif" font-size="${size}" font-weight="${sceneSet.brandKit.typography.weight}" fill="${escapeXml(fill)}" letter-spacing="-5">
      ${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size + 4}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    ${scene.copy.subheadline ? `<text x="${x}" y="${subY}" font-family="Arial, sans-serif" font-size="34" fill="${escapeXml(isDark ? "#D8DEE9" : tint(palette.text, 0.35))}">${escapeXml(scene.copy.subheadline)}</text>` : ""}
  `;
}

function renderProofPoster(input: RenderSceneSetInput & { scene: Scene }): string {
  const { target, scene, sceneSet } = input;
  if (scene.composition !== "proof-poster") return "";
  const palette = sceneSet.brandKit.palette;
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
    : renderPlaceholder(screen, input.sceneSet.brandKit.palette);
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
  const objects = input.scene.objects
    .filter((object) => layer === "behind" ? object.depth < 4 : object.depth >= 4)
    .map((object) => renderObject(input, object))
    .join("");
  return `<g>${objects}</g>`;
}

function renderObject(input: RenderSceneSetInput & { scene: Scene }, object: SceneObject): string {
  const { target, sceneSet } = input;
  const palette = sceneSet.brandKit.palette;
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

  return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-92" y="-92" width="184" height="184" rx="34" fill="${escapeXml(palette.accent)}"/><path d="M92 -60 L158 -96 L158 88 L92 128 Z" fill="${escapeXml(palette.primary)}" opacity="0.84"/><path d="M-92 92 H92 L158 88 L88 138 H-138 Z" fill="#fff" opacity="0.35"/><circle r="40" fill="#fff" opacity="0.36"/></g>`;
}

function renderCallouts(input: RenderSceneSetInput & { scene: Scene }, frames: DeviceFrame[]): string {
  const palette = input.sceneSet.brandKit.palette;
  return input.scene.callouts.map((callout) => {
    const frame = frames[callout.anchorDevice ?? 0];
    const x = input.target.width * callout.x;
    const y = input.target.height * callout.y;
    const anchorX = frame ? frame.x + frame.width / 2 : x - 100;
    const anchorY = frame ? frame.y + frame.height * 0.42 : y + 80;
    return `
      <g filter="url(#softShadow)">
        <path d="M ${anchorX} ${anchorY} C ${x - 80} ${y - 70}, ${x - 30} ${y - 40}, ${x} ${y}" fill="none" stroke="${escapeXml(palette.accent)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="18 18" />
        <rect x="${x - 210}" y="${y - 70}" width="420" height="140" rx="42" fill="#fff" />
        <circle cx="${x - 150}" cy="${y}" r="32" fill="${escapeXml(palette.accent)}" />
        <text x="${x - 100}" y="${y + 10}" font-family="Arial" font-size="28" font-weight="900" fill="${escapeXml(palette.text)}">${escapeXml(callout.label)}</text>
      </g>
    `;
  }).join("");
}

function sceneDefs(_input: RenderSceneSetInput & { scene: Scene }, _frames: DeviceFrame[]): string {
  return `
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="30" stdDeviation="30" flood-color="#0f172a" flood-opacity="0.18"/></filter>
    <filter id="deviceShadow-1" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.20"/></filter>
    <filter id="deviceShadow-2" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.24"/></filter>
    <filter id="deviceShadow-3" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="38" stdDeviation="36" flood-color="#0f172a" flood-opacity="0.28"/></filter>
    <filter id="deviceShadow-4" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="48" stdDeviation="44" flood-color="#0f172a" flood-opacity="0.32"/></filter>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0.36"/><stop offset="42%" stop-color="#fff" stop-opacity="0.08"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></linearGradient>
  `;
}

function frameForDevice(target: RenderTarget, composition: Scene["composition"], device: SceneDevice): DeviceFrame {
  const baseRatio = composition === "cropped-edge-device" ? 0.62 : composition === "split-devices" ? 0.52 : 0.58;
  const width = Math.round(target.width * baseRatio * device.scale);
  const height = Math.round(width * 2.05);
  const cx = target.width * device.x;
  const cy = target.height * device.y;
  let x = Math.round(cx - width / 2);
  if (device.crop === "edge-right") x = Math.round(target.width - width * 0.72);
  if (device.crop === "edge-left") x = Math.round(-width * 0.28);
  return {
    x,
    y: Math.round(cy - height / 2),
    width,
    height,
    radius: Math.max(54, Math.round(width * 0.13)),
    tilt: device.tilt,
    depth: device.depth,
  };
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
