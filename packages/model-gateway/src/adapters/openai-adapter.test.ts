import { describe, expect, it } from "vitest";

import { ModelGatewayError } from "../model-gateway";
import { OpenAIAdapter } from "./openai-adapter";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("OpenAIAdapter", () => {
  it("requests OpenAI responses API with JSON object output and parses returned text", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const adapter = new OpenAIAdapter({
      apiKey: "openai-key",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ output_text: JSON.stringify({ headline: "Turn books into routes" }) });
      },
    });

    const result = await adapter.generateObject({
      model: "gpt-4.1-mini",
      task: "storyboard.generate",
      input: { appName: "LiteraryTrip" },
    });

    expect(result).toEqual({ headline: "Turn books into routes" });
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer openai-key" });
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      model: "gpt-4.1-mini",
      text: { format: { type: "json_object" } },
    });
  });

  it("normalizes rate limit errors", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "openai-key",
      fetch: async () => jsonResponse({ error: { type: "rate_limit_exceeded", message: "slow down" } }, 429),
    });

    await expect(adapter.generateObject({ model: "gpt-4.1-mini", task: "x", input: {} })).rejects.toEqual(
      new ModelGatewayError({
        code: "rate_limited",
        provider: "openai",
        retryable: true,
        message: "OpenAI rate limit exceeded.",
      }),
    );
  });

  it("normalizes invalid API key errors", async () => {
    const adapter = new OpenAIAdapter({
      apiKey: "openai-key",
      fetch: async () => jsonResponse({ error: { type: "invalid_api_key", message: "bad key" } }, 401),
    });

    await expect(adapter.generateObject({ model: "gpt-4.1-mini", task: "x", input: {} })).rejects.toMatchObject({
      code: "invalid_key",
      provider: "openai",
      retryable: false,
    });
  });
});
