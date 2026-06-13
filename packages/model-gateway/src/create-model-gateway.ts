import { FixtureAdapter } from "./adapters/fixture-adapter";
import { GeminiAdapter } from "./adapters/gemini-adapter";
import { OpenAIAdapter } from "./adapters/openai-adapter";
import { ModelGateway, type ModelProviderPort } from "./model-gateway";

export type SupportedProvider = "fixture" | "gemini" | "openai";

export type CreateModelGatewayConfig = {
  provider: SupportedProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
};

export function createModelGateway(config: CreateModelGatewayConfig): ModelGateway {
  const providers: Record<string, ModelProviderPort> = {};

  if (config.provider === "fixture") {
    providers.fixture = new FixtureAdapter();
  }

  if (config.provider === "gemini") {
    if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY is required for provider 'gemini'.");
    providers.gemini = new GeminiAdapter({ apiKey: config.geminiApiKey });
  }

  if (config.provider === "openai") {
    if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is required for provider 'openai'.");
    providers.openai = new OpenAIAdapter({ apiKey: config.openaiApiKey });
  }

  return new ModelGateway({ providers });
}

export function createModelGatewayFromEnv(env: NodeJS.ProcessEnv = process.env): {
  gateway: ModelGateway;
  provider: SupportedProvider;
  model: string;
} {
  const provider = parseProvider(env.MODEL_PROVIDER ?? "fixture");
  const gateway = createModelGateway({
    provider,
    ...(env.GEMINI_API_KEY ? { geminiApiKey: env.GEMINI_API_KEY } : {}),
    ...(env.OPENAI_API_KEY ? { openaiApiKey: env.OPENAI_API_KEY } : {}),
  });

  return {
    gateway,
    provider,
    model: env.MODEL_NAME ?? defaultModelFor(provider),
  };
}

function parseProvider(value: string): SupportedProvider {
  if (value === "fixture" || value === "gemini" || value === "openai") return value;
  throw new Error(`Unsupported MODEL_PROVIDER '${value}'. Use fixture, gemini, or openai.`);
}

function defaultModelFor(provider: SupportedProvider): string {
  if (provider === "gemini") return "gemini-2.5-flash";
  if (provider === "openai") return "gpt-4.1-mini";
  return "fixture-v1";
}
