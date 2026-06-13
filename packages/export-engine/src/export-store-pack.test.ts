import { describe, expect, it } from "vitest";

import { ExportStorePackUseCase } from "./export-store-pack";

const pngBytes = new Uint8Array([1, 2, 3]);

const renderedAsset = {
  id: "screen-1",
  screenIndex: 1,
  store: "app-store" as const,
  device: "iphone-6.9",
  locale: "en-US",
  fileName: "01-hook.png",
  contentType: "image/png" as const,
  width: 1320,
  height: 2868,
  bytes: pngBytes,
};

describe("ExportStorePackUseCase", () => {
  it("creates a manifest with store/device/locale paths", async () => {
    const useCase = new ExportStorePackUseCase();

    const result = await useCase.execute({ assets: [renderedAsset] });

    expect(result.manifest).toEqual({
      items: [
        {
          assetId: "screen-1",
          path: "app-store/iphone-6.9/en-US/01-hook.png",
          contentType: "image/png",
          byteLength: 3,
        },
      ],
    });
  });

  it("creates a zip containing images and manifest", async () => {
    const useCase = new ExportStorePackUseCase();

    const result = await useCase.execute({ assets: [renderedAsset] });

    expect(result.zipBytes.byteLength).toBeGreaterThan(0);
  });
});
