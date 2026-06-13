import { describe, expect, it } from "vitest";

import { buildStructuredObjectPrompt, parseStructuredJsonText, requireStructuredText } from "./structured-provider-request";

describe("structured provider request mechanics", () => {
  it("builds one structured object prompt format", () => {
    expect(buildStructuredObjectPrompt("storyboard.generate", { appName: "LiteraryTrip" })).toContain("Task: storyboard.generate");
    expect(buildStructuredObjectPrompt("storyboard.generate", { appName: "LiteraryTrip" })).toContain('"appName": "LiteraryTrip"');
  });

  it("parses valid JSON and normalizes invalid JSON", () => {
    expect(parseStructuredJsonText({ provider: "fake", rawText: '{"ok":true}' })).toEqual({ ok: true });
    expect(() => parseStructuredJsonText({ provider: "fake", rawText: "nope" })).toThrow(/invalid JSON/);
  });

  it("normalizes empty provider text", () => {
    expect(() => requireStructuredText({ provider: "fake", rawText: undefined })).toThrow(/empty response/);
  });
});
