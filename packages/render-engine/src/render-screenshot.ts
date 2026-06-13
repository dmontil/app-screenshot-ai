import sharp from "sharp";

import type { RenderedAsset, RenderTarget, ScreenPlan, VisualSystem } from "@app-screenshot-ai/schemas";
import { resolveRenderTreatment } from "./render-treatment";

export type RenderScreenshotInput = {
  visualSystem: VisualSystem;
  screenPlan: ScreenPlan;
  target: RenderTarget;
  sourceScreenshot?: {
    bytes: Uint8Array;
    contentType: "image/png" | "image/jpeg";
  };
  secondarySourceScreenshot?: {
    bytes: Uint8Array;
    contentType: "image/png" | "image/jpeg";
  };
  campaign?: {
    screenCount: number;
  };
};

type Frame = {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  tilt: number;
};

export class RenderScreenshotUseCase {
  async execute(input: RenderScreenshotInput): Promise<RenderedAsset> {
    const svg = buildSvg(input);
    const bytes = await sharp(Buffer.from(svg)).png().toBuffer();

    return {
      id: `screen-${input.screenPlan.index}`,
      screenIndex: input.screenPlan.index,
      store: input.target.store,
      device: input.target.device,
      locale: input.target.locale,
      fileName: `${String(input.screenPlan.index).padStart(2, "0")}-${slugify(input.screenPlan.role)}.png`,
      contentType: "image/png",
      width: input.target.width,
      height: input.target.height,
      bytes: new Uint8Array(bytes),
    };
  }
}

function buildSvg(input: RenderScreenshotInput): string {
  const treatment = resolveRenderTreatment({
    layoutFamily: input.visualSystem.layoutFamily,
    treatment: input.screenPlan.treatment,
  });

  if (treatment === "cinematic-atlas") return cinematicAtlasSvg(input);
  if (treatment === "premium-proof-cards") return premiumCardsSvg(input);
  if (treatment === "map-route-editorial") return mapRouteEditorialSvg(input);
  return classicSvg(input);
}

function mapRouteEditorialSvg(input: RenderScreenshotInput): string {
  const { target, visualSystem, screenPlan } = input;
  const frame = phoneFrame(input, {
    y: Math.round(target.height * 0.29),
    widthRatio: screenPlan.index % 2 === 0 ? 0.7 : 0.76,
    tilt: screenPlan.device?.tilt ?? (screenPlan.index % 2 === 0 ? 2.5 : -2),
  });
  const headlineStyle = textLayerStyle(input, "headline", { x: visualSystem.layout.safeMargin, y: 248, fontSize: 104, fontWeight: visualSystem.typography.headlineWeight, maxCharsPerLine: 16 });
  const subheadlineStyle = textLayerStyle(input, "subheadline", { x: visualSystem.layout.safeMargin, y: 128, fontSize: 34, fontWeight: 400, maxCharsPerLine: 60 });
  const lines = wrapWords(screenPlan.headline, headlineStyle.maxCharsPerLine).slice(0, 4);
  const chapter = String(screenPlan.index).padStart(2, "0");

  return svgShell(input, `
    <defs>${commonDefs(input, frame)}</defs>
    <rect width="100%" height="100%" fill="#fbf5ea" />
    ${renderCampaignBackdrop(input, { intensity: "strong" })}
    <circle cx="${target.width - 170}" cy="310" r="190" fill="${escapeXml(visualSystem.palette.accent)}" opacity="0.18" />
    <circle cx="120" cy="${target.height - 260}" r="270" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.10" />
    <text x="${target.width - 96}" y="${target.height - 110}" text-anchor="end" font-family="Georgia, serif" font-size="132" font-weight="700" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.12">${chapter}</text>
    <text x="${visualSystem.layout.safeMargin}" y="150" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="${escapeXml(visualSystem.palette.accent)}" letter-spacing="5">LITERARYTRIP</text>
    <text x="${headlineStyle.x}" y="${headlineStyle.y}" text-anchor="${headlineStyle.align}" font-family="${escapeXml(headlineStyle.fontFamily)}, Arial, sans-serif" font-size="${headlineStyle.fontSize}" font-weight="${headlineStyle.fontWeight}" fill="${escapeXml(visualSystem.palette.text)}" letter-spacing="-5">
      ${lines.map((line, index) => `<tspan x="${headlineStyle.x}" dy="${index === 0 ? 0 : headlineStyle.fontSize + 2}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    <text x="${subheadlineStyle.x}" y="${screenPlan.text?.subheadline?.y ? subheadlineStyle.y : headlineStyle.y + lines.length * headlineStyle.fontSize + 42}" text-anchor="${subheadlineStyle.align}" font-family="${escapeXml(subheadlineStyle.fontFamily)}, Arial, sans-serif" font-size="${subheadlineStyle.fontSize}" font-weight="${subheadlineStyle.fontWeight}" fill="#735f4f">${escapeXml(screenPlan.subheadline ?? roleCaption(screenPlan.role))}</text>
    ${renderPhone(input, frame)}
    ${input.secondarySourceScreenshot ? renderSecondaryMiniPhone(input, frame) : ""}
    ${renderCalloutBadge(input, frame)}
  `);
}

function premiumCardsSvg(input: RenderScreenshotInput): string {
  const { target, visualSystem, screenPlan } = input;
  const frame = phoneFrame(input, {
    y: Math.round(target.height * 0.31),
    widthRatio: 0.72,
    tilt: screenPlan.device?.tilt ?? -1.2,
  });
  const headlineStyle = textLayerStyle(input, "headline", { x: 120, y: 250, fontSize: 96, fontWeight: visualSystem.typography.headlineWeight, maxCharsPerLine: 14 });
  const lines = wrapWords(screenPlan.headline, headlineStyle.maxCharsPerLine).slice(0, 4);
  const proofCard = proofCardFrame(input, frame);
  const proofSubheadlineLines = wrapWords(screenPlan.subheadline ?? roleCaption(screenPlan.role), input.secondarySourceScreenshot ? 34 : 52).slice(0, 2);

  return svgShell(input, `
    <defs>${commonDefs(input, frame)}</defs>
    <rect width="100%" height="100%" fill="#f4ecdf" />
    ${renderCampaignBackdrop(input, { intensity: "soft" })}
    <circle cx="${target.width * 0.18}" cy="${target.height * 0.18}" r="260" fill="${escapeXml(visualSystem.palette.accent)}" opacity="0.20" />
    <circle cx="${target.width * 0.88}" cy="${target.height * 0.58}" r="360" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.09" />
    <rect x="70" y="80" width="${target.width - 140}" height="430" rx="56" fill="#fffaf2" filter="url(#softShadow)" />
    <text x="120" y="160" font-family="Arial, sans-serif" font-size="27" font-weight="900" fill="${escapeXml(visualSystem.palette.accent)}" letter-spacing="4">${escapeXml(screenPlan.role.toUpperCase().replaceAll("_", " "))}</text>
    <text x="${headlineStyle.x}" y="${headlineStyle.y}" text-anchor="${headlineStyle.align}" font-family="${escapeXml(headlineStyle.fontFamily)}, Arial, sans-serif" font-size="${headlineStyle.fontSize}" font-weight="${headlineStyle.fontWeight}" fill="${escapeXml(visualSystem.palette.text)}" letter-spacing="-5">
      ${lines.map((line, index) => `<tspan x="${headlineStyle.x}" dy="${index === 0 ? 0 : headlineStyle.fontSize + 2}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    ${renderPhone(input, frame)}
    ${input.secondarySourceScreenshot ? renderSecondaryMiniPhone(input, frame) : ""}
    <rect x="${proofCard.x}" y="${proofCard.y}" width="${proofCard.width}" height="${proofCard.height}" rx="52" fill="#fffaf2" filter="url(#softShadow)" />
    <text x="${proofCard.x + 50}" y="${proofCard.y + 116}" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="${escapeXml(visualSystem.palette.text)}">${escapeXml(proofTitle(screenPlan.role))}</text>
    <text x="${proofCard.x + 50}" y="${proofCard.y + 184}" font-family="Arial, sans-serif" font-size="32" fill="#736052">
      ${proofSubheadlineLines.map((line, index) => `<tspan x="${proofCard.x + 50}" dy="${index === 0 ? 0 : 42}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    <rect x="${proofCard.x + 50}" y="${proofCard.y + proofCard.height - 94}" width="250" height="58" rx="29" fill="${escapeXml(visualSystem.palette.accent)}" opacity="0.9" />
    <text x="${proofCard.x + 175}" y="${proofCard.y + proofCard.height - 56}" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#29170e">STORE READY</text>
  `);
}

function cinematicAtlasSvg(input: RenderScreenshotInput): string {
  const { target, visualSystem, screenPlan } = input;
  const frame = phoneFrame(input, {
    y: Math.round(target.height * 0.34),
    widthRatio: 0.82,
    tilt: screenPlan.device?.tilt ?? 0,
  });
  const headlineStyle = textLayerStyle(input, "headline", { x: 86, y: 232, fontSize: 98, fontWeight: visualSystem.typography.headlineWeight, maxCharsPerLine: 15 });
  const cinematicLines = wrapWords(screenPlan.headline, headlineStyle.maxCharsPerLine);
  const lines = cinematicLines.length > 3 ? wrapWords(screenPlan.headline, Math.max(headlineStyle.maxCharsPerLine, 19)).slice(0, 4) : cinematicLines.slice(0, 3);
  const headlineSize = screenPlan.text?.headline?.fontSize ?? (lines.length > 3 ? 82 : headlineStyle.fontSize);

  return svgShell(input, `
    <defs>${commonDefs(input, frame)}</defs>
    <rect width="100%" height="100%" fill="#09070d" />
    <radialGradient id="cinemaGlow" cx="50%" cy="20%" r="75%"><stop offset="0%" stop-color="#4b2d12"/><stop offset="55%" stop-color="#15111b"/><stop offset="100%" stop-color="#07060a"/></radialGradient>
    <rect width="100%" height="100%" fill="url(#cinemaGlow)" />
    <rect width="100%" height="100%" fill="url(#starField)" opacity="0.28" />
    ${renderCampaignBackdrop(input, { intensity: "dark" })}
    <circle cx="${target.width / 2}" cy="${target.height * 0.56}" r="520" fill="none" stroke="${escapeXml(visualSystem.palette.accent)}" stroke-width="3" opacity="0.26" />
    <circle cx="${target.width / 2}" cy="${target.height * 0.56}" r="390" fill="none" stroke="#fff3d2" stroke-width="1" opacity="0.16" />
    <g transform="translate(86, 120)">
      <text x="0" y="0" font-family="Arial, sans-serif" font-size="26" font-weight="900" fill="${escapeXml(visualSystem.palette.accent)}" letter-spacing="5">CHAPTER ${screenPlan.index}</text>
      <text x="${headlineStyle.x - 86}" y="${headlineStyle.y - 120}" text-anchor="${headlineStyle.align}" font-family="${escapeXml(headlineStyle.fontFamily)}, Arial, sans-serif" font-size="${headlineSize}" font-weight="${headlineStyle.fontWeight}" fill="#fff6df" letter-spacing="-5">
        ${lines.map((line, index) => `<tspan x="${headlineStyle.x - 86}" dy="${index === 0 ? 0 : headlineSize + 4}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="0" y="${152 + lines.length * (headlineSize + 2)}" font-family="Arial, sans-serif" font-size="32" fill="#c9b89f">${escapeXml(screenPlan.subheadline ?? roleCaption(screenPlan.role))}</text>
    </g>
    ${renderPhone(input, frame, { dark: true })}
  `);
}

function classicSvg(input: RenderScreenshotInput): string {
  const { target, visualSystem, screenPlan } = input;
  const frame = phoneFrame(input, { y: visualSystem.layout.deviceY, widthRatio: visualSystem.layout.deviceWidthRatio, tilt: 0 });
  const headlineStyle = textLayerStyle(input, "headline", { x: target.width / 2, y: visualSystem.layout.headlineY, fontSize: 112, fontWeight: visualSystem.typography.headlineWeight, maxCharsPerLine: 18, align: "middle" });
  const headlineLines = wrapWords(screenPlan.headline, headlineStyle.maxCharsPerLine).slice(0, 4);

  return svgShell(input, `
    <defs>${commonDefs(input, frame)}</defs>
    <rect width="100%" height="100%" fill="url(#classicBg)" />
    <circle cx="${target.width - 180}" cy="360" r="180" fill="${escapeXml(visualSystem.palette.accent)}" opacity="0.16" />
    <circle cx="140" cy="${target.height - 420}" r="260" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.10" />
    <text x="${headlineStyle.x}" y="${headlineStyle.y}" text-anchor="${headlineStyle.align}" font-family="${escapeXml(headlineStyle.fontFamily)}, Arial, sans-serif" font-size="${headlineStyle.fontSize}" font-weight="${headlineStyle.fontWeight}" fill="${escapeXml(visualSystem.palette.text)}" letter-spacing="-4">
      ${headlineLines.map((line, index) => `<tspan x="${headlineStyle.x}" dy="${index === 0 ? 0 : headlineStyle.fontSize + 6}">${escapeXml(line)}</tspan>`).join("")}
    </text>
    ${renderPhone(input, frame)}
  `);
}

function svgShell(input: RenderScreenshotInput, body: string): string {
  return `<svg width="${input.target.width}" height="${input.target.height}" viewBox="0 0 ${input.target.width} ${input.target.height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function commonDefs(input: RenderScreenshotInput, frame: Frame): string {
  const screen = screenRect(frame);
  return `
    <linearGradient id="classicBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${escapeXml(input.visualSystem.palette.background)}"/><stop offset="100%" stop-color="#FFFFFF"/></linearGradient>
    <pattern id="paperGrain" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M0 20 H90 M20 0 V90" stroke="#3b2416" stroke-width="1" opacity="0.05"/></pattern>
    <pattern id="starField" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="7" cy="9" r="1" fill="#f7d89a"/><circle cx="31" cy="28" r="1.4" fill="#fff0c0"/></pattern>
    <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="28" stdDeviation="32" flood-color="#24160f" flood-opacity="0.18"/></filter>
    <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/><stop offset="42%" stop-color="#ffffff" stop-opacity="0.08"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
    <clipPath id="screenClip"><rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" /></clipPath>
  `;
}

function renderCampaignBackdrop(input: RenderScreenshotInput, options: { intensity: "strong" | "soft" | "dark" }): string {
  if (!input.campaign || (input.visualSystem.layoutFamily !== "map-route-editorial" && input.visualSystem.motif !== "route-line")) return "";
  const opacityScale = options.intensity === "strong" ? 1 : options.intensity === "soft" ? 0.55 : 0.32;
  return `
    <rect width="100%" height="100%" fill="url(#paperGrain)" opacity="${0.42 * opacityScale}" />
    ${renderPanoramicMapBackground(input, opacityScale, options.intensity === "dark")}
  `;
}

function renderPanoramicMapBackground(input: RenderScreenshotInput, opacityScale = 1, dark = false): string {
  const { target, visualSystem, screenPlan } = input;
  const count = input.campaign?.screenCount ?? 5;
  const totalWidth = target.width * count;
  const offset = (screenPlan.index - 1) * target.width;
  const routeY = target.height * 0.61;
  const path = `M -220 ${routeY} C ${target.width * 0.8} ${target.height * 0.28}, ${target.width * 1.6} ${target.height * 0.88}, ${target.width * 2.3} ${target.height * 0.47} S ${target.width * 3.8} ${target.height * 0.20}, ${target.width * 4.4} ${target.height * 0.68} S ${target.width * 5.1} ${target.height * 0.82}, ${totalWidth + 220} ${target.height * 0.42}`;

  const districts = Array.from({ length: count + 2 }, (_, index) => {
    const x = index * target.width - 180;
    return `<circle cx="${x + 260}" cy="${target.height * (0.24 + (index % 3) * 0.18)}" r="${170 + (index % 2) * 80}" fill="${escapeXml(index % 2 ? visualSystem.palette.primary : visualSystem.palette.accent)}" opacity="${index % 2 ? 0.07 : 0.13}" />`;
  }).join("");

  const streets = Array.from({ length: 36 }, (_, index) => {
    const x = index * 210 - 260;
    const y = 250 + (index % 9) * 260;
    return `<path d="M ${x} ${y} L ${x + 900} ${y + 420}" stroke="${dark ? "#f7d89a" : "#3b2416"}" stroke-width="2" opacity="${0.045 * opacityScale}" />`;
  }).join("");

  return `
    <g transform="translate(${-offset}, 0)">
      <rect x="0" y="0" width="${totalWidth}" height="${target.height}" fill="url(#paperGrain)" opacity="0.34" />
      ${districts}
      ${streets}
      <path d="${path}" fill="none" stroke="${escapeXml(visualSystem.palette.accent)}" stroke-width="18" stroke-linecap="round" stroke-dasharray="34 34" opacity="${0.5 * opacityScale}" />
      <path d="${path}" fill="none" stroke="${dark ? "#fff0c0" : "#fff7e8"}" stroke-width="5" stroke-linecap="round" opacity="${0.65 * opacityScale}" />
      ${Array.from({ length: count }, (_, index) => {
        const cx = index * target.width + target.width * (0.18 + (index % 2) * 0.54);
        const cy = target.height * (0.53 + (index % 3) * 0.08);
        return `<g opacity="${opacityScale}"><circle cx="${cx}" cy="${cy}" r="42" fill="${dark ? "#15111b" : "#fffaf2"}" stroke="${escapeXml(visualSystem.palette.accent)}" stroke-width="8"/><text x="${cx}" y="${cy + 12}" text-anchor="middle" font-family="Arial" font-weight="900" font-size="34" fill="${dark ? "#fff6df" : escapeXml(visualSystem.palette.text)}">${index + 1}</text></g>`;
      }).join("")}
    </g>
  `;
}

function renderPhone(input: RenderScreenshotInput, frame: Frame, options: { dark?: boolean } = {}): string {
  const screen = screenRect(frame);
  const image = input.sourceScreenshot
    ? `<image x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" href="data:${input.sourceScreenshot.contentType};base64,${Buffer.from(input.sourceScreenshot.bytes).toString("base64")}" preserveAspectRatio="xMidYMid slice" clip-path="url(#screenClip)" />`
    : buildPlaceholderUi({ screenX: screen.x, screenY: screen.y, screenWidth: screen.width, visualSystem: input.visualSystem });

  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const hardwareFill = options.dark ? "#050407" : "#111111";
  const sideButtonColor = options.dark ? "#25222c" : "#1f1f1f";
  const notchWidth = Math.round(frame.width * 0.24);
  const notchHeight = Math.max(24, Math.round(frame.width * 0.035));

  return `
    <g transform="rotate(${frame.tilt} ${cx} ${cy})" filter="url(#softShadow)">
      <rect x="${frame.x - 8}" y="${frame.y + frame.height * 0.18}" width="12" height="150" rx="6" fill="${sideButtonColor}" />
      <rect x="${frame.x + frame.width - 4}" y="${frame.y + frame.height * 0.24}" width="12" height="210" rx="6" fill="${sideButtonColor}" />
      <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="${frame.radius + 24}" fill="${hardwareFill}" />
      <rect x="${frame.x + 10}" y="${frame.y + 10}" width="${frame.width - 20}" height="${frame.height - 20}" rx="${frame.radius + 14}" fill="#1b1a19" opacity="0.95" />
      <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" fill="#FBFAF7" />
      ${image}
      <rect x="${screen.x}" y="${screen.y}" width="${screen.width}" height="${screen.height}" rx="${screen.radius}" fill="url(#glassSheen)" opacity="0.22" clip-path="url(#screenClip)" />
      <rect x="${frame.x + (frame.width - notchWidth) / 2}" y="${frame.y + 18}" width="${notchWidth}" height="${notchHeight}" rx="${notchHeight / 2}" fill="${hardwareFill}" opacity="0.96" />
      <rect x="${frame.x + frame.width * 0.39}" y="${frame.y + frame.height - 44}" width="${frame.width * 0.22}" height="8" rx="4" fill="#ffffff" opacity="0.7" />
    </g>
  `;
}

function textLayerStyle(
  input: RenderScreenshotInput,
  layer: "headline" | "subheadline",
  defaults: { x: number; y: number; fontSize: number; fontWeight: number; maxCharsPerLine: number; fontFamily?: string; align?: "start" | "middle" | "end" },
): { x: number; y: number; fontSize: number; fontWeight: number; maxCharsPerLine: number; fontFamily: string; align: "start" | "middle" | "end" } {
  const override = input.screenPlan.text?.[layer];
  return {
    x: override?.x === undefined ? defaults.x : Math.round(input.target.width * override.x),
    y: override?.y === undefined ? defaults.y : Math.round(input.target.height * override.y),
    fontSize: override?.fontSize ?? defaults.fontSize,
    fontWeight: override?.fontWeight ?? defaults.fontWeight,
    maxCharsPerLine: override?.maxCharsPerLine ?? defaults.maxCharsPerLine,
    fontFamily: override?.fontFamily ?? defaults.fontFamily ?? input.visualSystem.typography.headlineFamily,
    align: override?.align ?? defaults.align ?? "start",
  };
}

function proofCardFrame(input: RenderScreenshotInput, frame: Frame): { x: number; y: number; width: number; height: number } {
  if (!input.secondarySourceScreenshot) {
    return { x: 90, y: input.target.height - 510, width: input.target.width - 180, height: 320 };
  }

  return {
    x: Math.round(Math.min(frame.x + frame.width * 0.38, input.target.width - 760 - 70)),
    y: Math.round(input.target.height - 430),
    width: 760,
    height: 280,
  };
}

function renderSecondaryMiniPhone(input: RenderScreenshotInput, frame: Frame): string {
  if (!input.secondarySourceScreenshot) return "";
  const width = Math.round(frame.width * 0.42);
  const height = Math.round(width * 2.05);
  const x = Math.max(36, frame.x - width * 0.22);
  const y = frame.y + frame.height * 0.48;
  const miniFrame: Frame = { x, y, width, height, radius: 58, tilt: -7 };
  const { secondarySourceScreenshot: _secondarySourceScreenshot, ...inputWithoutSecondary } = input;
  return renderPhone({ ...inputWithoutSecondary, sourceScreenshot: input.secondarySourceScreenshot }, miniFrame);
}

function renderCalloutBadge(input: RenderScreenshotInput, frame: Frame): string {
  const callout = input.screenPlan.callouts?.[0];
  if (!callout) return "";
  const label = callout.label;
  const labelLines = wrapWords(label, 18).slice(0, 2);
  const width = 410;
  const height = 132;
  const desiredX = frame.x + frame.width * (callout?.x ?? 0.62) - width * 0.5;
  const desiredY = frame.y + frame.height * (callout?.y ?? 0.22) - height * 0.5;
  const x = clamp(desiredX, 54, input.target.width - width - 54);
  const y = clamp(desiredY, 120, input.target.height - height - 120);
  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${width}" height="132" rx="40" fill="#fffaf2" filter="url(#softShadow)" />
      <circle cx="58" cy="66" r="30" fill="${escapeXml(input.visualSystem.palette.accent)}" />
      <text x="108" y="48" font-family="Arial, sans-serif" font-size="25" font-weight="900" fill="${escapeXml(input.visualSystem.palette.text)}">
        ${labelLines.map((line, index) => `<tspan x="108" dy="${index === 0 ? 0 : 30}">${escapeXml(line)}</tspan>`).join("")}
      </text>
      <text x="108" y="104" font-family="Arial, sans-serif" font-size="20" fill="#7a6657">From the real UI</text>
    </g>
  `;
}

function phoneFrame(input: RenderScreenshotInput, params: { y: number; widthRatio: number; tilt: number }): Frame {
  const width = Math.round(input.target.width * (input.screenPlan.device?.scale ?? params.widthRatio));
  const height = Math.round(width * 2.05);
  return {
    x: Math.round((input.target.width - width) / 2),
    y: params.y,
    width,
    height,
    radius: 88,
    tilt: params.tilt,
  };
}

function screenRect(frame: Frame) {
  return {
    x: frame.x + 24,
    y: frame.y + 24,
    width: frame.width - 48,
    height: frame.height - 48,
    radius: frame.radius - 24,
  };
}

function buildPlaceholderUi(params: {
  screenX: number;
  screenY: number;
  screenWidth: number;
  visualSystem: VisualSystem;
}): string {
  const { screenX, screenY, screenWidth, visualSystem } = params;
  return `
    <rect x="${screenX + 48}" y="${screenY + 166}" width="${screenWidth - 96}" height="96" rx="32" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.14" />
    <rect x="${screenX + 48}" y="${screenY + 316}" width="${screenWidth - 96}" height="360" rx="44" fill="${escapeXml(visualSystem.palette.accent)}" opacity="0.22" />
    <rect x="${screenX + 48}" y="${screenY + 736}" width="${screenWidth - 96}" height="120" rx="36" fill="${escapeXml(visualSystem.palette.primary)}" opacity="0.12" />
    <rect x="${screenX + 48}" y="${screenY + 906}" width="${screenWidth - 192}" height="56" rx="28" fill="${escapeXml(visualSystem.palette.text)}" opacity="0.18" />`;
}

function roleCaption(role: string): string {
  if (role.includes("hook")) return "From a book to a route you can walk.";
  if (role.includes("search")) return "Find cities, books, and authors in seconds.";
  if (role.includes("map")) return "Follow story places through real streets.";
  if (role.includes("save")) return "Keep your literary walks for later.";
  return "A coherent screenshot campaign for your app.";
}

function proofTitle(role: string): string {
  if (role.includes("hook")) return "Built for readers";
  if (role.includes("search")) return "Fast discovery";
  if (role.includes("map")) return "Map-first route";
  if (role.includes("save")) return "Ready to revisit";
  if (role.includes("feature")) return "Route detail";
  if (role.includes("unique")) return "Personalized journey";
  return "Clear value";
}

function wrapWords(value: string, maxCharsPerLine: number): string[] {
  const lines: string[] = [];
  let currentLine = "";

  for (const word of value.split(/\s+/)) {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "screen";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
