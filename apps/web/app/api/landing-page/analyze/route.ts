import { analyzeLandingPageHtml } from "@app-screenshot-ai/ai-pipeline";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { url?: unknown };
    const parsedUrl = parseLandingPageUrl(body.url);
    if (!parsedUrl) return Response.json({ error: "Enter a valid landing page URL." }, { status: 400 });

    const html = await fetchLandingPageHtml(parsedUrl.toString());
    if (!html) return Response.json({ error: "Could not load a readable HTML landing page." }, { status: 400 });

    return Response.json(analyzeLandingPageHtml(parsedUrl.toString(), html));
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError"
      ? "Landing page request timed out. Try again or paste brand colors manually."
      : error instanceof Error
        ? `Could not analyze landing page: ${error.message}`
        : "Landing page analysis failed.";
    return Response.json({ error: message }, { status: 400 });
  }
}

function parseLandingPageUrl(value: unknown): URL | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized.includes("://") ? normalized : `https://${normalized}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function fetchLandingPageHtml(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "AppScreenshotAI/0.1 landing-color-extractor" },
    });
    if (!response.ok) return undefined;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) return undefined;
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}
