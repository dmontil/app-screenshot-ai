import path from "node:path";

import { CreatorWorkspaceStore } from "../../screenshot-studio/creator-workspace-store";

export const runtime = "nodejs";

export async function GET() {
  const store = workspaceStore();
  const apps = await store.listApps();
  return Response.json({ apps });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; appId?: string; packId?: string; localeCode?: string; screenIndex?: number; app?: any; pack?: any; screens?: any[]; approvedAt?: string; generation?: any };
    const store = workspaceStore();

    if (body.action === "create-app") {
      const app = await store.createApp({
        name: readString(body.app?.name),
        category: readString(body.app?.category),
        audience: readString(body.app?.audience),
        valueProposition: readString(body.app?.valueProposition),
        websiteUrl: readString(body.app?.websiteUrl),
        brandColors: readString(body.app?.brandColors),
      });
      return Response.json({ app });
    }

    if (body.action === "create-pack") {
      if (!body.appId) throw new Error("appId is required");
      const pack = await store.createPack(body.appId, {
        name: readString(body.pack?.name),
        platform: readString(body.pack?.platform) || "iphone",
        size: readString(body.pack?.size) || "1320×2868",
        screenCount: Number.isFinite(Number(body.pack?.screenCount)) ? Number(body.pack.screenCount) : 5,
        locale: readString(body.pack?.locale) || "en-US",
      });
      const apps = await store.listApps();
      return Response.json({ pack, apps });
    }

    if (body.action === "update-locale-screens") {
      if (!body.appId) throw new Error("appId is required");
      if (!body.packId) throw new Error("packId is required");
      const pack = await store.updatePackLocaleScreens(body.appId, body.packId, readString(body.localeCode) || "en-US", Array.isArray(body.screens) ? body.screens.map((screen, index) => ({
        index: Number.isFinite(Number(screen?.index)) ? Number(screen.index) : index + 1,
        sceneType: readString(screen?.sceneType) || (index === 0 ? "cover" : "feature"),
        headline: readString(screen?.headline),
        subheadline: readString(screen?.subheadline),
        status: screen?.status === "Approved" ? "Approved" : "Draft",
        ...(readString(screen?.approvedAt) ? { approvedAt: readString(screen.approvedAt) } : {}),
      })) : []);
      const apps = await store.listApps();
      return Response.json({ pack, apps });
    }

    if (body.action === "approve-screen") {
      if (!body.appId) throw new Error("appId is required");
      if (!body.packId) throw new Error("packId is required");
      const pack = await store.approvePackLocaleScreen(body.appId, body.packId, readString(body.localeCode) || "en-US", Number(body.screenIndex), readString(body.approvedAt) || undefined);
      const apps = await store.listApps();
      return Response.json({ pack, apps });
    }

    if (body.action === "save-generation-artifacts") {
      if (!body.appId) throw new Error("appId is required");
      if (!body.packId) throw new Error("packId is required");
      const pack = await store.savePackGenerationArtifacts(body.appId, body.packId, {
        generatedAt: readString(body.generation?.generatedAt) || new Date().toISOString(),
        ...(readString(body.generation?.localProjectPath) ? { localProjectPath: readString(body.generation.localProjectPath) } : {}),
        images: Array.isArray(body.generation?.images) ? body.generation.images.map((image: any) => ({
          index: Number(image?.index),
          id: readString(image?.id),
          fileName: readString(image?.fileName),
          dataUrl: readString(image?.dataUrl),
          ...(readString(image?.prompt) ? { prompt: readString(image.prompt) } : {}),
          ...(image?.scenePlan ? { scenePlan: image.scenePlan } : {}),
        })) : [],
        trace: Array.isArray(body.generation?.trace) ? body.generation.trace.map((entry: any) => ({
          at: readString(entry?.at),
          step: readString(entry?.step),
          ...(readString(entry?.detail) ? { detail: readString(entry.detail) } : {}),
        })) : [],
      });
      const apps = await store.listApps();
      return Response.json({ pack, apps });
    }

    throw new Error("Unsupported creator workspace action");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 400 });
  }
}

function workspaceStore() {
  return new CreatorWorkspaceStore({ rootDir: path.join(appRoot(), ".local", "creator-workspace") });
}

function appRoot(): string {
  return process.cwd().endsWith(path.join("apps", "web")) ? path.join(process.cwd(), "..", "..") : process.cwd();
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
