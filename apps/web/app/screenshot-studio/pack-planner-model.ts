export type PackPlatform = "iphone" | "ipad" | "android-phone" | "android-tablet";

export type PackScreen = {
  index: number;
  sceneType: "cover" | "feature";
  headline: string;
  subheadline: string;
  status?: "Draft" | "Approved";
  approvedAt?: string;
};

export const platformPresets: Record<PackPlatform, { label: string; width: number; height: number; store: string }> = {
  iphone: { label: "iPhone", width: 1320, height: 2868, store: "App Store" },
  ipad: { label: "iPad", width: 2048, height: 2732, store: "App Store" },
  "android-phone": { label: "Android phone", width: 1080, height: 1920, store: "Google Play" },
  "android-tablet": { label: "Android tablet", width: 1600, height: 2560, store: "Google Play" },
};

export function buildInitialPackScreens(count: number): PackScreen[] {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    sceneType: index === 0 ? "cover" : "feature",
    headline: "",
    subheadline: "",
  }));
}
