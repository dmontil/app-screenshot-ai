import { type SupportedProvider } from "@app-screenshot-ai/model-gateway";

export const runtime = "nodejs";

export async function GET() {
  const provider = readProvider(process.env.MODEL_PROVIDER ?? "fixture");
  const model = process.env.MODEL_NAME ?? defaultModelFor(provider);

  return Response.json({
    provider,
    model,
    geminiApiKey: process.env.GEMINI_API_KEY ? maskSecret(process.env.GEMINI_API_KEY) : "",
    openaiApiKey: process.env.OPENAI_API_KEY ? maskSecret(process.env.OPENAI_API_KEY) : "",
    hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasOpenaiApiKey: Boolean(process.env.OPENAI_API_KEY),
  });
}

function readProvider(value: string): SupportedProvider {
  if (value === "gemini" || value === "openai" || value === "fixture") return value;
  return "fixture";
}

function defaultModelFor(provider: SupportedProvider): string {
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "openai") return "gpt-4.1-mini";
  return "fixture-v1";
}

function maskSecret(value: string): string {
  const suffix = value.slice(-4);
  return suffix ? `••••••••${suffix}` : "••••••••";
}
