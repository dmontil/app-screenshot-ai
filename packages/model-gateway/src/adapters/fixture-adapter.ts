import type { ModelProviderPort } from "../model-gateway";

type FixtureInput = {
  app?: {
    appName?: string;
    category?: string;
    screenshots?: Array<{ path?: string }>;
  };
};

type FixtureCategory = "travel" | "productivity" | "fitness" | "finance" | "education" | "utility" | "social";

export class FixtureAdapter implements ModelProviderPort {
  async generateObject(params: { model?: string; task: string; input: unknown }): Promise<unknown> {
    const input = params.input as FixtureInput;
    const category = fixtureCategory(input.app?.category);

    if (params.task === "visual-system.generate") return visualSystemFor(category);
    if (params.task === "storyboard.generate") return storyboardFor(category, input.app?.screenshots ?? []);

    return {};
  }
}

function fixtureCategory(value: string | undefined): FixtureCategory {
  if (
    value === "travel" ||
    value === "productivity" ||
    value === "fitness" ||
    value === "finance" ||
    value === "education" ||
    value === "utility" ||
    value === "social"
  ) {
    return value;
  }
  return "travel";
}

function visualSystemFor(category: FixtureCategory) {
  const systems = {
    travel: {
      id: "fixture-warm-editorial-v1",
      layoutFamily: "map-route-editorial",
      motif: "route-line",
      palette: { background: "#F7F1E7", primary: "#3B2416", accent: "#D99A32", text: "#24160F" },
      typography: { headlineFamily: "Inter", headlineWeight: 760 },
      layout: { safeMargin: 96, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.62 },
    },
    productivity: {
      id: "fixture-productivity-calm-v1",
      layoutFamily: "premium-proof-cards",
      motif: "cards",
      palette: { background: "#F5F7FB", primary: "#18212F", accent: "#7C3AED", text: "#111827" },
      typography: { headlineFamily: "Inter", headlineWeight: 780 },
      layout: { safeMargin: 88, headlineY: 170, deviceY: 690, deviceWidthRatio: 0.58 },
    },
    fitness: {
      id: "fixture-fitness-energy-v1",
      layoutFamily: "cinematic-atlas",
      motif: "atlas-glow",
      palette: { background: "#101820", primary: "#F8FAFC", accent: "#22C55E", text: "#F8FAFC" },
      typography: { headlineFamily: "Inter", headlineWeight: 860 },
      layout: { safeMargin: 92, headlineY: 190, deviceY: 760, deviceWidthRatio: 0.6 },
    },
    finance: {
      id: "fixture-finance-trust-v1",
      layoutFamily: "classic-device",
      motif: "none",
      palette: { background: "#F4F8F6", primary: "#064E3B", accent: "#10B981", text: "#0B1F18" },
      typography: { headlineFamily: "Inter", headlineWeight: 760 },
      layout: { safeMargin: 100, headlineY: 175, deviceY: 700, deviceWidthRatio: 0.56 },
    },
    education: {
      id: "fixture-education-bright-v1",
      layoutFamily: "premium-proof-cards",
      motif: "cards",
      palette: { background: "#FFF7D6", primary: "#3B2F08", accent: "#F59E0B", text: "#241A05" },
      typography: { headlineFamily: "Inter", headlineWeight: 800 },
      layout: { safeMargin: 90, headlineY: 170, deviceY: 705, deviceWidthRatio: 0.6 },
    },
    utility: {
      id: "fixture-utility-focus-v1",
      layoutFamily: "classic-device",
      motif: "cards",
      palette: { background: "#EEF4FF", primary: "#172554", accent: "#2563EB", text: "#0F172A" },
      typography: { headlineFamily: "Inter", headlineWeight: 790 },
      layout: { safeMargin: 92, headlineY: 165, deviceY: 660, deviceWidthRatio: 0.54 },
    },
    social: {
      id: "fixture-social-pop-v1",
      layoutFamily: "cinematic-atlas",
      motif: "atlas-glow",
      palette: { background: "#FFF1F7", primary: "#831843", accent: "#EC4899", text: "#3B0A21" },
      typography: { headlineFamily: "Inter", headlineWeight: 820 },
      layout: { safeMargin: 90, headlineY: 180, deviceY: 720, deviceWidthRatio: 0.6 },
    },
  } as const;

  return systems[category];
}

function storyboardFor(category: FixtureCategory, screenshots: Array<{ path?: string }>) {
  const source = (index: number) => screenshots[index]?.path ?? screenshots[0]?.path ?? "input/screenshot.png";
  const storyboards = {
    travel: [
      { id: "hook", index: 1, role: "hook", headline: "Turn ideas into app store screenshots", treatment: "map-route-editorial", subheadline: "Start with raw screens and ship a coherent campaign.", sourceScreenshotPath: source(0) },
      { id: "search", index: 2, role: "search", headline: "Highlight your core workflow", treatment: "premium-proof-card", subheadline: "Show the action users understand in seconds.", sourceScreenshotPath: source(1) },
      { id: "value", index: 3, role: "value", headline: "Show what users get done", treatment: "callout-zoom", subheadline: "Turn product moments into conversion assets.", sourceScreenshotPath: source(2) },
      { id: "map", index: 4, role: "map", headline: "Keep every screen consistent", treatment: "map-route-editorial", subheadline: "Repeat the motif without repeating the layout.", sourceScreenshotPath: source(0) },
      { id: "save", index: 5, role: "save", headline: "Export a store ready pack", treatment: "cinematic-poster", subheadline: "Finish with a premium final frame.", sourceScreenshotPath: source(1) },
    ],
    productivity: [
      { id: "focus", index: 1, role: "hook", headline: "Clear your day in minutes", treatment: "premium-proof-card", subheadline: "Show the fastest path to a calm workflow.", sourceScreenshotPath: source(0) },
      { id: "capture", index: 2, role: "capture", headline: "Capture tasks without friction", treatment: "hero-device", subheadline: "One simple action, always within reach.", sourceScreenshotPath: source(1) },
      { id: "prioritize", index: 3, role: "prioritize", headline: "Know what matters next", treatment: "callout-zoom", subheadline: "Make priority feel obvious at a glance.", sourceScreenshotPath: source(2) },
      { id: "routine", index: 4, role: "routine", headline: "Build a calmer routine", treatment: "premium-proof-card", subheadline: "Keep the proof card visual system consistent.", sourceScreenshotPath: source(0) },
      { id: "done", index: 5, role: "done", headline: "End each day in control", treatment: "cinematic-poster", subheadline: "Close with a confident premium frame.", sourceScreenshotPath: source(1) },
    ],
    fitness: [
      { id: "energy", index: 1, role: "hook", headline: "Start strong today", treatment: "cinematic-poster", subheadline: "A bold dark frame for motivation.", sourceScreenshotPath: source(0) },
      { id: "plan", index: 2, role: "plan", headline: "See your workout plan", treatment: "hero-device", subheadline: "Put the routine in the center.", sourceScreenshotPath: source(1) },
      { id: "track", index: 3, role: "track", headline: "Track every rep", treatment: "callout-zoom", subheadline: "Highlight progress moments clearly.", sourceScreenshotPath: source(2) },
      { id: "streak", index: 4, role: "streak", headline: "Keep your streak alive", treatment: "premium-proof-card", subheadline: "Show achievement and momentum.", sourceScreenshotPath: source(0) },
      { id: "finish", index: 5, role: "finish", headline: "Feel the progress", treatment: "cinematic-poster", subheadline: "End with energy and confidence.", sourceScreenshotPath: source(1) },
    ],
    finance: [
      { id: "trust", index: 1, role: "hook", headline: "Money clarity at a glance", treatment: "hero-device", subheadline: "A calm trust-first layout.", sourceScreenshotPath: source(0) },
      { id: "balance", index: 2, role: "balance", headline: "Understand every balance", treatment: "premium-proof-card", subheadline: "Make the key number feel safe.", sourceScreenshotPath: source(1) },
      { id: "alerts", index: 3, role: "alerts", headline: "Spot changes instantly", treatment: "callout-zoom", subheadline: "Highlight the signal, not noise.", sourceScreenshotPath: source(2) },
      { id: "plan", index: 4, role: "plan", headline: "Plan without surprises", treatment: "hero-device", subheadline: "Keep the UI visible and trustworthy.", sourceScreenshotPath: source(0) },
      { id: "secure", index: 5, role: "secure", headline: "Stay in control", treatment: "cinematic-poster", subheadline: "Finish with a secure brand frame.", sourceScreenshotPath: source(1) },
    ],
    education: [
      { id: "learn", index: 1, role: "hook", headline: "Learn something new today", treatment: "premium-proof-card", subheadline: "Warm bright design for curiosity.", sourceScreenshotPath: source(0) },
      { id: "lesson", index: 2, role: "lesson", headline: "Lessons feel easy", treatment: "hero-device", subheadline: "Show the teaching moment clearly.", sourceScreenshotPath: source(1) },
      { id: "practice", index: 3, role: "practice", headline: "Practice with feedback", treatment: "callout-zoom", subheadline: "Bring the learning loop forward.", sourceScreenshotPath: source(2) },
      { id: "progress", index: 4, role: "progress", headline: "Watch progress build", treatment: "premium-proof-card", subheadline: "Use proof cards for motivation.", sourceScreenshotPath: source(0) },
      { id: "master", index: 5, role: "master", headline: "Master skills faster", treatment: "cinematic-poster", subheadline: "End with a confident outcome.", sourceScreenshotPath: source(1) },
    ],
    utility: [
      { id: "fast", index: 1, role: "hook", headline: "Get the job done faster", treatment: "hero-device", subheadline: "A crisp blue system for practical daily tools.", sourceScreenshotPath: source(0) },
      { id: "tools", index: 2, role: "tools", headline: "Keep tools one tap away", treatment: "premium-proof-card", subheadline: "Surface the shortcuts people use daily.", sourceScreenshotPath: source(1), secondarySourceScreenshotPath: source(0) },
      { id: "scan", index: 3, role: "scan", headline: "Spot issues instantly", treatment: "callout-zoom", subheadline: "Zoom into the detail that saves time.", sourceScreenshotPath: source(2) },
      { id: "auto", index: 4, role: "automation", headline: "Automate the boring parts", treatment: "hero-device", subheadline: "Repeat practical value without decorative travel motifs.", sourceScreenshotPath: source(0), secondarySourceScreenshotPath: source(2) },
      { id: "done", index: 5, role: "done", headline: "Ship with confidence", treatment: "cinematic-poster", subheadline: "End on a clean utility payoff.", sourceScreenshotPath: source(1) },
    ],
    social: [
      { id: "connect", index: 1, role: "hook", headline: "Bring your people closer", treatment: "cinematic-poster", subheadline: "A lively pink system for social energy.", sourceScreenshotPath: source(0) },
      { id: "share", index: 2, role: "share", headline: "Share moments instantly", treatment: "hero-device", subheadline: "Make posting feel effortless.", sourceScreenshotPath: source(1) },
      { id: "react", index: 3, role: "react", headline: "See reactions come alive", treatment: "callout-zoom", subheadline: "Zoom into the social feedback loop.", sourceScreenshotPath: source(2) },
      { id: "groups", index: 4, role: "groups", headline: "Find your favorite circles", treatment: "premium-proof-card", subheadline: "Use cards to show community proof.", sourceScreenshotPath: source(0) },
      { id: "together", index: 5, role: "together", headline: "Make every update matter", treatment: "cinematic-poster", subheadline: "Close with emotional momentum.", sourceScreenshotPath: source(1) },
    ],
  } as const;

  return { screens: storyboards[category] };
}
