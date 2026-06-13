import JSZip from "jszip";

import type { ExportManifest, RenderedAsset } from "@app-screenshot-ai/schemas";

export type ExportStorePackInput = {
  assets: RenderedAsset[];
};

export type ExportStorePackResult = {
  manifest: ExportManifest;
  zipBytes: Uint8Array;
};

export class ExportStorePackUseCase {
  async execute(input: ExportStorePackInput): Promise<ExportStorePackResult> {
    const manifest: ExportManifest = {
      items: input.assets.map((asset) => ({
        assetId: asset.id,
        path: buildExportPath(asset),
        contentType: asset.contentType,
        byteLength: asset.bytes.byteLength,
      })),
    };

    const zip = new JSZip();

    for (const asset of input.assets) {
      zip.file(buildExportPath(asset), asset.bytes);
    }

    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    const zipBytes = await zip.generateAsync({ type: "uint8array" });

    return { manifest, zipBytes };
  }
}

function buildExportPath(asset: RenderedAsset): string {
  return `${asset.store}/${asset.device}/${asset.locale}/${asset.fileName}`;
}
