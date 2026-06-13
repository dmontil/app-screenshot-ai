import { describe, expect, it } from "vitest";

import { resolveRenderTreatment } from "./render-treatment";

describe("render treatment seam", () => {
  it("resolves treatment from visual system family and screen treatment", () => {
    expect(resolveRenderTreatment({ layoutFamily: "cinematic-atlas", treatment: "hero-device" })).toBe("cinematic-atlas");
    expect(resolveRenderTreatment({ layoutFamily: "classic-device", treatment: "premium-proof-card" })).toBe("premium-proof-cards");
    expect(resolveRenderTreatment({ layoutFamily: "classic-device", treatment: "map-route-editorial" })).toBe("map-route-editorial");
    expect(resolveRenderTreatment({ layoutFamily: "classic-device", treatment: undefined })).toBe("classic-device");
  });
});
