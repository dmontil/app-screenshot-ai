import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

export async function writeLiteraryTripSourceScreenshots(exampleDir: string) {
  const screenshotsDir = path.join(exampleDir, "input", "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  await Promise.all([
    writePhoneSvgIfMissing(path.join(screenshotsDir, "home.png"), homeScreenSvg()),
    writePhoneSvgIfMissing(path.join(screenshotsDir, "search.png"), searchScreenSvg()),
    writePhoneSvgIfMissing(path.join(screenshotsDir, "map.png"), mapScreenSvg()),
  ]);
}

async function writePhoneSvgIfMissing(filePath: string, svg: string) {
  if (process.env.REFRESH_LITERARYTRIP_FIXTURES !== "1" && await exists(filePath)) return;
  await writeFile(filePath, await sharp(Buffer.from(svg)).png().toBuffer());
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function phoneShell(body: string, background = "#F8F1E6") {
  return `<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg">
    <rect width="390" height="844" rx="0" fill="${background}" />
    <text x="32" y="34" font-family="Arial" font-size="13" font-weight="700" fill="#24160F">9:41</text>
    <rect x="318" y="24" width="30" height="12" rx="4" fill="none" stroke="#24160F" stroke-width="1.5" opacity="0.55" />
    <rect x="350" y="28" width="3" height="5" rx="1" fill="#24160F" opacity="0.55" />
    <rect x="322" y="27" width="21" height="6" rx="2" fill="#24160F" opacity="0.55" />
    ${body}
  </svg>`;
}

function homeScreenSvg() {
  return phoneShell(`
    <text x="28" y="88" font-family="Arial" font-size="31" font-weight="900" fill="#24160F">Find a book</text>
    <text x="28" y="114" font-family="Arial" font-size="14" font-weight="700" fill="#8A6A45">then walk its city</text>
    <rect x="28" y="138" width="334" height="52" rx="22" fill="#FFFFFF" />
    <text x="54" y="170" font-family="Arial" font-size="15" fill="#A68A6A">Search book, author or city</text>
    <circle cx="328" cy="164" r="14" fill="#D99A32" opacity="0.22" />
    <path d="M324 160 L333 169 M333 160 L324 169" stroke="#7C4A1D" stroke-width="2" opacity="0.7" />

    <text x="28" y="236" font-family="Arial" font-size="18" font-weight="900" fill="#24160F">Featured walks</text>
    <g transform="translate(28 258)">
      <rect width="154" height="202" rx="28" fill="#3B2416" />
      <rect x="18" y="18" width="118" height="82" rx="18" fill="#D99A32" opacity="0.90" />
      <path d="M34 84 C74 28, 112 50, 128 24" fill="none" stroke="#FFF4DD" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 8" />
      <text x="18" y="130" font-family="Arial" font-size="17" font-weight="900" fill="#FFF4DD">Hemingway’s</text>
      <text x="18" y="151" font-family="Arial" font-size="17" font-weight="900" fill="#FFF4DD">Paris</text>
      <text x="18" y="180" font-family="Arial" font-size="12" fill="#E8D7BD">8 stops • 42 min</text>
    </g>
    <g transform="translate(202 258)">
      <rect width="154" height="202" rx="28" fill="#FFF9EE" stroke="#E7D8BE" />
      <rect x="18" y="18" width="118" height="82" rx="18" fill="#9BB88F" />
      <path d="M28 82 C68 40, 96 56, 128 32" fill="none" stroke="#3E4D2C" stroke-width="5" stroke-linecap="round" stroke-dasharray="7 7" />
      <text x="18" y="130" font-family="Arial" font-size="17" font-weight="900" fill="#24160F">Ulysses</text>
      <text x="18" y="151" font-family="Arial" font-size="17" font-weight="900" fill="#24160F">Dublin</text>
      <text x="18" y="180" font-family="Arial" font-size="12" fill="#8A6A45">12 stops • 65 min</text>
    </g>

    <rect x="28" y="500" width="334" height="118" rx="28" fill="#FFFFFF" />
    <circle cx="70" cy="558" r="28" fill="#E8D7BD" />
    <text x="112" y="546" font-family="Arial" font-size="17" font-weight="900" fill="#24160F">Near you today</text>
    <text x="112" y="572" font-family="Arial" font-size="13" fill="#8A6A45">3 literary places within 1 km</text>
    <rect x="112" y="588" width="88" height="14" rx="7" fill="#D99A32" opacity="0.32" />

    <rect x="28" y="650" width="334" height="92" rx="28" fill="#EFE2CE" />
    <text x="52" y="688" font-family="Arial" font-size="18" font-weight="900" fill="#24160F">Continue your route</text>
    <text x="52" y="716" font-family="Arial" font-size="13" fill="#7C4A1D">Shakespeare’s London • Stop 4</text>
  `);
}

function searchScreenSvg() {
  return phoneShell(`
    <text x="28" y="88" font-family="Arial" font-size="31" font-weight="900" fill="#24160F">Paris routes</text>
    <rect x="28" y="126" width="334" height="52" rx="22" fill="#FFFFFF" />
    <text x="54" y="158" font-family="Arial" font-size="15" fill="#7C4A1D">Hemingway</text>
    <g transform="translate(28 202)">
      <rect width="74" height="34" rx="17" fill="#3B2416"/><text x="37" y="23" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#FFF4DD">Books</text>
      <rect x="86" width="74" height="34" rx="17" fill="#FFFFFF"/><text x="123" y="23" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#7C4A1D">Cities</text>
      <rect x="172" width="88" height="34" rx="17" fill="#FFFFFF"/><text x="216" y="23" text-anchor="middle" font-family="Arial" font-size="12" font-weight="900" fill="#7C4A1D">Authors</text>
    </g>

    ${routeCard(28, 270, "A Moveable Feast", "Cafés, streets and bookshops", "#D99A32")}
    ${routeCard(28, 424, "Notre-Dame Stories", "Victor Hugo landmarks", "#7C4A1D")}
    ${routeCard(28, 578, "Lost Generation", "Jazz-age Paris in 9 stops", "#9BB88F")}
  `, "#EFE7D7");
}

function routeCard(x: number, y: number, title: string, subtitle: string, color: string) {
  return `<g transform="translate(${x} ${y})">
    <rect width="334" height="126" rx="30" fill="#FFFFFF" />
    <rect x="18" y="18" width="82" height="90" rx="22" fill="${color}" opacity="0.88" />
    <path d="M36 86 C58 38, 78 68, 94 30" fill="none" stroke="#FFF4DD" stroke-width="4" stroke-linecap="round" stroke-dasharray="7 7" />
    <text x="120" y="47" font-family="Arial" font-size="17" font-weight="900" fill="#24160F">${title}</text>
    <text x="120" y="73" font-family="Arial" font-size="13" fill="#8A6A45">${subtitle}</text>
    <rect x="120" y="88" width="66" height="20" rx="10" fill="#F4E6CF" />
    <text x="153" y="102" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#7C4A1D">OPEN</text>
  </g>`;
}

function mapScreenSvg() {
  return phoneShell(`
    <rect x="0" y="52" width="390" height="792" fill="#E7EFE7" />
    <path d="M-20 190 C70 150, 110 230, 202 182 C280 142, 314 170, 424 130" fill="none" stroke="#C9D9C2" stroke-width="36" />
    <path d="M-12 438 C72 372, 120 456, 204 414 C290 372, 326 424, 412 388" fill="none" stroke="#C9D9C2" stroke-width="30" />
    <path d="M42 650 C120 610, 138 690, 226 640 C300 598, 338 634, 420 604" fill="none" stroke="#C9D9C2" stroke-width="32" />
    <path d="M66 202 C116 298, 166 330, 206 398 C252 476, 220 566, 294 646" fill="none" stroke="#D99A32" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 12" />
    ${pin(66, 202, "1")}${pin(154, 326, "2")}${pin(206, 398, "3")}${pin(226, 540, "4")}${pin(294, 646, "5")}

    <rect x="24" y="78" width="342" height="64" rx="28" fill="#FFFFFF" opacity="0.96" />
    <text x="54" y="116" font-family="Arial" font-size="18" font-weight="900" fill="#24160F">Hemingway’s Paris</text>
    <text x="260" y="116" font-family="Arial" font-size="13" font-weight="900" fill="#7C4A1D">8 STOPS</text>

    <rect x="24" y="662" width="342" height="136" rx="34" fill="#FFFFFF" />
    <rect x="46" y="688" width="72" height="72" rx="22" fill="#3B2416" />
    <text x="138" y="708" font-family="Arial" font-size="20" font-weight="900" fill="#24160F">Café de Flore</text>
    <text x="138" y="734" font-family="Arial" font-size="13" fill="#8A6A45">Stop 3 • from A Moveable Feast</text>
    <rect x="138" y="754" width="96" height="24" rx="12" fill="#D99A32" opacity="0.24" />
    <text x="186" y="771" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#7C4A1D">NAVIGATE</text>
  `, "#E7EFE7");
}

function pin(x: number, y: number, label: string) {
  return `<g transform="translate(${x} ${y})"><circle r="18" fill="#3B2416"/><circle r="10" fill="#D99A32"/><text y="5" text-anchor="middle" font-family="Arial" font-size="10" font-weight="900" fill="#FFF4DD">${label}</text></g>`;
}
