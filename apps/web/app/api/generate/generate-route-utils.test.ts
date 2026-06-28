import { describe, expect, it } from "vitest";

import { defaultImageModelFor, defaultModelFor, parseScreenshotKind, readActualSecret, readGenerationMode, readPositiveInt, readProvider, readString, slug } from "./generate-route-utils";

describe("generate route utils", () => {
  it("normalizes form string values", () => {
    expect(readString("  VanTrip  ")).toBe("VanTrip");
    expect(readString(null)).toBe("");
  });

  it("parses generation mode and provider with safe defaults", () => {
    expect(readGenerationMode("premium-direct")).toBe("premium-direct");
    expect(readGenerationMode("benchmark")).toBe("benchmark");
    expect(readGenerationMode("unknown")).toBe("deterministic");
    expect(readProvider("openai")).toBe("openai");
    expect(readProvider("bad-provider")).toBe("fixture");
  });

  it("parses optional positive integers", () => {
    expect(readPositiveInt("3")).toBe(3);
    expect(readPositiveInt("0")).toBeUndefined();
    expect(readPositiveInt("abc")).toBeUndefined();
  });

  it("normalizes screenshot kind and ids", () => {
    expect(parseScreenshotKind("logo")).toBe("logo");
    expect(parseScreenshotKind("unexpected")).toBe("functional");
    expect(slug(" My App! 2026 ")).toBe("my-app-2026");
    expect(slug("!!!")).toBe("app-project");
  });

  it("resolves secrets and default models", () => {
    expect(readActualSecret("", "env-secret")).toBe("env-secret");
    expect(readActualSecret("••••", "env-secret")).toBe("env-secret");
    expect(readActualSecret("form-secret", "env-secret")).toBe("form-secret");
    expect(defaultModelFor("gemini")).toBe("gemini-2.5-flash");
    expect(defaultModelFor("openai")).toBe("gpt-4.1");
    expect(defaultModelFor("fixture")).toBe("fixture-v1");
    expect(defaultImageModelFor("openai")).toBe("gpt-image-2");
    expect(defaultImageModelFor("fixture")).toBeUndefined();
  });
});
