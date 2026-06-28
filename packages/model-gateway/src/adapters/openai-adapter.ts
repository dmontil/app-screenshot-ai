import { ModelGatewayError, type ModelProviderPort } from "../model-gateway";
import { buildStructuredObjectPrompt, extractStyleReferenceImage, parseStructuredJsonText, requireStructuredText } from "./structured-provider-request";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_IMAGES_GENERATIONS_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_IMAGES_EDITS_URL = "https://api.openai.com/v1/images/edits";

type FetchLike = (url: string | URL, init?: RequestInit) => Promise<Response>;

type OpenAIAdapterOptions = {
  apiKey: string;
  fetch?: FetchLike;
};

type OpenAIProviderError = {
  type?: string;
  code?: string;
  message?: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: OpenAIProviderError;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  error?: OpenAIProviderError;
};

export class OpenAIAdapter implements ModelProviderPort {
  private readonly apiKey: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAIAdapterOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetch ?? fetch;
  }

  async generateObject(params: { model: string; task: string; input: unknown }): Promise<unknown> {
    const prompt = buildStructuredObjectPrompt(params.task, params.input);
    const styleReferenceImage = extractStyleReferenceImage(params.input);
    const response = await this.fetchImpl(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        input: styleReferenceImage
          ? [
              {
                role: "user",
                content: [
                  { type: "input_text", text: prompt },
                  {
                    type: "input_image",
                    image_url: `data:${styleReferenceImage.mimeType};base64,${styleReferenceImage.imageBase64}`,
                  },
                ],
              },
            ]
          : prompt,
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

  async generateImage(params: {
    model: string;
    task: string;
    prompt: string;
    referenceImage?: { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" };
    referenceImages?: Array<{ bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" }>;
  }): Promise<{ bytes: Uint8Array; contentType: "image/png" }> {
    const hasReferenceImages = Boolean(params.referenceImage || params.referenceImages?.length);
    const response = hasReferenceImages
      ? await this.fetchImpl(OPENAI_IMAGES_EDITS_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${this.apiKey}` },
          body: buildImageEditFormData(params),
        })
      : await this.fetchImpl(OPENAI_IMAGES_GENERATIONS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: params.model,
            prompt: params.prompt,
            size: "1024x1536",
            quality: "high",
          }),
        });

    const data = (await response.json()) as OpenAIImageResponse;
    if (!response.ok || data.error) {
      throw normalizeOpenAIError(data, response.status);
    }

    const b64Json = data.data?.[0]?.b64_json;
    if (!b64Json) {
      throw new ModelGatewayError({
        code: "unknown_provider_error",
        provider: "openai",
        retryable: true,
        message: "OpenAI image generation returned no image data.",
      });
    }

    return { bytes: base64ToBytes(b64Json), contentType: "image/png" };
  }
}

function buildImageEditFormData(params: {
  model: string;
  prompt: string;
  referenceImage?: { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" };
  referenceImages?: Array<{ bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" }>;
}): FormData {
  const form = new FormData();
  form.set("model", params.model);
  form.set("prompt", params.prompt);
  form.set("size", "1024x1536");
  form.set("quality", "high");
  const references = params.referenceImages?.length ? params.referenceImages : params.referenceImage ? [params.referenceImage] : [];
  references.forEach((reference, index) => {
    form.append(
      "image[]",
      new Blob([blobPartFromBytes(reference.bytes)], { type: reference.contentType }),
      `reference-${index + 1}.${extensionFor(reference.contentType)}`,
    );
  });
  return form;
}

function blobPartFromBytes(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function extensionFor(contentType: string): string {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/webp") return "webp";
  return "png";
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function normalizeOpenAIError(data: { error?: OpenAIProviderError }, httpStatus: number): ModelGatewayError {
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
