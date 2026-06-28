import { ModelGatewayError } from "../model-gateway";

export type StructuredImageReference = {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  imageBase64: string;
};

export function buildStructuredObjectPrompt(task: string, input: unknown): string {
  return `You are App Screenshot AI. Task: ${task}. Return only valid JSON.\n\nInput:\n${JSON.stringify(input, redactLargeImagePayloads, 2)}`;
}

export function extractStyleReferenceImage(input: unknown): StructuredImageReference | undefined {
  if (!input || typeof input !== "object" || !("styleReference" in input)) return undefined;
  const styleReference = (input as { styleReference?: unknown }).styleReference;
  if (!styleReference || typeof styleReference !== "object") return undefined;
  const maybeReference = styleReference as { mimeType?: unknown; imageBase64?: unknown };
  if (
    typeof maybeReference.imageBase64 !== "string" ||
    !maybeReference.imageBase64 ||
    (maybeReference.mimeType !== "image/png" && maybeReference.mimeType !== "image/jpeg" && maybeReference.mimeType !== "image/webp")
  ) {
    return undefined;
  }
  return { mimeType: maybeReference.mimeType, imageBase64: maybeReference.imageBase64 };
}

function redactLargeImagePayloads(key: string, value: unknown): unknown {
  if (key === "imageBase64" && typeof value === "string") return "[attached reference image]";
  return value;
}

export function requireStructuredText(params: { provider: string; rawText: string | undefined }): string {
  if (!params.rawText) {
    throw new ModelGatewayError({
      code: "unknown_provider_error",
      provider: params.provider,
      retryable: true,
      message: `${params.provider} returned an empty response.`,
    });
  }
  return params.rawText;
}

export function parseStructuredJsonText(params: { provider: string; rawText: string }): unknown {
  try {
    return JSON.parse(params.rawText) as unknown;
  } catch {
    throw new ModelGatewayError({
      code: "schema_validation_failed",
      provider: params.provider,
      retryable: false,
      message: `${params.provider} returned invalid JSON.`,
    });
  }
}
