import type { SupportedProvider } from "@app-screenshot-ai/model-gateway";
import type { RawScreenshot } from "@app-screenshot-ai/schemas";

export type GenerationMode = "deterministic" | "premium-direct" | "benchmark";

export function readString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readGenerationMode(value: FormDataEntryValue | null): GenerationMode {
  const mode = readString(value);
  if (mode === "premium-direct" || mode === "benchmark") return mode;
  return "deterministic";
}

export function readPositiveInt(value: FormDataEntryValue | null): number | undefined {
  const parsed = Number.parseInt(readString(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function readProvider(value: FormDataEntryValue | null): SupportedProvider {
  const provider = readString(value);
  if (provider === "gemini" || provider === "openai" || provider === "fixture") return provider;
  return "fixture";
}

export function parseScreenshotKind(value: string): RawScreenshot["kind"] {
  if (value === "splash" || value === "logo" || value === "empty" || value === "unknown") return value;
  return "functional";
}

export function readActualSecret(formValue: string, envValue: string | undefined): string {
  if (!formValue) return envValue ?? "";
  if (formValue.includes("•")) return envValue ?? "";
  return formValue;
}

export function defaultModelFor(provider: SupportedProvider): string {
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "openai") return "gpt-4.1";
  return "fixture-v1";
}

export function defaultImageModelFor(provider: SupportedProvider): string | undefined {
  if (provider === "openai") return "gpt-image-2";
  return undefined;
}

export function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "app-project";
}
