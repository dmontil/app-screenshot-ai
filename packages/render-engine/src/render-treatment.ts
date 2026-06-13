import type { LayoutFamily, ScreenTreatment } from "@app-screenshot-ai/schemas";

export type RenderTreatmentName = "cinematic-atlas" | "premium-proof-cards" | "map-route-editorial" | "classic-device";

export function resolveRenderTreatment(params: {
  layoutFamily: LayoutFamily | undefined;
  treatment: ScreenTreatment | undefined;
}): RenderTreatmentName {
  if (params.layoutFamily === "cinematic-atlas" || params.treatment === "cinematic-poster") return "cinematic-atlas";
  if (params.layoutFamily === "premium-proof-cards" || params.treatment === "premium-proof-card") return "premium-proof-cards";
  if (params.layoutFamily === "map-route-editorial" || params.treatment === "map-route-editorial") return "map-route-editorial";
  return "classic-device";
}
