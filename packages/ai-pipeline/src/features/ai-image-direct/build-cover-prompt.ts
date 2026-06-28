import type { NormalizedAiImageDirectInput } from "./types";

export function buildCoverPrompt(input: NormalizedAiImageDirectInput): string {
  const avoidList = input.avoidGenericCliches.map((item) => `- ${item}`).join("\n");
  const brandPatch = input.brandColors?.length ? `
BRAND COLOR REFERENCE:
Use these landing/brand colors as the campaign palette reference: ${input.brandColors.join(", ")}.
They should influence backgrounds, accents, lighting, and decorative elements while still respecting IMAGE 1.
${input.websiteUrl ? `Landing page source: ${input.websiteUrl}.` : ""}
` : "";
  const promptVersion = input.promptVersion ?? "v1";
  const promptVersionPatch = promptVersion === "v1" ? "PROMPT VERSION: v1 — baseline cover with no phone mockup." : promptVersion === "v2" ? "PROMPT VERSION: v2 — cleaner cover; fewer objects so it does not contaminate feature screens." : promptVersion === "v3" ? "PROMPT VERSION: v3 — minimal symbolic cover; avoid cards, labels, and readable decorative text." : promptVersion === "v4" ? "PROMPT VERSION: v4 — cover can be expressive; buddy only if style reference supports buddy campaigns." : promptVersion === "v6" ? "PROMPT VERSION: v6 — premium locked campaign system; mature editorial cover, no fake UI/text objects." : promptVersion === "v7" ? "PROMPT VERSION: v7 — reference-adaptive safe-area campaign; premium cover with tighter typography and no cropped-feeling composition." : promptVersion === "v8" ? "PROMPT VERSION: v8 — creative-quality cover; reference-led hero/buddy/composite allowed when it improves marketing impact." : promptVersion === "v9" ? "PROMPT VERSION: v9 — creative-quality cover with reference dominance; allow realistic store CTA, prevent cheap fake text/cards." : promptVersion === "v10" ? "PROMPT VERSION: v10 — app-specific buddy cover; borrow reference style, never copy reference mascot identity." : promptVersion === "v11" ? "PROMPT VERSION: v11 — set-level panoramic campaign; app-specific hero plus product proof, designed as screen 1 of a coherent 5-image set." : promptVersion === "v12" ? "PROMPT VERSION: v12 — explicit left-to-right panorama set; cover must include strong real product proof." : "PROMPT VERSION: v5 — clean symbolic cover; no reusable feature-screen objects.";
  const coverStrictPatch = promptVersion === "v3" ? `
COVER STRICTNESS:
Use one clean central symbol only: campervan + simple route line/map base.
Do not create route cards, UI cards, labels, badges, itinerary panels, or any readable decorative text.
Keep background simple and leave breathing room.
` : promptVersion === "v4" ? `
COVER V4 DIRECTION:
A buddy/mascot is allowed only if IMAGE 1 clearly uses a buddy or mascot as part of its style.
If IMAGE 1 does not use a buddy, create a clean campervan + route/map symbol instead.
Do not create route cards, UI cards, labels, badges, itinerary panels, or readable decorative text.
` : promptVersion === "v6" ? `
PREMIUM COVER SYSTEM:
Create a mature, editorial App Store cover using a deep forest-green / warm cream / soft orange travel palette.
Use one hero campervan or route-planning symbol on a subtle map-route base.
No cute face on the van unless IMAGE 1 is explicitly character-led.
Do not create chips, AI badges, route cards, UI cards, labels, speech bubbles, signs, numbers, fake itinerary panels, or any readable decorative text.
No standalone “AI” icon or microchip. Express AI through an elegant glowing optimized route only.
Keep the composition premium: fewer objects, large negative space, strong hierarchy, no clutter.
This cover should establish the same background system used by feature screens: dark green depth, cream typography, subtle pins/route lines.
` : promptVersion === "v7" ? `
REFERENCE-ADAPTIVE COVER SYSTEM V7:
Create a polished App Store cover that adapts to IMAGE 1 instead of forcing a fixed genre, palette, or subject.
Use IMAGE 1 to infer the campaign palette, illustration/rendering style, typography feel, object density, depth, shadows, and background language.
Create one app-specific hero symbol, object, character, abstract motif, or product metaphor only if it fits the reference style and the app value proposition.
Do not create chips, generic AI badges, UI cards, labels, speech bubbles, signs, numbers, fake panels, fake claims, or any readable decorative text.
If the product is AI-powered, express intelligence through composition, transformation, guidance, personalization, or subtle abstract signals — not through a literal “AI” chip unless the input explicitly asks for it.
Keep typography inside a generous safe area: headline should not touch edges, should feel intentionally spaced, and should leave breathing room above/below.
Keep the visual anchor fully contained and intentionally scaled; no cramped or cropped feeling.
This should feel like a top-tier paid App Store creative: clear hierarchy, premium negative space, no clutter, and no reference-specific copying.
` : promptVersion === "v8" ? `
CREATIVE-QUALITY COVER CONTRACT V8:
This cover is a marketing hero, not a product-preservation screen.
Prioritize top-tier App Store creative quality: emotional hook, strong visual hierarchy, depth through layered composition, and clear reference-style adaptation.
Use IMAGE 1 to infer whether the campaign should use a character, mascot, buddy, hand, product object, abstract shape, flat illustration, 3D render, photo composite, or minimal product symbol.
If IMAGE 1 is character-led, playful, mascot-led, or object-led, create an app-specific buddy/hero in that same spirit. The buddy should feel native to the app category and value proposition, not generic.
If IMAGE 1 is clean/product-led/minimal, keep the cover cleaner and use a product symbol or app UI composition instead of forcing a mascot.
A real or stylized app screenshot/device may be used as part of the cover composition if it improves marketing impact. It may be layered behind or around the hero visual.
Readable text outside the requested headline/subheadline should be avoided unless it is inside the provided app screenshot. Do not invent fake awards, ratings, review counts, brand claims, or store badges.
Generic decorative cards/panels are allowed only as non-readable visual shapes; if they contain text, it must be abstract/unreadable or come from the provided screenshot/input.
Do not optimize for being empty or safe. Optimize for a memorable, high-converting campaign cover.
` : promptVersion === "v9" ? `
CREATIVE-QUALITY COVER CONTRACT V9:
This cover is a marketing hero, not a product-preservation screen.
IMAGE 1 is the art director. Its style, palette, typography feel, object language, character language, composition rhythm, and production quality should dominate over generic category motifs.
Prioritize top-tier App Store creative quality: emotional hook, strong visual hierarchy, depth through layered composition, and a memorable reference-native hero idea.
If IMAGE 1 is character-led, playful, mascot-led, hand-led, object-led, or highly composited, create an app-specific buddy/hero/composite in that same spirit.
If IMAGE 1 is minimal/product-led, keep the cover cleaner and product-symbol-led.
A real or stylized app screenshot/device may be used as part of the cover composition if it improves marketing impact.
A realistic App Store download badge or store-style CTA may be used if it looks official, crisp, correctly proportioned, and integrated like a real marketing asset. Do not create warped, misspelled, fake-looking, or parody store badges.
Avoid cheap fake text: no random readable cards, route labels, stats, numbers, awards, ratings, review counts, or brand claims unless they come from the input or provided screenshot.
Decorative cards/panels may exist as shapes, but any text inside them must be abstract/unreadable unless sourced from the input/screenshot.
Do not make the cover sterile just to be safe. Optimize for a memorable, high-converting campaign cover with controlled realism.
` : promptVersion === "v10" ? `
APP-SPECIFIC BUDDY COVER CONTRACT V10:
This cover is a marketing hero, not a product-preservation screen.
IMAGE 1 is the art director for visual language only: palette, typography feel, shape simplicity, rendering style, depth, shadows, emotional tone, and composition rhythm.
Do not copy the literal mascot, character species, object identity, pose, outfit, or brandable hero from IMAGE 1.
If IMAGE 1 is character-led, create a new app-specific buddy/hero derived from the app category and value proposition. The buddy must be native to this app, not a generic animal copied from the reference.
Examples of transformation logic: travel app → friendly guide, vehicle, luggage, map-pin, compass, route spirit, or category-native character; finance app → coin/wallet/assistant; fitness app → coach/body/motion symbol. Always adapt to the actual input.
The buddy should borrow the reference’s production quality and emotional readability, not its identity.
If IMAGE 1 is not character-led, use an app-specific product symbol, device composition, or abstract hero instead of forcing a mascot.
A real or stylized app screenshot/device may be used as part of the cover composition if it improves marketing impact.
A realistic App Store download badge or store-style CTA may be used if it looks official, crisp, correctly proportioned, and integrated like a real marketing asset.
Avoid cheap fake text: no random readable cards, route labels, stats, numbers, awards, ratings, review counts, or brand claims unless they come from the input or provided screenshot.
Decorative cards/panels may exist as shapes, but any text inside them must be abstract/unreadable unless sourced from the input/screenshot.
Optimize for a memorable, high-converting campaign cover with an app-specific hero.
` : promptVersion === "v11" ? `
SET-LEVEL HERO COVER CONTRACT V11:
This cover is the first panel of a coherent multi-screen campaign, not a standalone poster.
IMAGE 1 is the art director for visual language only: palette, typography feel, shape simplicity, rendering style, depth, shadows, emotional tone, and composition rhythm.
Create an app-specific buddy/hero derived from the app category and value proposition. Do not copy the literal mascot, character species, object identity, pose, outfit, or brandable hero from IMAGE 1.
Include product proof: a real or stylized app screenshot/device should be composited into the cover if it improves marketing impact.
The cover can have the strongest hero moment, but it should establish a background world that can continue horizontally across the remaining screenshots.
A realistic App Store download badge or store-style CTA may be used if it looks official, crisp, correctly proportioned, and integrated like a real marketing asset.
Avoid cheap fake text: no random readable cards, labels, stats, numbers, awards, ratings, review counts, or brand claims unless they come from the input or provided screenshot.
Decorative cards/panels may exist as shapes, but any text inside them must be abstract/unreadable unless sourced from the input/screenshot.
Optimize the whole set, not just this image: continuity, rhythm, and set-level memorability matter.
` : promptVersion === "v12" ? `
EXPLICIT PANORAMA HERO COVER CONTRACT V12:
This cover is screen 1 of a left-to-right panoramic App Store set.
Design the background as the far-left crop of one wide campaign world that continues through all feature screens.
IMAGE 1 is the art director for visual language only: palette, typography feel, rendering style, depth, shadows, emotional tone, and composition rhythm.
Create an app-specific buddy/hero derived from the app category and value proposition. Do not copy the literal mascot, species, object identity, pose, outfit, or brandable hero from IMAGE 1.
Must include strong product proof: use a real/stylized phone or device frame with app UI/screenshot visible as a central marketing layer. Do not replace product proof with a generic map/window.
A realistic App Store download badge or store-style CTA may be used if it looks official, crisp, correctly proportioned, and integrated like a real marketing asset.
Avoid cheap fake text: no random readable cards, labels, stats, numbers, awards, ratings, review counts, or brand claims unless they come from the input or provided screenshot. Decorative cards must be abstract/unreadable.
Optimize for the whole set: the cover should introduce the panorama, hero, product proof, and campaign typography that continue across the next screens.
` : promptVersion === "v2" ? `
COVER SIMPLICITY:
Use fewer objects than the reference if needed.
Avoid route cards and decorative panels that could be copied into later screenshots.
` : "";
  const panoramaPosition = input.packScreenIndex && input.packScreenCount ? Math.round(((input.packScreenIndex - 1) / Math.max(1, input.packScreenCount - 1)) * 100) : undefined;
  const setPatch = (promptVersion === "v11" || promptVersion === "v12") && input.packScreenIndex && input.packScreenCount ? `
SET-LEVEL CAMPAIGN CONTINUITY:
This is screen ${input.packScreenIndex} of ${input.packScreenCount} in one coherent App Store screenshot set.
Design it as part of a shared horizontal campaign world/panorama that could be sliced across all ${input.packScreenCount} vertical screenshots.
The full set should share one background system: same palette, lighting, horizon/ground/sky or abstract field, decorative vocabulary, depth, and typography treatment.
This screen is the cover/hero segment, so it may have the strongest app-specific hero and product proof, but it must still feel like the same world as screens 2-${input.packScreenCount}.
${promptVersion === "v12" ? `PANORAMA POSITION: this is the ${panoramaPosition}% horizontal crop of the shared campaign world. Screen 1 is far-left, the last screen is far-right. Background elements should imply a wider seamless scene continuing beyond both vertical edges.` : ""}
` : "";
  const continuityPatch = input.continuityImagePaths?.length ? `
CONTINUITY:
Use IMAGE 2 and any later images as approved campaign references.
This cover must look like the same campaign as those approved images.
Preserve the same visual style, typography, colors, buddy/object style, background language, and decorative vocabulary.
Do not copy the exact layout.
` : "";

  return `
Create one vertical App Store campaign cover.

${promptVersionPatch}

Use IMAGE 1 as the visual style reference.
${setPatch}${continuityPatch}
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
${brandPatch}
HEADLINE:
${input.headline}

SUBHEADLINE:
${input.subheadline}

TASK:
Create a polished App Store campaign cover.

No real app screenshot is required in this image.
Do not create a phone, tablet, app screen, device frame, or UI mockup in the cover.
${coverStrictPatch}

ART DIRECTION:
Create the image in the same visual system as the reference image.
Preserve the reference’s visual style, composition rhythm, typography feel, color hierarchy, decorative density, and overall campaign energy.

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
No phone mockup, no app screenshot, no device frame.
Clean premium store-ready finish.
`.trim();
}
