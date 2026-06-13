import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ModelGateway, ModelGatewayError } from "./model-gateway";

const OutputSchema = z.object({
  headline: z.string(),
});

describe("ModelGateway", () => {
  it("normalizes unknown provider errors", async () => {
    const gateway = new ModelGateway({ providers: {} });

    await expect(
      gateway.generateObject({
        provider: "missing-provider",
        model: "missing-model",
        task: "creative-direction.generate",
        schema: OutputSchema,
        input: { appName: "LiteraryTrip" },
      }),
    ).rejects.toEqual(
      new ModelGatewayError({
        code: "unknown_provider",
        provider: "missing-provider",
        retryable: false,
        message: "Provider 'missing-provider' is not configured.",
      }),
    );
  });

  it("returns schema-validated objects with provider metadata", async () => {
    const gateway = new ModelGateway({
      providers: {
        fake: {
          async generateObject() {
            return { headline: "Turn books into routes" };
          },
        },
      },
    });

    const result = await gateway.generateObject({
      provider: "fake",
      model: "fake-fast",
      task: "creative-direction.generate",
      schema: OutputSchema,
      input: { appName: "LiteraryTrip" },
    });

    expect(result.object).toEqual({ headline: "Turn books into routes" });
    expect(result.metadata).toMatchObject({
      provider: "fake",
      model: "fake-fast",
      task: "creative-direction.generate",
    });
    expect(result.metadata.latencyMs).toEqual(expect.any(Number));
    expect(result.metadata.createdAt).toEqual(expect.any(String));
  });

  it("normalizes schema validation failures", async () => {
    const gateway = new ModelGateway({
      providers: {
        fake: {
          async generateObject() {
            return { title: "Wrong shape" };
          },
        },
      },
    });

    await expect(
      gateway.generateObject({
        provider: "fake",
        model: "fake-fast",
        task: "creative-direction.generate",
        schema: OutputSchema,
        input: { appName: "LiteraryTrip" },
      }),
    ).rejects.toMatchObject({
      code: "schema_validation_failed",
      provider: "fake",
      retryable: false,
    });
  });
});
