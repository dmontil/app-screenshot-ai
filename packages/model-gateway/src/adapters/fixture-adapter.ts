import type { ModelProviderPort } from "../model-gateway";

type FixtureInput = {
  app?: {
    appName?: string;
    screenshots?: Array<{ path?: string }>;
  };
};

export class FixtureAdapter implements ModelProviderPort {
  async generateObject(params: { model?: string; task: string; input: unknown }): Promise<unknown> {
    const input = params.input as FixtureInput;

    if (params.task === "visual-system.generate") {
      return {
        id: "fixture-warm-editorial-v1",
        layoutFamily: "map-route-editorial",
        motif: "route-line",
        palette: {
          background: "#F7F1E7",
          primary: "#3B2416",
          accent: "#D99A32",
          text: "#24160F",
        },
        typography: {
          headlineFamily: "Inter",
          headlineWeight: 760,
        },
        layout: {
          safeMargin: 96,
          headlineY: 180,
          deviceY: 720,
          deviceWidthRatio: 0.62,
        },
      };
    }

    if (params.task === "storyboard.generate") {
      const screenshots = input.app?.screenshots ?? [];
      const source = (index: number) => screenshots[index]?.path ?? screenshots[0]?.path ?? "input/screenshot.png";

      return {
        screens: [
          {
            id: "hook",
            index: 1,
            role: "hook",
            headline: "Turn ideas into app store screenshots",
            treatment: "map-route-editorial",
            subheadline: "Start with raw screens and ship a coherent campaign.",
            sourceScreenshotPath: source(0),
          },
          {
            id: "search",
            index: 2,
            role: "search",
            headline: "Highlight your core workflow",
            treatment: "premium-proof-card",
            subheadline: "Show the action users understand in seconds.",
            sourceScreenshotPath: source(1),
          },
          {
            id: "value",
            index: 3,
            role: "value",
            headline: "Show what users get done",
            treatment: "callout-zoom",
            subheadline: "Turn product moments into conversion assets.",
            sourceScreenshotPath: source(2),
          },
          {
            id: "map",
            index: 4,
            role: "map",
            headline: "Keep every screen consistent",
            treatment: "map-route-editorial",
            subheadline: "Repeat the motif without repeating the layout.",
            sourceScreenshotPath: source(0),
          },
          {
            id: "save",
            index: 5,
            role: "save",
            headline: "Export a store ready pack",
            treatment: "cinematic-poster",
            subheadline: "Finish with a premium final frame.",
            sourceScreenshotPath: source(1),
          },
        ],
      };
    }

    return {};
  }
}
