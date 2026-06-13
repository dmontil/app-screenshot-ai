import { describe, expect, it } from "vitest";

import { GeminiAdapter } from "./gemini-adapter";
import { ModelGatewayError } from "../model-gateway";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GeminiAdapter", () => {
  it("requests Gemini with JSON response mode and parses the returned object", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const adapter = new GeminiAdapter({
      apiKey: "gemini-key",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init: init ?? {} });
        return jsonResponse({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ headline: "Turn books into routes" }) }],
              },
            },
          ],
        });
      },
    });

    const result = await adapter.generateObject({
      model: "gemini-2.5-flash",
      task: "storyboard.generate",
      input: { appName: "LiteraryTrip" },
    });

    expect(result).toEqual({ headline: "Turn books into routes" });
    expect(calls[0]?.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=gemini-key",
    );
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      generationConfig: { responseMimeType: "application/json" },
    });
  });

  it("normalizes quota errors", async () => {
    const adapter = new GeminiAdapter({
      apiKey: "gemini-key",
      fetch: async () =>
        jsonResponse(
          {
            error: {
              code: 429,
              status: "RESOURCE_EXHAUSTED",
              message: "Quota exceeded",
            },
          },
          429,
        ),
    });

    await expect(
      adapter.generateObject({ model: "gemini-2.5-flash", task: "x", input: {} }),
    ).rejects.toEqual(
      new ModelGatewayError({
        code: "quota_exceeded",
        provider: "gemini",
        retryable: false,
        message: "Gemini quota exceeded.",
      }),
    );
  });

  it("normalizes invalid JSON responses as schema validation failures", async () => {
    const adapter = new GeminiAdapter({
      apiKey: "gemini-key",
      fetch: async () =>
        jsonResponse({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }),
    });

    await expect(
      adapter.generateObject({ model: "gemini-2.5-flash", task: "x", input: {} }),
    ).rejects.toMatchObject({
      code: "schema_validation_failed",
      provider: "gemini",
      retryable: false,
    });
  });
});
