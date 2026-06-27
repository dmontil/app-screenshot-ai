import type { z } from "zod";

export type ModelGatewayErrorCode =
  | "unknown_provider"
  | "invalid_key"
  | "quota_exceeded"
  | "rate_limited"
  | "provider_down"
  | "content_blocked"
  | "timeout"
  | "schema_validation_failed"
  | "unknown_provider_error";

export class ModelGatewayError extends Error {
  readonly code: ModelGatewayErrorCode;
  readonly provider: string;
  readonly retryable: boolean;

  constructor(params: { code: ModelGatewayErrorCode; provider: string; retryable: boolean; message: string }) {
    super(params.message);
    this.name = "ModelGatewayError";
    this.code = params.code;
    this.provider = params.provider;
    this.retryable = params.retryable;
  }
}

export type ImageReferenceInput = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

export type GeneratedImage = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

export type ModelProviderPort = {
  generateObject(params: {
    model: string;
    task: string;
    input: unknown;
  }): Promise<unknown>;
  generateImage?(params: {
    model: string;
    task: string;
    prompt: string;
    referenceImage?: ImageReferenceInput;
    referenceImages?: ImageReferenceInput[];
  }): Promise<GeneratedImage>;
};

export type ModelGenerationMetadata = {
  provider: string;
  model: string;
  task: string;
  latencyMs: number;
  createdAt: string;
};

export type GenerateObjectParams<TSchema extends z.ZodType> = {
  provider: string;
  model: string;
  task: string;
  schema: TSchema;
  input: unknown;
};

export type GenerateObjectResult<TSchema extends z.ZodType> = {
  object: z.infer<TSchema>;
  metadata: ModelGenerationMetadata;
};

export type GenerateImageParams = {
  provider: string;
  model: string;
  task: string;
  prompt: string;
  referenceImage?: ImageReferenceInput;
  referenceImages?: ImageReferenceInput[];
};

export type GenerateImageResult = GeneratedImage & {
  metadata: ModelGenerationMetadata;
};

export class ModelGateway {
  private readonly providers: Record<string, ModelProviderPort>;

  constructor(params: { providers: Record<string, ModelProviderPort> }) {
    this.providers = params.providers;
  }

  async generateObject<TSchema extends z.ZodType>(
    params: GenerateObjectParams<TSchema>,
  ): Promise<GenerateObjectResult<TSchema>> {
    const provider = this.providers[params.provider];

    if (!provider) {
      throw new ModelGatewayError({
        code: "unknown_provider",
        provider: params.provider,
        retryable: false,
        message: `Provider '${params.provider}' is not configured.`,
      });
    }

    const startedAt = Date.now();
    const rawObject = await provider.generateObject({
      model: params.model,
      task: params.task,
      input: params.input,
    });

    const parsed = params.schema.safeParse(rawObject);

    if (!parsed.success) {
      throw new ModelGatewayError({
        code: "schema_validation_failed",
        provider: params.provider,
        retryable: false,
        message: `Provider '${params.provider}' returned invalid structured output for task '${params.task}'.`,
      });
    }

    return {
      object: parsed.data,
      metadata: {
        provider: params.provider,
        model: params.model,
        task: params.task,
        latencyMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      },
    };
  }

  async generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
    const provider = this.providers[params.provider];

    if (!provider) {
      throw new ModelGatewayError({
        code: "unknown_provider",
        provider: params.provider,
        retryable: false,
        message: `Provider '${params.provider}' is not configured.`,
      });
    }

    if (!provider.generateImage) {
      throw new ModelGatewayError({
        code: "unknown_provider_error",
        provider: params.provider,
        retryable: false,
        message: `Provider '${params.provider}' does not support image generation.`,
      });
    }

    const startedAt = Date.now();
    const image = await provider.generateImage({
      model: params.model,
      task: params.task,
      prompt: params.prompt,
      ...(params.referenceImage ? { referenceImage: params.referenceImage } : {}),
      ...(params.referenceImages ? { referenceImages: params.referenceImages } : {}),
    });

    return {
      ...image,
      metadata: {
        provider: params.provider,
        model: params.model,
        task: params.task,
        latencyMs: Date.now() - startedAt,
        createdAt: new Date().toISOString(),
      },
    };
  }
}
