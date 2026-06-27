import type { NormalizedAiImageDirectInput } from "./types";

export function buildCoverPrompt(input: NormalizedAiImageDirectInput): string {
  const avoidList = input.avoidGenericCliches.map((item) => `- ${item}`).join("\n");

  return `
Create one vertical App Store campaign cover.

Use IMAGE 1 as the visual style reference.

OUTPUT:
${input.outputWidth} × ${input.outputHeight} px.
Vertical App Store screenshot poster.
Design natively for this size.
Do not add borders or empty padding to fake the format.

APP:
${input.appName}

CATEGORY:
${input.category}

AUDIENCE:
${input.targetAudience}

VALUE PROPOSITION:
${input.valueProposition}

HEADLINE:
${input.headline}

SUBHEADLINE:
${input.subheadline}

TASK:
Create a polished App Store campaign cover.

No real app screenshot is required in this image.

ART DIRECTION:
Create the image in the same visual system as the reference image.
Preserve the reference’s visual style, composition rhythm, typography feel, color hierarchy, decorative density, screenshot treatment if relevant, and overall campaign energy.

Change the subject matter to fit this app.
Do not copy literal content from the reference.

VISUAL ANCHOR:
Create one original app-specific visual buddy, object, or decorative concept based on the app value proposition.

The visual anchor must come from:
${input.productVisualAnchor}

Prefer visual anchor ideas from that list over broad category clichés.

Avoid these generic clichés and forbidden motifs:
${avoidList}

It must feel specific to this app, not generic.
It must match the reference style.

TEXT:
Use only this headline:
${input.headline}

Use only this subheadline:
${input.subheadline}

No other readable text.
No labels.
No signs.
No badges.
No awards.
No ratings.
No review counts.
No fake claims.
No reference brand names.
No laurels.
No stars.
No “user rated”.
No “made for”.
No bottom proof blocks.

STYLE:
Match the reference style.
Do not change it into another genre.
Do not turn flat/vector references into realistic scenes.
Do not turn playful references into cinematic ads.
Do not turn minimal references into busy posters.

COMPOSITION:
Large readable headline near the top.
Subheadline below if provided.
Original app-specific visual anchor as the main emotional visual.
Clean premium store-ready finish.
`.trim();
}
