import { describe, expect, it } from "vitest";

import { loadProviderPreferences, mergeProviderSettings, saveProviderPreferences } from "./provider-preferences";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return Array.from(this.values.keys())[index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("provider preferences", () => {
  it("persists provider, model and API keys in browser storage", () => {
    const storage = new MemoryStorage();

    saveProviderPreferences(storage, {
      provider: "openai",
      model: "gpt-4.1",
      geminiApiKey: "gemini-secret",
      openaiApiKey: "openai-secret",
    });

    expect(loadProviderPreferences(storage)).toEqual({
      provider: "openai",
      model: "gpt-4.1",
      geminiApiKey: "gemini-secret",
      openaiApiKey: "openai-secret",
    });
  });

  it("does not persist masked environment keys as browser preferences", () => {
    const storage = new MemoryStorage();

    saveProviderPreferences(storage, {
      provider: "gemini",
      model: "gemini-2.5-flash",
      geminiApiKey: "••••••••1234",
      openaiApiKey: "",
    });

    expect(loadProviderPreferences(storage)).toEqual({
      provider: "gemini",
      model: "gemini-2.5-flash",
    });
  });

  it("uses stored browser keys over masked environment settings when the web app opens", () => {
    const merged = mergeProviderSettings(
      {
        provider: "fixture",
        model: "fixture-v1",
        geminiApiKey: "••••••••1234",
        openaiApiKey: "",
      },
      {
        provider: "openai",
        model: "gpt-4.1",
        geminiApiKey: "",
        openaiApiKey: "sk-local-openai",
      },
    );

    expect(merged).toEqual({
      provider: "openai",
      model: "gpt-4.1",
      geminiApiKey: "••••••••1234",
      openaiApiKey: "sk-local-openai",
    });
  });
});
