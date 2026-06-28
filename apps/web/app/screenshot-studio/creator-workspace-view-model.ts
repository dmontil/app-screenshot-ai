export type CreatorView = "home" | "create-app" | "app-dashboard" | "pack" | "settings";

export type CreatorPackLocaleScreen = {
  index: number;
  sceneType: string;
  headline: string;
  subheadline: string;
  status: "Draft" | "Approved";
  approvedAt?: string;
};

export type CreatorPackLocale = {
  code: string;
  status: string;
  screens?: CreatorPackLocaleScreen[];
};

export type CreatorPack = {
  id: string;
  name: string;
  platform: string;
  size: string;
  screenCount: number;
  locales: CreatorPackLocale[];
  latestGeneration?: {
    generatedAt: string;
    localProjectPath?: string;
    images: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>;
    trace: Array<{ at: string; step: string; detail?: string }>;
  };
  updatedAt: string;
};

export type CreatorApp = {
  id: string;
  name: string;
  category: string;
  audience: string;
  valueProposition: string;
  websiteUrl?: string;
  brandColors?: string;
  updatedAt: string;
  packs: CreatorPack[];
};

export type CreatorSettings = {
  falKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  defaultPlatform: string;
  defaultPromptVersion: "v1" | "v2" | "v3" | "v4";
};

export function packSummary(pack: CreatorPack): { primary: string; secondary: string } {
  const approved = pack.locales.reduce((total, locale) => total + (locale.screens?.filter((screen) => screen.status === "Approved").length ?? 0), 0);
  const totalScreens = Math.max(1, pack.screenCount * Math.max(1, pack.locales.length));
  const translated = pack.locales.filter((locale) => locale.code !== "en-US" && locale.status !== "Not translated").length;
  const localeSummary = pack.locales.map((locale) => `${locale.code} ${locale.status.toLowerCase()}`).join(" · ");
  return {
    primary: `${pack.platform} · ${pack.screenCount} screens · ${approved}/${totalScreens} approved`,
    secondary: `${translated}/${Math.max(0, pack.locales.length - 1)} translated · ${localeSummary || "No locales yet"}`,
  };
}

export function localeBadgeClass(locale: CreatorPackLocale): string {
  const normalized = locale.status.toLowerCase();
  if (normalized.includes("translated") || normalized.includes("approved")) return "locale-badge done";
  if (normalized.includes("needs")) return "locale-badge warning";
  return "locale-badge";
}
