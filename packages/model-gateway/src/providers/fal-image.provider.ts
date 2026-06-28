import { readFile } from "node:fs/promises";

import { fal } from "@fal-ai/client";

export type FalImageEditInput = {
  prompt: string;
  imagePaths: string[];
  outputWidth: number;
  outputHeight: number;
};

export type FalImageEditOutput = {
  imageUrl: string;
  raw: unknown;
};

export interface ImageEditProvider {
  edit(input: FalImageEditInput): Promise<FalImageEditOutput>;
}

export class FalNanoBananaProvider implements ImageEditProvider {
  constructor(apiKey: string) {
    if (!apiKey) throw new Error("FAL_KEY is required for fal.ai image direct mode.");
    fal.config({ credentials: apiKey });
  }

  async edit(input: FalImageEditInput): Promise<FalImageEditOutput> {
    const imageUrls = await Promise.all(input.imagePaths.map((imagePath) => materializeImageUrl(imagePath)));
    const result = await fal.subscribe("fal-ai/nano-banana-2/edit", {
      input: {
        prompt: input.prompt,
        image_urls: imageUrls,
        output_format: "png",
      },
      logs: true,
    });

    const imageUrl = firstImageUrl(result);
    if (!imageUrl) throw new Error("fal.ai Nano Banana returned no image URL.");
    return { imageUrl, raw: result };
  }
}

async function materializeImageUrl(imagePath: string): Promise<string> {
  if (/^https?:\/\//.test(imagePath) || imagePath.startsWith("data:")) return imagePath;
  const bytes = await readFile(imagePath);
  const blob = new Blob([blobPartFromBytes(new Uint8Array(bytes))], { type: contentTypeFor(imagePath) });
  return fal.storage.upload(blob);
}

function firstImageUrl(result: unknown): string | undefined {
  const data = (result as { data?: { images?: Array<{ url?: string }> } }).data;
  return data?.images?.[0]?.url;
}

function blobPartFromBytes(bytes: Uint8Array): BlobPart {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function contentTypeFor(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}
