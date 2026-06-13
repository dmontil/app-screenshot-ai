import { RenderScreenshotUseCase, type RenderScreenshotInput } from "./render-screenshot";
import type { RenderedAsset, RenderTarget, Storyboard, VisualSystem } from "@app-screenshot-ai/schemas";

export type RenderStoreSetSource = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
};

export type RenderStoreSetInput = {
  visualSystem: VisualSystem;
  storyboard: Storyboard;
  target: RenderTarget;
  loadSourceScreenshot?: (path: string) => Promise<RenderStoreSetSource>;
};

export class RenderStoreSetUseCase {
  private readonly screenshotRenderer = new RenderScreenshotUseCase();

  async execute(input: RenderStoreSetInput): Promise<RenderedAsset[]> {
    const assets: RenderedAsset[] = [];

    for (const screenPlan of input.storyboard.screens) {
      const sourceScreenshot = input.loadSourceScreenshot
        ? await input.loadSourceScreenshot(screenPlan.sourceScreenshotPath)
        : undefined;
      const secondarySourceScreenshot = input.loadSourceScreenshot && screenPlan.secondarySourceScreenshotPath
        ? await input.loadSourceScreenshot(screenPlan.secondarySourceScreenshotPath)
        : undefined;

      const renderInput: RenderScreenshotInput = {
        visualSystem: input.visualSystem,
        screenPlan,
        target: input.target,
        campaign: { screenCount: input.storyboard.screens.length },
        ...(sourceScreenshot ? { sourceScreenshot } : {}),
        ...(secondarySourceScreenshot ? { secondarySourceScreenshot } : {}),
      };

      assets.push(await this.screenshotRenderer.execute(renderInput));
    }

    return assets;
  }
}
