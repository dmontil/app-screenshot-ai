import { describe, expect, it } from "vitest";

import { approvePackScreen, buildPackZipEntries, translatePackCopy } from "./pack-workspace-actions";

const generatedImages = [
  { index: 1, id: "screen-01", fileName: "screen-01.png", dataUrl: "data:image/png;base64,Zmlyc3Q=" },
  { index: 2, id: "screen-02", fileName: "screen-02.png", dataUrl: "data:image/png;base64,c2Vjb25k" },
];

describe("pack workspace actions", () => {
  it("approves an existing generated screen", () => {
    const approved = approvePackScreen([], generatedImages, 1);

    expect(approved).toEqual([{ index: 1, approvedAt: expect.any(String) }]);
  });

  it("does not approve a screen without a generated image", () => {
    expect(() => approvePackScreen([], generatedImages, 3)).toThrow("Screen 3 has no generated image to approve");
  });

  it("translates pack copy without mutating the source screens", () => {
    const screens = [
      { index: 1, sceneType: "cover" as const, headline: "Plan trips", subheadline: "Fast routes" },
      { index: 2, sceneType: "feature" as const, headline: "Save places", subheadline: "Keep ideas" },
    ];

    const translated = translatePackCopy(screens, "es-ES");

    expect(translated).toEqual([
      { index: 1, sceneType: "cover", headline: "Plan trips (es-ES)", subheadline: "Fast routes (es-ES)" },
      { index: 2, sceneType: "feature", headline: "Save places (es-ES)", subheadline: "Keep ideas (es-ES)" },
    ]);
    expect(screens[0]?.headline).toBe("Plan trips");
  });

  it("builds ZIP entries only for approved generated screens", () => {
    const entries = buildPackZipEntries({
      appName: "VanTrip",
      packName: "iPhone Launch",
      platform: "iphone",
      locale: "en-US",
      images: generatedImages,
      approvals: [{ index: 2, approvedAt: "2026-01-01T00:00:00.000Z" }],
    });

    expect(entries).toEqual([
      {
        filename: "vantrip-iphone-launch/iphone/en-US/02-screen-02.png",
        base64: "c2Vjb25k",
      },
    ]);
  });
});
