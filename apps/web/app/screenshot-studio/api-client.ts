import type { GenerateResponse, ProjectSummary } from "./types";

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
