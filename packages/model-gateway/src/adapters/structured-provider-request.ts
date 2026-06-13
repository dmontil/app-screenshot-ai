import { ModelGatewayError } from "../model-gateway";

export function buildStructuredObjectPrompt(task: string, input: unknown): string {
  return `You are App Screenshot AI. Task: ${task}. Return only valid JSON.\n\nInput:\n${JSON.stringify(input, null, 2)}`;
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
