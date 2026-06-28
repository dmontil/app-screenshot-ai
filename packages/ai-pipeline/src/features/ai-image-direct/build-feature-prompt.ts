import type { NormalizedAiImageDirectInput } from "./types";

export function buildFeaturePrompt(input: NormalizedAiImageDirectInput): string {
  const screenshotImageIndex = input.screenshotImageIndex ?? 2;
  const screenshotLabel = input.screenshotLast ? `IMAGE ${screenshotImageIndex} (the LAST image)` : `IMAGE ${screenshotImageIndex}`;
  const promptVersion = input.promptVersion ?? "v1";
  const promptVersionPatch = promptVersion === "v1" ? "PROMPT VERSION: v1 — image-loop continuity; generated cover may be used as style context." : promptVersion === "v2" ? "PROMPT VERSION: v2 — no generated feature-to-feature context; preserve real screenshots over campaign references." : promptVersion === "v3" ? "PROMPT VERSION: v3 — strict screenshot preservation; no decorative overlays on top of real UI." : promptVersion === "v4" ? "PROMPT VERSION: v4 — feature minimal mode; screenshot first, buddy only if reference clearly has one." : promptVersion === "v6" ? "PROMPT VERSION: v6 — premium locked campaign system; consistent dark-green background, phone-first composition." : promptVersion === "v7" ? "PROMPT VERSION: v7 — reference-adaptive safe-area campaign; full phone visible, consistent premium background, screenshot-first." : promptVersion === "v8" ? "PROMPT VERSION: v8 — creative-quality feature; screenshot-first, but preserve campaign energy and reference-led art direction." : promptVersion === "v9" ? "PROMPT VERSION: v9 — reference-dominant feature; screenshot-first with controlled creative depth and no UI overlap." : promptVersion === "v10" ? "PROMPT VERSION: v10 — feature-safe campaign energy; no foreground buddy/object by default, no UI overlap." : promptVersion === "v11" ? "PROMPT VERSION: v11 — set-level panoramic feature; same campaign background world, varied mockup angle, screenshot-safe." : promptVersion === "v12" ? "PROMPT VERSION: v12 — explicit left-to-right panorama feature; full phone visible, varied angle, no fake microcopy." : "PROMPT VERSION: v5 — product screenshot presentation; background-only decoration for feature screens.";
  const strictScreenshotPatch = promptVersion === "v3" || promptVersion === "v4" || promptVersion === "v5" || promptVersion === "v6" || promptVersion === "v7" || promptVersion === "v8" || promptVersion === "v9" || promptVersion === "v10" || promptVersion === "v11" || promptVersion === "v12" ? `
STRICT SCREENSHOT PRESERVATION:
Place the real screenshot inside one clean, modern black rounded phone frame.
Do not add any decorative object, route card, mascot, vehicle, map, sticker, glow, or icon over the phone or overlapping the phone edges.
Decorations may appear only in the background outside the phone, with clear separation.
The screenshot content must remain pixel-faithful and readable.
` : "";
  const featureMinimalPatch = promptVersion === "v4" ? `
FEATURE MINIMAL MODE:
The real screenshot is the hero.
Do not add a campervan, robot, mascot, buddy, character, route card, map card, itinerary card, sticker, or large object to feature screens unless IMAGE 1 clearly already uses a buddy/mascot as a central campaign device.
If IMAGE 1 has no buddy/mascot, use only abstract background shapes, gradients, subtle route lines, or tiny pins outside the phone.
Never place decorative elements over the phone, touching the phone frame, or covering the screenshot.
Keep the same phone frame scale and style across feature screens.
` : promptVersion === "v5" ? `
FEATURE PRODUCT PRESENTATION MODE:
This feature screen must be a clean product screenshot presentation.
Do not create any standalone illustration object in feature screens.
No buddy. No mascot. No character. No robot. No campervan. No vehicle. No route cards. No map cards. No stickers. No floating panels. No foreground objects.
Use only background color, subtle gradients, soft abstract shapes, and very subtle route-line texture outside the phone.
The phone and real screenshot must be the only concrete object.
The productVisualAnchor should influence background mood only, not create objects.
` : promptVersion === "v6" ? `
PREMIUM LOCKED FEATURE SYSTEM:
This feature screen must look like part of one premium App Store campaign.
Use a consistent deep forest-green background with warm cream headline/subheadline and subtle soft-orange accents.
Use the same layout for every feature: headline area at the top, large centered phone below, generous negative space, no clutter.
The phone and real screenshot are the only concrete foreground object.
No buddy. No mascot. No character. No robot. No campervan. No vehicle. No route cards. No map cards. No stickers. No floating panels. No foreground illustrations.
Use only background-level decoration: faint route lines, tiny glowing pins, soft map contours, subtle gradients, and abstract shapes outside the phone.
Never place decorations on the phone, touching the phone frame, behind text in a way that reduces readability, or over the screenshot.
Do not use light pastel backgrounds for feature screens; keep the campaign anchored in the dark premium green system.
The productVisualAnchor should influence background mood only, not create objects.
` : promptVersion === "v7" ? `
REFERENCE-ADAPTIVE SAFE-AREA FEATURE SYSTEM V7:
This feature screen must look like part of one top-tier App Store campaign derived from IMAGE 1.
Use IMAGE 1 to infer the campaign palette, illustration/rendering style, typography feel, background language, decorative density, and use of depth/shadows.
Use a consistent layout for every feature: headline and subheadline at the top, large centered phone below, generous negative space, no clutter.
CRITICAL SAFE AREA: the entire phone frame must be visible inside the poster. Do not crop the phone at the bottom, top, or sides. Leave visible margin below the home indicator and above the headline.
Make the phone about 8–12% smaller than a full-bleed hero if needed so the whole device fits comfortably.
The phone and real screenshot are the only concrete foreground object unless IMAGE 1 is explicitly character-led and the extra object does not touch the phone.
No generic mascot, robot, vehicle, route card, map card, sticker, floating panel, fake UI, or foreground illustration unless it is clearly required by the reference style and product category.
Prefer background-level decoration: subtle abstract shapes, soft gradients, faint product-relevant patterns, tiny accents, or atmospheric details outside the phone.
Never place decorations on the phone, touching the phone frame, behind text in a way that reduces readability, or over the screenshot.
Do not force any fixed color palette or visual motif; adapt to the reference and app category.
The productVisualAnchor should influence background mood only, not create dominant foreground objects.
` : promptVersion === "v8" ? `
CREATIVE-QUALITY FEATURE CONTRACT V8:
This is a feature screen, so the real app screenshot remains the product proof and must stay readable.
Unlike the cover, do not let the hero/buddy dominate the screen or cover the phone.
Preserve campaign energy from IMAGE 1: palette, typography feel, background language, depth, decorative density, and overall emotional tone.
Use a large phone/device with the full frame visible. Avoid awkward cropping unless IMAGE 1 strongly uses intentional full-bleed device crops.
Characters, buddies, hands, product objects, or mascots may appear only if IMAGE 1 clearly uses that type of creative device, and they must stay outside the phone/UI and support the screenshot rather than compete with it.
Prefer layered composition over sterile backgrounds: background shapes, subtle objects, atmosphere, depth, and reference-native decorative elements are good when they do not reduce UI readability.
Keep headline/subheadline treatment consistent across the pack unless the reference clearly varies typography by screen.
No fake awards, ratings, review counts, store badges, or invented claims.
` : promptVersion === "v9" ? `
REFERENCE-DOMINANT FEATURE CONTRACT V9:
This is a feature screen, so the real app screenshot remains the product proof and must stay readable.
IMAGE 1 is the art director. Preserve its palette, typography feel, background language, object style, depth, shadows, and emotional tone more strongly than generic category motifs.
Use a large phone/device with the full frame visible unless IMAGE 1 strongly uses intentional full-bleed device crops.
Hard overlap rule: no foreground object, card, mascot, hand, sticker, panel, route, badge, or decorative element may overlap the real screenshot area or touch the phone frame. Leave a visible gap between decorations and the phone.
Characters, buddies, hands, product objects, or mascots may appear only if IMAGE 1 clearly uses that creative device, and they must stay outside the phone/UI and support the screenshot rather than compete with it.
Prefer layered composition over sterile backgrounds: background shapes, subtle objects, atmosphere, depth, and reference-native decorative elements are good when they do not reduce UI readability.
No cheap fake text: no random readable labels, route cards, stats, awards, ratings, review counts, or claims outside the real screenshot unless explicitly provided by input.
A realistic App Store download badge is allowed only on cover-style marketing screens, not on feature screens unless the input explicitly asks for it.
Keep headline/subheadline treatment consistent across the pack unless IMAGE 1 clearly varies typography by screen.
` : promptVersion === "v10" ? `
FEATURE-SAFE CAMPAIGN ENERGY CONTRACT V10:
This is a feature screen: the real app screenshot is the hero and must stay readable.
IMAGE 1 is the art director for visual language only: palette, typography feel, background language, depth, shadows, shape vocabulary, and emotional tone.
Do not copy the literal mascot/character/object identity from IMAGE 1.
By default, do not add foreground buddies, characters, hands, vehicles, product objects, cards, stickers, badges, or panels to feature screens.
Create energy through background and side-area design: abstract shapes, hills, clouds, rays, gradients, subtle patterns, atmospheric depth, and reference-native decorative language.
Hard moat rule: keep a clear empty moat around the phone frame. No decorative element may overlap the real screenshot area, touch the phone frame, or sit on top of app UI.
If an app-specific buddy/object is absolutely necessary for reference consistency, place it small in the background or side area only, clearly separated from the phone, and never with readable text.
No cheap fake text: no random readable labels, route cards, stats, awards, ratings, review counts, or claims outside the real screenshot unless explicitly provided by input.
A realistic App Store download badge is allowed on covers, not on feature screens unless the input explicitly asks.
Keep headline/subheadline treatment consistent across the pack unless IMAGE 1 clearly varies typography by screen.
` : promptVersion === "v11" ? `
SET-LEVEL PANORAMIC FEATURE CONTRACT V11:
Optimize the complete screenshot set, not just this image.
The real app screenshot remains product proof and must stay readable.
Create energy through a shared campaign background world: recurring horizon/ground/sky or abstract field, consistent lighting, repeated-but-varied decorative vocabulary, and reference-native shapes.
The phone/device may use a subtly different angle, rotation, or perspective than other feature screens to avoid a static template, but keep the UI readable and the full frame comfortably visible.
Hard moat rule: no decorative element may overlap the real screenshot area, touch the phone frame, or sit on top of app UI.
By default, do not add foreground buddies, characters, hands, vehicles, product objects, cards, stickers, badges, or panels to feature screens.
If an app-specific buddy/object is necessary for set continuity, keep it small, background/side-area only, clearly separated from the phone, and without readable text.
No cheap fake text: no random readable labels, route cards, stats, awards, ratings, review counts, or claims outside the real screenshot unless explicitly provided by input.
A realistic App Store download badge is allowed on covers, not feature screens unless explicitly requested.
` : promptVersion === "v12" ? `
EXPLICIT PANORAMA FEATURE CONTRACT V12:
This feature screen is one vertical crop in a left-to-right panoramic App Store set.
The real app screenshot remains product proof and must stay readable.
Use the same shared background world established by the cover and adjacent screens: same sky/field/abstract base, lighting, depth, decorative vocabulary, and typography treatment.
The phone/device should be fully visible and may use a subtly different angle, rotation, scale, or perspective for vitality.
Hard moat rule: no decorative element may overlap the real screenshot area, touch the phone frame, or sit on top of app UI.
Do not add foreground buddies, characters, hands, vehicles, product objects, cards, stickers, badges, or panels unless they are tiny background/side elements clearly separated from the phone.
No fake microcopy: no readable labels, numbers, route cards, stats, signs, awards, ratings, review counts, or claims outside the real screenshot.
Prefer pure background continuity over extra objects: horizon shifts, hills/clouds/shapes/gradients/patterns should carry the set.
` : "";
  const panoramaPosition = input.packScreenIndex && input.packScreenCount ? Math.round(((input.packScreenIndex - 1) / Math.max(1, input.packScreenCount - 1)) * 100) : undefined;
  const setPatch = (promptVersion === "v11" || promptVersion === "v12") && input.packScreenIndex && input.packScreenCount ? `
SET-LEVEL CAMPAIGN CONTINUITY:
This is screen ${input.packScreenIndex} of ${input.packScreenCount} in one coherent App Store screenshot set.
Design it as one crop/segment of a shared horizontal campaign world/panorama across all ${input.packScreenCount} vertical screenshots.
The background should feel continuous with adjacent screens: same palette, lighting, horizon/ground/sky or abstract field, decorative vocabulary, depth, and typography treatment.
Do not invent a completely new background for this screen.
This feature screen may vary phone placement, scale, and angle for vitality, but it must still belong to the same set.
Suggested vitality: subtle different phone angle/rotation/perspective from other screens while keeping the UI readable and the full frame visible.
${promptVersion === "v12" ? `PANORAMA POSITION: this is the ${panoramaPosition}% horizontal crop of the shared campaign world. Screen 1 is far-left, the last screen is far-right. Background elements should continue beyond both vertical edges and align conceptually with adjacent screens.` : ""}
` : "";
  const continuityPatch = input.approvedCoverImagePath || input.continuityImagePaths?.length ? `
CONTINUITY:
Use the approved campaign reference images only for style continuity.
They show the campaign look, not the app UI for this screen.
Ignore any phone, device, mockup, UI, labels, cards, or readable text from campaign reference images.
This new scene must look like the same campaign as those approved images.
Preserve the same visual style, typography, colors, buddy/object style, background language, and decorative vocabulary.
Do not copy the exact layout; create the next coherent screenshot in the same campaign.
` : "";
  const avoidList = input.avoidGenericCliches.map((item) => `- ${item}`).join("\n");
  const brandPatch = input.brandColors?.length ? `
BRAND COLOR REFERENCE:
Use these landing/brand colors as the campaign palette reference: ${input.brandColors.join(", ")}.
They should influence backgrounds, accents, lighting, and decorative elements while still respecting IMAGE 1.
${input.websiteUrl ? `Landing page source: ${input.websiteUrl}.` : ""}
` : "";

  return `
Create one vertical App Store screenshot poster.

${promptVersionPatch}

Use IMAGE 1 as the visual style reference.
Use ${screenshotLabel} as the real app screenshot for this specific screen.
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
Create a polished store screenshot poster in the same visual system as the reference image.

Preserve the reference’s visual style, composition rhythm, typography feel, color hierarchy, decorative density, screenshot treatment, and overall campaign energy.

Change the subject matter to fit this app.
Do not copy literal content from the reference.

SCREENSHOT:
Use ${screenshotLabel} exactly as provided.
This is the only real app UI for this screen.
Do not use the approved campaign reference images as the app screenshot.
Do not copy phone frames, UI content, maps, cards, or text from continuity images.
Do not redraw, replace, translate, simplify, or reinterpret the UI.
Keep this screenshot large, readable, and visually important.
Do not cover important UI with decorations, objects, or characters.
${strictScreenshotPatch}${featureMinimalPatch}
VISUAL ANCHOR:
${promptVersion === "v5" || promptVersion === "v6" || promptVersion === "v7" || promptVersion === "v10" || promptVersion === "v11" || promptVersion === "v12" ? "Do not create a dominant visual buddy/object in feature screens. Use the product visual anchor only as subtle background or side-area inspiration." : promptVersion === "v8" || promptVersion === "v9" ? "A visual buddy/object may exist only if IMAGE 1 clearly supports that creative device; keep it outside the phone and subordinate to the screenshot." : "Create one original app-specific visual buddy, object, or decorative concept only if it fits the reference style and the prompt version allows it."}

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
Use one consistent modern rounded black phone frame style across feature screens.
Optional app-specific visual anchor integrated naturally.
Clean premium store-ready finish.
`.trim();
}
