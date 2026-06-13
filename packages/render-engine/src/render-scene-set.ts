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
    return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-110" y="-70" width="220" height="140" rx="34" fill="#fff"/><rect x="-74" y="-28" width="148" height="18" rx="9" fill="${escapeXml(palette.accent)}" opacity="0.35"/><rect x="-74" y="12" width="96" height="18" rx="9" fill="${escapeXml(palette.primary)}" opacity="0.2"/></g>`;
  }
  if (object.kind === "coin") {
    return `<g transform="${transform}" filter="url(#softShadow)"><ellipse cx="0" cy="0" rx="82" ry="82" fill="${escapeXml(palette.accent)}"/><ellipse cx="-12" cy="-8" rx="48" ry="48" fill="#fff" opacity="0.26"/><text y="16" text-anchor="middle" font-family="Arial" font-size="42" font-weight="900" fill="#fff">$</text></g>`;
  }
  if (object.kind === "trophy") {
    return `<g transform="${transform}" filter="url(#softShadow)"><path d="M-70 -70 H70 L48 34 H-48 Z" fill="${escapeXml(palette.accent)}"/><rect x="-24" y="34" width="48" height="76" rx="18" fill="${escapeXml(palette.primary)}"/><rect x="-70" y="104" width="140" height="34" rx="17" fill="#fff" opacity="0.42"/></g>`;
  }
  if (object.kind === "book") {
    return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-78" y="-92" width="156" height="184" rx="22" fill="${escapeXml(palette.primary)}"/><rect x="-54" y="-66" width="108" height="132" rx="14" fill="${escapeXml(palette.surface)}" opacity="0.82"/><path d="M0 -66 V66" stroke="${escapeXml(palette.accent)}" stroke-width="5"/></g>`;
  }

  return `<g transform="${transform}" filter="url(#softShadow)"><rect x="-64" y="-64" width="128" height="128" rx="26" fill="${escapeXml(palette.accent)}"/><path d="M64 -42 L112 -68 L112 60 L64 90 Z" fill="${escapeXml(palette.primary)}" opacity="0.84"/><path d="M-64 64 H64 L112 60 L62 96 H-98 Z" fill="#fff" opacity="0.35"/><circle r="28" fill="#fff" opacity="0.36"/></g>`;
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
