import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createModelGateway } from "./create-model-gateway";

const OutputSchema = z.object({ id: z.string() });

describe("createModelGateway", () => {
  it("creates a gateway with the fixture provider", async () => {
    const gateway = createModelGateway({ provider: "fixture" });

    const result = await gateway.generateObject({
      provider: "fixture",
      model: "fixture-v1",
      task: "visual-system.generate",
      schema: OutputSchema,
      input: {},
    });

    expect(result.object.id).toBe("fixture-warm-editorial-v1");
  });

  it("requires a Gemini API key for Gemini provider", () => {
    expect(() => createModelGateway({ provider: "gemini" })).toThrow("GEMINI_API_KEY is required");
  });

  it("requires an OpenAI API key for OpenAI provider", () => {
    expect(() => createModelGateway({ provider: "openai" })).toThrow("OPENAI_API_KEY is required");
  });
});
