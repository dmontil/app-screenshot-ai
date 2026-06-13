import { describe, expect, it } from "vitest";

import { FixtureAdapter } from "./fixture-adapter";

describe("FixtureAdapter", () => {
  it("generates a deterministic VisualSystem", async () => {
    const adapter = new FixtureAdapter();

    const result = await adapter.generateObject({
      model: "fixture-v1",
      task: "visual-system.generate",
      input: { app: { appName: "LiteraryTrip" } },
    });

    expect(result).toMatchObject({
      id: "fixture-warm-editorial-v1",
      palette: {
        background: "#F7F1E7",
      },
    });
  });

  it("generates a deterministic five-screen storyboard", async () => {
    const adapter = new FixtureAdapter();

    const result = await adapter.generateObject({
      model: "fixture-v1",
      task: "storyboard.generate",
      input: {
        app: {
          screenshots: [
            { path: "input/home.png" },
            { path: "input/search.png" },
            { path: "input/map.png" },
          ],
        },
      },
    });

    expect(result).toMatchObject({
      screens: [
        { index: 1, role: "hook" },
        { index: 2, role: "search" },
        { index: 3, role: "value" },
        { index: 4, role: "map" },
        { index: 5, role: "save" },
      ],
    });
  });
});
