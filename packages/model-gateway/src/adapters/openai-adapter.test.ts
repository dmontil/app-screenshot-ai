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

  it("sends the selected style reference image as multimodal input", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const adapter = new OpenAIAdapter({
      apiKey: "openai-key",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ output_text: JSON.stringify({ id: "visual-system" }) });
      },
    });

    await adapter.generateObject({
      model: "gpt-4.1-mini",
      task: "visual-system.generate",
      input: {
        styleReference: {
          id: "sc-1",
          mimeType: "image/jpeg",
          imageBase64: "abc123",
        },
      },
    });

    const body = JSON.parse(String(calls[0]?.init.body));
    expect(body.input[0].content).toEqual([
      expect.objectContaining({ type: "input_text", text: expect.stringContaining('"imageBase64": "[attached reference image]"') }),
      { type: "input_image", image_url: "data:image/jpeg;base64,abc123" },
    ]);
  });

  it("generates a reference-guided image with gpt-image-1", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const adapter = new OpenAIAdapter({
      apiKey: "openai-key",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return jsonResponse({ data: [{ b64_json: btoa("png-bytes") }] });
      },
    });

    const result = await adapter.generateImage({
      model: "gpt-image-1",
      task: "style-background.generate",
      prompt: "Generate an abstract app-store background.",
      referenceImage: { bytes: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" },
    });

    expect(calls[0]?.url).toBe("https://api.openai.com/v1/images/edits");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer openai-key" });
    expect(calls[0]?.init.body).toBeInstanceOf(FormData);
    expect(result.contentType).toBe("image/png");
    expect(new TextDecoder().decode(result.bytes)).toBe("png-bytes");
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
