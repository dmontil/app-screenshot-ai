import { ModelGatewayError, type ModelProviderPort } from "../model-gateway";
import { buildStructuredObjectPrompt, parseStructuredJsonText, requireStructuredText } from "./structured-provider-request";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

type OpenAIAdapterOptions = {
  apiKey: string;
  fetch?: FetchLike;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    type?: string;
    code?: string;
    message?: string;
  };
};

export class OpenAIAdapter implements ModelProviderPort {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAIAdapterOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async generateObject(params: { model: string; task: string; input: unknown }): Promise<unknown> {
    const response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        input: buildStructuredObjectPrompt(params.task, params.input),
        text: { format: { type: "json_object" } },
        temperature: 0.4,
      }),
    });

    const data = (await response.json()) as OpenAIResponse;

    if (!response.ok || data.error) {
      throw normalizeOpenAIError(data, response.status);
    }

    const rawText = requireStructuredText({ provider: "openai", rawText: data.output_text ?? data.output?.flatMap((item) => item.content ?? []).find((item) => item.text)?.text });
    return parseStructuredJsonText({ provider: "openai", rawText });
  }
}

function normalizeOpenAIError(data: OpenAIResponse, httpStatus: number): ModelGatewayError {
  const type = data.error?.type;

  if (httpStatus === 401 || type === "invalid_api_key") {
    return new ModelGatewayError({
      code: "invalid_key",
      provider: "openai",
      retryable: false,
      message: "OpenAI API key is invalid or not authorized.",
    });
  }

  if (httpStatus === 429 || type === "rate_limit_exceeded") {
    return new ModelGatewayError({
      code: "rate_limited",
      provider: "openai",
      retryable: true,
      message: "OpenAI rate limit exceeded.",
    });
  }

  if (httpStatus >= 500) {
    return new ModelGatewayError({
      code: "provider_down",
      provider: "openai",
      retryable: true,
      message: "OpenAI provider is unavailable.",
    });
  }

  return new ModelGatewayError({
    code: "unknown_provider_error",
    provider: "openai",
    retryable: false,
    message: `OpenAI error: ${data.error?.message ?? `HTTP ${httpStatus}`}`,
  });
}
