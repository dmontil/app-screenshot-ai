export { FixtureAdapter } from "./adapters/fixture-adapter";
export { GeminiAdapter } from "./adapters/gemini-adapter";
export { OpenAIAdapter } from "./adapters/openai-adapter";
export {
  createModelGateway,
  createModelGatewayFromEnv,
  type CreateModelGatewayConfig,
  type SupportedProvider,
} from "./create-model-gateway";

export {
  ModelGateway,
  ModelGatewayError,
  type GenerateObjectParams,
  type GenerateObjectResult,
  type ModelGatewayErrorCode,
  type ModelGenerationMetadata,
  type ModelProviderPort,
} from "./model-gateway";
