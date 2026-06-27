import type { NormalizedAiImageDirectInput } from "./types";

export function buildFeaturePrompt(input: NormalizedAiImageDirectInput): string {
  const continuityPatch = input.approvedCoverImagePath ? `
CONTINUITY:
Use IMAGE 3 as the approved campaign cover.
This new scene must look like the same campaign as IMAGE 3.
Preserve the same visual style, typography, colors, buddy/object style, background language, and decorative vocabulary.
` : "";
  const avoidList = input.avoidGenericCliches.map((item) => `- ${item}`).join("\n");

  return `
Create one vertical App Store screenshot poster.

Use IMAGE 1 as the visual style reference.
Use IMAGE 2 as the real app screenshot.
${continuityPatch}
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
Create a polished store screenshot poster in the same visual system as the reference image.

Preserve the reference’s visual style, composition rhythm, typography feel, color hierarchy, decorative density, screenshot treatment, and overall campaign energy.

Change the subject matter to fit this app.
Do not copy literal content from the reference.

SCREENSHOT:
Use the real app screenshot exactly as provided.
Do not redraw, replace, translate, simplify, or reinterpret the UI.
Keep the screenshot large, readable, and visually important.
Do not cover important UI with decorations, objects, or characters.

VISUAL ANCHOR:
Create one original app-specific visual buddy, object, or decorative concept only if it fits the reference style.

The visual anchor must come from:
${input.productVisualAnchor}

Prefer visual anchor ideas from that list over broad category clichés.

Avoid these generic clichés and forbidden motifs:
${avoidList}

The visual anchor must support the screenshot, not dominate it.
It must not cover visible app UI.

TEXT:
Use only this headline:
${input.headline}

Use only this subheadline:
${input.subheadline}

No other readable text outside the real screenshot.
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
Do not add mascots, objects, or photo scenes unless the reference style clearly supports them.

COMPOSITION:
Large readable headline.
Subheadline below if provided.
Real app screenshot/device as product proof.
Optional app-specific visual anchor integrated naturally.
Clean premium store-ready finish.
`.trim();
}
