import { ModelGatewayError, type ModelProviderPort } from "../model-gateway";
import { buildStructuredObjectPrompt, parseStructuredJsonText, requireStructuredText } from "./structured-provider-request";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

type GeminiAdapterOptions = {
  apiKey: string;
  fetch?: FetchLike;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
};

export class GeminiAdapter implements ModelProviderPort {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: GeminiAdapterOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async generateObject(params: { model: string; task: string; input: unknown }): Promise<unknown> {
    const url = `${GEMINI_API_BASE}/models/${params.model}:generateContent?key=${this.apiKey}`;
    const response = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildStructuredObjectPrompt(params.task, params.input),
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      }),
    });

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok || data.error) {
      throw normalizeGeminiError(data, response.status);
    }

    const rawText = requireStructuredText({ provider: "gemini", rawText: data.candidates?.[0]?.content?.parts?.[0]?.text });
    return parseStructuredJsonText({ provider: "gemini", rawText });
  }
}

function normalizeGeminiError(data: GeminiResponse, httpStatus: number): ModelGatewayError {
  const status = data.error?.status;
  const message = data.error?.message ?? `HTTP ${httpStatus}`;

  if (httpStatus === 401 || httpStatus === 403 || status === "PERMISSION_DENIED" || status === "UNAUTHENTICATED") {
    return new ModelGatewayError({
      code: "invalid_key",
      provider: "gemini",
      retryable: false,
      message: "Gemini API key is invalid or not authorized.",
    });
  }

  if (httpStatus === 429 || status === "RESOURCE_EXHAUSTED") {
    return new ModelGatewayError({
      code: "quota_exceeded",
      provider: "gemini",
      retryable: false,
      message: "Gemini quota exceeded.",
    });
  }

  if (httpStatus >= 500) {
    return new ModelGatewayError({
      code: "provider_down",
      provider: "gemini",
      retryable: true,
      message: "Gemini provider is unavailable.",
    });
  }

  return new ModelGatewayError({
    code: "unknown_provider_error",
    provider: "gemini",
    retryable: false,
    message: `Gemini error: ${message}`,
  });
}
