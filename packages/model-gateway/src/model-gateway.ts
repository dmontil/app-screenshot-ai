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

export type ModelProviderPort = {
  generateObject(params: {
    model: string;
    task: string;
    input: unknown;
  }): Promise<unknown>;
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
}
