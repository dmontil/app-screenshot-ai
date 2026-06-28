import type { GenerateResponse, LandingPageAnalysis, ProjectSummary } from "./types";

export type CreatorWorkspaceApp = {
  id: string;
  name: string;
  category: string;
  audience: string;
  valueProposition: string;
  websiteUrl?: string;
  brandColors?: string;
  createdAt: string;
  updatedAt: string;
  packs: CreatorWorkspacePack[];
};

export type CreatorWorkspaceScreen = {
  index: number;
  sceneType: string;
  headline: string;
  subheadline: string;
  status: "Draft" | "Approved";
  approvedAt?: string;
};

export type CreatorWorkspaceLocale = {
  code: string;
  status: string;
  updatedAt: string;
  screens: CreatorWorkspaceScreen[];
};

export type CreatorWorkspaceGeneration = {
  generatedAt: string;
  localProjectPath?: string;
  images: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>;
  trace: Array<{ at: string; step: string; detail?: string }>;
};

export type CreatorWorkspacePack = {
  id: string;
  name: string;
  platform: string;
  size: string;
  screenCount: number;
  locales: CreatorWorkspaceLocale[];
  latestGeneration?: CreatorWorkspaceGeneration;
  createdAt: string;
  updatedAt: string;
};

export async function fetchCreatorWorkspace() {
  const response = await fetch("/api/creator-workspace");
  const payload = await response.json() as { apps?: CreatorWorkspaceApp[]; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not load creator workspace");
  return payload.apps ?? [];
}

export async function createCreatorWorkspaceApp(app: { name: string; category: string; audience: string; valueProposition: string; websiteUrl?: string; brandColors?: string }) {
  const response = await fetch("/api/creator-workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create-app", app }),
  });
  const payload = await response.json() as { app?: CreatorWorkspaceApp; error?: string };
  if (!response.ok || !payload.app) throw new Error(payload.error ?? "Could not create app");
  return payload.app;
}

export async function createCreatorWorkspacePack(appId: string, pack: { name: string; platform: string; size: string; screenCount: number; locale: string }) {
  const response = await fetch("/api/creator-workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "create-pack", appId, pack }),
  });
  const payload = await response.json() as { pack?: CreatorWorkspacePack; apps?: CreatorWorkspaceApp[]; error?: string };
  if (!response.ok || !payload.pack) throw new Error(payload.error ?? "Could not create pack");
  return payload;
}

export async function updateCreatorWorkspaceLocaleScreens(appId: string, packId: string, localeCode: string, screens: CreatorWorkspaceScreen[]) {
  const response = await fetch("/api/creator-workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update-locale-screens", appId, packId, localeCode, screens }),
  });
  const payload = await response.json() as { pack?: CreatorWorkspacePack; apps?: CreatorWorkspaceApp[]; error?: string };
  if (!response.ok || !payload.pack) throw new Error(payload.error ?? "Could not save screens");
  return payload;
}

export async function approveCreatorWorkspaceScreen(appId: string, packId: string, localeCode: string, screenIndex: number) {
  const response = await fetch("/api/creator-workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approve-screen", appId, packId, localeCode, screenIndex }),
  });
  const payload = await response.json() as { pack?: CreatorWorkspacePack; apps?: CreatorWorkspaceApp[]; error?: string };
  if (!response.ok || !payload.pack) throw new Error(payload.error ?? "Could not approve screen");
  return payload;
}

export async function saveCreatorWorkspaceGenerationArtifacts(appId: string, packId: string, generation: CreatorWorkspaceGeneration) {
  const response = await fetch("/api/creator-workspace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "save-generation-artifacts", appId, packId, generation }),
  });
  const payload = await response.json() as { pack?: CreatorWorkspacePack; apps?: CreatorWorkspaceApp[]; error?: string };
  if (!response.ok || !payload.pack) throw new Error(payload.error ?? "Could not save generation artifacts");
  return payload;
}

export async function fetchProviderSettings() {
  const response = await fetch("/api/provider-settings");
  return (await response.json()) as { provider: string; model: string; geminiApiKey: string; openaiApiKey: string };
}

export async function fetchProjects() {
  const response = await fetch("/api/projects");
  const payload = (await response.json()) as { projects: ProjectSummary[] };
  return payload.projects;
}

export async function fetchProjectGeneration(projectId: string, generationId: string) {
  const response = await fetch(`/api/project-generation?projectId=${encodeURIComponent(projectId)}&generationId=${encodeURIComponent(generationId)}`);
  const payload = (await response.json()) as GenerateResponse | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Could not load generation");
  return payload as GenerateResponse;
}

export async function analyzeLandingPage(url: string) {
  const response = await fetch("/api/landing-page/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const payload = (await response.json()) as LandingPageAnalysis | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Landing page analysis failed");
  return payload as LandingPageAnalysis;
}

export async function generateStorePack(formData: FormData) {
  const response = await fetch("/api/generate", { method: "POST", body: formData });
  const payload = (await response.json()) as GenerateResponse | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Generation failed");
  return payload as GenerateResponse;
}

export async function generateAiImageDirect(formData: FormData) {
  const response = await fetch("/api/generate-ai-image-direct", { method: "POST", body: formData });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as { image?: { fileName: string; dataUrl: string }; imageUrl?: string; prompt?: string; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }>; scenePlan?: unknown; error?: string }
    : { error: await response.text() };
  if (!response.ok) throw new Error(payload.error ?? `AI Image Direct generation failed (${response.status})`);
  return payload;
}

export async function generateAiImageDirectPack(formData: FormData) {
  const response = await fetch("/api/generate-ai-image-direct-pack", { method: "POST", body: formData });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as { images?: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }>; error?: string }
    : { error: await response.text() };
  if (!response.ok) throw new Error(payload.error ?? `AI Image Direct pack generation failed (${response.status})`);
  return payload;
}

export async function rerenderStorePack(body: unknown) {
  const response = await fetch("/api/rerender", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as GenerateResponse | { error: string };
  if (!response.ok) throw new Error("error" in payload ? payload.error : "Rerender failed");
  return payload as GenerateResponse;
}
