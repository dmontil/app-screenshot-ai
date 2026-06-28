export type PackScreenDraft = {
  index: number;
  sceneType: "cover" | "feature";
  headline: string;
  subheadline: string;
};

export type PackGeneratedImage = {
  index: number;
  id: string;
  fileName: string;
  dataUrl: string;
};

export type PackScreenApproval = {
  index: number;
  approvedAt: string;
};

export type PackZipEntry = {
  filename: string;
  base64: string;
};

export function approvePackScreen(
  approvals: PackScreenApproval[],
  images: PackGeneratedImage[],
  screenIndex: number,
  approvedAt = new Date().toISOString(),
): PackScreenApproval[] {
  if (!images.some((image) => image.index === screenIndex && image.dataUrl)) {
    throw new Error(`Screen ${screenIndex} has no generated image to approve`);
  }

  return [
    ...approvals.filter((approval) => approval.index !== screenIndex),
    { index: screenIndex, approvedAt },
  ].sort((a, b) => a.index - b.index);
}

export function translatePackCopy(screens: PackScreenDraft[], targetLocale: string): PackScreenDraft[] {
  return screens.map((screen) => ({
    ...screen,
    headline: translateText(screen.headline, targetLocale),
    subheadline: translateText(screen.subheadline, targetLocale),
  }));
}

export function buildPackZipEntries(params: {
  appName: string;
  packName: string;
  platform: string;
  locale: string;
  images: PackGeneratedImage[];
  approvals: PackScreenApproval[];
}): PackZipEntry[] {
  const approvedIndexes = new Set(params.approvals.map((approval) => approval.index));
  const root = `${slug(params.appName)}-${slug(params.packName)}/${slug(params.platform)}/${params.locale}`;

  return params.images
    .filter((image) => approvedIndexes.has(image.index) && image.dataUrl)
    .sort((a, b) => a.index - b.index)
    .map((image) => ({
      filename: `${root}/${String(image.index).padStart(2, "0")}-${slug(image.id)}.png`,
      base64: dataUrlToBase64(image.dataUrl),
    }));
}

function translateText(value: string, targetLocale: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed} (${targetLocale})`;
}

function dataUrlToBase64(dataUrl: string): string {
  const marker = ";base64,";
  const index = dataUrl.indexOf(marker);
  return index === -1 ? dataUrl : dataUrl.slice(index + marker.length);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}
