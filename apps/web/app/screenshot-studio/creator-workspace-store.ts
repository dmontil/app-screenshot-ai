import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CreatorWorkspaceStoreOptions = {
  rootDir: string;
};

export type CreatorAppRecord = {
  id: string;
  name: string;
  category: string;
  audience: string;
  valueProposition: string;
  websiteUrl?: string;
  brandColors?: string;
  createdAt: string;
  updatedAt: string;
  packs: CreatorPackRecord[];
};

export type CreateCreatorAppParams = {
  name: string;
  category: string;
  audience: string;
  valueProposition: string;
  websiteUrl?: string;
  brandColors?: string;
};

export type CreatorScreenRecord = {
  index: number;
  sceneType: string;
  headline: string;
  subheadline: string;
  status: "Draft" | "Approved";
  approvedAt?: string;
};

export type CreatorLocaleRecord = {
  code: string;
  status: string;
  updatedAt: string;
  screens: CreatorScreenRecord[];
};

export type CreatorPackGenerationArtifact = {
  generatedAt: string;
  localProjectPath?: string;
  images: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>;
  trace: Array<{ at: string; step: string; detail?: string }>;
};

export type CreatorPackRecord = {
  id: string;
  name: string;
  platform: string;
  size: string;
  screenCount: number;
  locales: CreatorLocaleRecord[];
  latestGeneration?: CreatorPackGenerationArtifact;
  createdAt: string;
  updatedAt: string;
};

export type CreateCreatorPackParams = {
  name: string;
  platform: string;
  size: string;
  screenCount: number;
  locale: string;
};

export class CreatorWorkspaceStore {
  private readonly rootDir: string;

  constructor(options: CreatorWorkspaceStoreOptions) {
    this.rootDir = options.rootDir;
  }

  async listApps(): Promise<CreatorAppRecord[]> {
    await mkdir(this.appsDir(), { recursive: true });
    const entries = await readdir(this.appsDir(), { withFileTypes: true });
    const apps = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => this.readApp(entry.name)),
    );
    return apps.filter((app): app is CreatorAppRecord => Boolean(app)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createApp(params: CreateCreatorAppParams): Promise<CreatorAppRecord> {
    const now = new Date().toISOString();
    const id = uniqueId(params.name || "app");
    const app: CreatorAppRecord = {
      id,
      name: params.name || "Untitled app",
      category: params.category,
      audience: params.audience,
      valueProposition: params.valueProposition,
      ...(params.websiteUrl ? { websiteUrl: params.websiteUrl } : {}),
      ...(params.brandColors ? { brandColors: params.brandColors } : {}),
      createdAt: now,
      updatedAt: now,
      packs: [],
    };
    await this.writeApp(app);
    return app;
  }

  async createPack(appId: string, params: CreateCreatorPackParams): Promise<CreatorPackRecord> {
    const app = await this.readApp(appId);
    if (!app) throw new Error(`Creator app '${appId}' was not found`);
    const now = new Date().toISOString();
    const pack: CreatorPackRecord = {
      id: uniqueId(params.name || "pack"),
      name: params.name || "Launch pack",
      platform: params.platform,
      size: params.size,
      screenCount: params.screenCount,
      locales: [{ code: params.locale || "en-US", status: "Draft", updatedAt: now, screens: defaultScreens(params.screenCount) }],
      createdAt: now,
      updatedAt: now,
    };
    await this.writeApp({ ...app, updatedAt: now, packs: [pack, ...app.packs] });
    return pack;
  }

  async updatePackLocaleScreens(appId: string, packId: string, localeCode: string, screens: CreatorScreenRecord[]): Promise<CreatorPackRecord> {
    const { app, pack } = await this.findPack(appId, packId);
    const now = new Date().toISOString();
    const localeIndex = pack.locales.findIndex((locale) => locale.code === localeCode);
    if (localeIndex === -1) throw new Error(`Locale '${localeCode}' was not found`);
    const updatedPack: CreatorPackRecord = {
      ...pack,
      updatedAt: now,
      locales: pack.locales.map((locale, index) => index === localeIndex ? { ...locale, status: "Draft", updatedAt: now, screens } : locale),
    };
    await this.replacePack(app, updatedPack, now);
    return updatedPack;
  }

  async approvePackLocaleScreen(appId: string, packId: string, localeCode: string, screenIndex: number, approvedAt = new Date().toISOString()): Promise<CreatorPackRecord> {
    const { app, pack } = await this.findPack(appId, packId);
    const now = new Date().toISOString();
    const locale = pack.locales.find((candidate) => candidate.code === localeCode);
    if (!locale) throw new Error(`Locale '${localeCode}' was not found`);
    if (!locale.screens.some((screen) => screen.index === screenIndex)) throw new Error(`Screen ${screenIndex} was not found`);
    const updatedPack: CreatorPackRecord = {
      ...pack,
      updatedAt: now,
      locales: pack.locales.map((candidate) => candidate.code === localeCode ? {
        ...candidate,
        updatedAt: now,
        screens: candidate.screens.map((screen) => screen.index === screenIndex ? { ...screen, status: "Approved", approvedAt } : screen),
      } : candidate),
    };
    await this.replacePack(app, updatedPack, now);
    return updatedPack;
  }

  async savePackGenerationArtifacts(appId: string, packId: string, artifacts: CreatorPackGenerationArtifact): Promise<CreatorPackRecord> {
    const { app, pack } = await this.findPack(appId, packId);
    const now = new Date().toISOString();
    const updatedPack: CreatorPackRecord = {
      ...pack,
      updatedAt: now,
      latestGeneration: { ...artifacts, generatedAt: artifacts.generatedAt || now, images: artifacts.images ?? [], trace: artifacts.trace ?? [] },
    };
    await this.replacePack(app, updatedPack, now);
    return updatedPack;
  }

  private async findPack(appId: string, packId: string): Promise<{ app: CreatorAppRecord; pack: CreatorPackRecord }> {
    const app = await this.readApp(appId);
    if (!app) throw new Error(`Creator app '${appId}' was not found`);
    const pack = app.packs.find((candidate) => candidate.id === packId);
    if (!pack) throw new Error(`Creator pack '${packId}' was not found`);
    return { app, pack };
  }

  private async replacePack(app: CreatorAppRecord, updatedPack: CreatorPackRecord, updatedAt: string): Promise<void> {
    await this.writeApp({
      ...app,
      updatedAt,
      packs: app.packs.map((pack) => pack.id === updatedPack.id ? updatedPack : pack),
    });
  }

  private async readApp(appId: string): Promise<CreatorAppRecord | undefined> {
    try {
      const app = JSON.parse(await readFile(path.join(this.appDir(appId), "app.json"), "utf8")) as CreatorAppRecord;
      return { ...app, packs: [...(app.packs ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return undefined;
      throw error;
    }
  }

  private async writeApp(app: CreatorAppRecord): Promise<void> {
    await mkdir(this.appDir(app.id), { recursive: true });
    await writeFile(path.join(this.appDir(app.id), "app.json"), `${JSON.stringify(app, null, 2)}\n`);
  }

  private appsDir(): string {
    return path.join(this.rootDir, "apps");
  }

  private appDir(appId: string): string {
    return path.join(this.appsDir(), safeSegment(appId));
  }
}

function defaultScreens(screenCount: number): CreatorScreenRecord[] {
  return Array.from({ length: screenCount }, (_, index) => ({
    index: index + 1,
    sceneType: index === 0 ? "cover" : "feature",
    headline: "",
    subheadline: "",
    status: "Draft",
  }));
}

function uniqueId(value: string): string {
  return `${safeSegment(value)}-${Date.now().toString(36)}`;
}

function safeSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "item";
}
