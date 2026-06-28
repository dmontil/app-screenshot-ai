import { describe, expect, it } from "vitest";

import { localeBadgeClass, packSummary, type CreatorPack } from "./creator-workspace-view-model";

const pack: CreatorPack = {
  id: "pack-1",
  name: "Launch pack",
  platform: "iphone",
  size: "6.9",
  screenCount: 3,
  updatedAt: "2026-06-28T00:00:00.000Z",
  locales: [
    {
      code: "en-US",
      status: "Approved",
      screens: [
        { index: 1, sceneType: "cover", headline: "Start", subheadline: "", status: "Approved" },
        { index: 2, sceneType: "feature", headline: "Ship", subheadline: "", status: "Draft" },
        { index: 3, sceneType: "feature", headline: "Win", subheadline: "", status: "Approved" },
      ],
    },
    { code: "es-ES", status: "Needs review", screens: [{ index: 1, sceneType: "cover", headline: "Start", subheadline: "", status: "Draft" }] },
  ],
};

describe("creator workspace view model", () => {
  it("summarizes pack approval and translation progress", () => {
    expect(packSummary(pack)).toEqual({
      primary: "iphone · 3 screens · 2/6 approved",
      secondary: "1/1 translated · en-US approved · es-ES needs review",
    });
  });

  it("maps locale status to badge classes", () => {
    expect(localeBadgeClass({ code: "en-US", status: "Approved" })).toBe("locale-badge done");
    expect(localeBadgeClass({ code: "es-ES", status: "Needs review" })).toBe("locale-badge warning");
    expect(localeBadgeClass({ code: "fr-FR", status: "Draft" })).toBe("locale-badge");
  });
});
