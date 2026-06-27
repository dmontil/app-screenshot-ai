import sharp from "sharp";

import type { RenderedAsset, RenderTarget, Storyboard } from "@app-screenshot-ai/schemas";

export type CompositionSource = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

export type GeneratedComposition = {
  id: string;
  index: number;
  role: "cover" | "screenshot";
  headline: string;
  subheadline?: string;
  background: CompositionSource;
  sourceScreenshotPath?: string;
  screenshotSlot?: {
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    rotation: number;
  };
};

export type ComposeGeneratedCompositionsInput = {
  compositions: GeneratedComposition[];
  target: RenderTarget;
  loadSourceScreenshot?: (path: string) => Promise<CompositionSource>;
};

export class ComposeGeneratedCompositionsUseCase {
  async execute(input: ComposeGeneratedCompositionsInput): Promise<RenderedAsset[]> {
    const assets: RenderedAsset[] = [];
    for (const composition of input.compositions) {
      const source = composition.sourceScreenshotPath && input.loadSourceScreenshot
        ? await input.loadSourceScreenshot(composition.sourceScreenshotPath)
        : undefined;
      const svg = renderCompositionSvg(input.target, composition, source);
      const bytes = await sharp(Buffer.from(svg)).png().toBuffer();
      assets.push({
        id: `composition-${composition.index}`,
        screenIndex: composition.index,
        store: input.target.store,
        device: input.target.device,
        locale: input.target.locale,
        fileName: `${String(composition.index).padStart(2, "0")}-${slugify(composition.role)}.png`,
        contentType: "image/png",
        width: input.target.width,
        height: input.target.height,
        bytes: new Uint8Array(bytes),
      });
    }
    return assets;
  }
}

export function buildGeneratedCompositions(params: {
  storyboard: Storyboard;
  backgrounds: Record<string, CompositionSource>;
  includeCoverScreen: boolean;
}): GeneratedComposition[] {
  return params.storyboard.screens.map((screen) => {
    const role = params.includeCoverScreen && screen.index === 1 ? "cover" as const : "screenshot" as const;
    const background = params.backgrounds[screen.id] ?? params.backgrounds[String(screen.index)];
    if (!background) throw new Error(`Missing generated composition image for screen '${screen.id}'.`);
    const base = {
      id: screen.id,
      index: screen.index,
      role,
      headline: screen.headline,
      ...(screen.subheadline ? { subheadline: screen.subheadline } : {}),
      background,
    };
    if (role === "cover") return base;
    return {
      ...base,
      sourceScreenshotPath: screen.sourceScreenshotPath,
      screenshotSlot: defaultScreenshotSlot(),
    };
  });
}

function defaultScreenshotSlot(): NonNullable<GeneratedComposition["screenshotSlot"]> {
  return { x: 0.22, y: 0.29, width: 0.56, height: 0.58, cornerRadius: 0.045, rotation: -4 };
}

function renderCompositionSvg(target: RenderTarget, composition: GeneratedComposition, source: CompositionSource | undefined): string {
  const bgHref = dataUrl(composition.background);
  const headlineLines = wrapWords(composition.headline.toUpperCase(), 13).slice(0, 3);
  const headlineSize = composition.role === "cover" ? 118 : 92;
  const headlineX = Math.round(target.width * 0.08);
  const headlineY = Math.round(target.height * 0.095);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${target.width}" height="${target.height}" viewBox="0 0 ${target.width} ${target.height}">
      <defs>
        <filter id="deviceShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="34" stdDeviation="30" flood-color="#06132E" flood-opacity="0.38"/></filter>
        <filter id="stageSanitize" x="-8%" y="-8%" width="116%" height="116%"><feGaussianBlur stdDeviation="18"/><feColorMatrix type="saturate" values="1.14"/></filter>
        <linearGradient id="textScrim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#07132B" stop-opacity="0.62"/><stop offset="62%" stop-color="#07132B" stop-opacity="0.24"/><stop offset="100%" stop-color="#07132B" stop-opacity="0"/></linearGradient>
        <radialGradient id="stageFocus" cx="50%" cy="54%" r="62%"><stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.02"/><stop offset="72%" stop-color="#07132B" stop-opacity="0.08"/><stop offset="100%" stop-color="#07132B" stop-opacity="0.22"/></radialGradient>
      </defs>
      <image href="${bgHref}" x="-${target.width * 0.04}" y="-${target.height * 0.04}" width="${target.width * 1.08}" height="${target.height * 1.08}" preserveAspectRatio="xMidYMid slice" filter="url(#stageSanitize)"/>
      <rect x="0" y="0" width="${target.width}" height="${target.height}" fill="url(#stageFocus)"/>
      <rect x="0" y="0" width="${target.width}" height="${target.height * 0.31}" fill="url(#textScrim)"/>
      ${renderScreenshot(target, composition, source)}
      <text x="${headlineX}" y="${headlineY}" font-family="Arial Black, Impact, Arial, sans-serif" font-size="${headlineSize}" font-weight="950" fill="#FFFFFF" stroke="#15305F" stroke-width="8" paint-order="stroke" letter-spacing="-5">
        ${headlineLines.map((line, index) => `<tspan x="${headlineX}" dy="${index === 0 ? 0 : headlineSize * 0.86}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      ${composition.subheadline ? `<text x="${headlineX}" y="${headlineY + headlineLines.length * headlineSize * 0.86 + 46}" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#FFFFFF" stroke="#15305F" stroke-width="4" paint-order="stroke">${escapeXml(shorten(composition.subheadline, 62))}</text>` : ""}
    </svg>
  `;
}

function renderScreenshot(target: RenderTarget, composition: GeneratedComposition, source: CompositionSource | undefined): string {
  if (!source || !composition.screenshotSlot) return "";
  const slot = composition.screenshotSlot;
  const x = target.width * slot.x;
  const y = target.height * slot.y;
  const width = target.width * slot.width;
  const height = target.height * slot.height;
  const radius = Math.max(24, target.width * slot.cornerRadius);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const clipId = `clip-${composition.index}`;
  const deviceChrome = deviceChromeFor(target);
  const outerPadX = deviceChrome.platform === "android" ? 11 : 14;
  const outerPadY = deviceChrome.platform === "android" ? 14 : 18;
  return `
    <g transform="rotate(${slot.rotation} ${cx} ${cy})" filter="url(#deviceShadow)">
      <rect x="${x - outerPadX}" y="${y - outerPadY}" width="${width + outerPadX * 2}" height="${height + outerPadY * 2}" rx="${radius + deviceChrome.radiusOffset}" fill="${deviceChrome.hardwareFill}"/>
      <rect x="${x - outerPadX + 4}" y="${y - outerPadY + 4}" width="${width + outerPadX * 2 - 8}" height="${height + outerPadY * 2 - 8}" rx="${radius + Math.max(8, deviceChrome.radiusOffset - 6)}" fill="none" stroke="#FFFFFF" stroke-opacity="${deviceChrome.outerHighlightOpacity}" stroke-width="3"/>
      <clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath>
      <image href="${dataUrl(source)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="none" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="5"/>
      ${deviceChrome.platform === "ios" ? `<rect x="${x + width * 0.35}" y="${y + 18}" width="${width * 0.30}" height="24" rx="12" fill="${deviceChrome.hardwareFill}"/>` : ""}
    </g>
  `;
}

type DeviceChrome = {
  platform: "ios" | "android";
  hardwareFill: string;
  radiusOffset: number;
  outerHighlightOpacity: number;
};

function deviceChromeFor(target: RenderTarget): DeviceChrome {
  const descriptor = `${target.store} ${target.device}`.toLowerCase();
  if (descriptor.includes("android") || descriptor.includes("google-play") || descriptor.includes("pixel")) {
    return { platform: "android", hardwareFill: "#111827", radiusOffset: 18, outerHighlightOpacity: 0.28 };
  }
  return { platform: "ios", hardwareFill: "#05070D", radiusOffset: 26, outerHighlightOpacity: 0.36 };
}

function dataUrl(source: CompositionSource): string {
  return `data:${source.contentType};base64,${Buffer.from(source.bytes).toString("base64")}`;
}

function wrapWords(value: string, maxChars: number): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [value];
}

function shorten(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trim()}…`;
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen";
}
