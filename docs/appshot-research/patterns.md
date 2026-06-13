# Appshot.gallery pattern research

Source reviewed: `https://www.appshot.gallery/?utm_source=chatgpt.com` captured in `docs/appshot-research/appshot-gallery.png`.

## High-signal screenshot patterns

1. **Strong category art direction**
   - Fitness: black/neon, aggressive contrast, tilted devices, metric rings.
   - Utility: clean white/blue/grey, direct practical headlines, cards and floating panels.
   - Finance: trust palettes, money numbers, proof badges, dark premium cards.
   - Social/AI companion: saturated gradients, avatars/characters, chat/video mockups.
   - Music: dark stage backgrounds, instrument photos, neon accents.
   - Nature/education: photographic backgrounds, soft glass labels, before/after split views.

2. **Layouts are not just one phone centered**
   - Split mockups across two screens.
   - Overlapping devices with different tilt/depth.
   - Large cropped phone entering from edge.
   - One screen can be mostly proof/award/text, not always UI.
   - Some sets create a panoramic story across 4 screenshots.

3. **3D/depth objects add perceived production value**
   - Floating cards, pills, cubes, trophies, badges, avatars, food/photo cutouts.
   - Shadows are deep and directional.
   - Objects overlap phones and background, not just decorate corners.

4. **Backgrounds are category systems**
   - Dark neon for high-energy apps.
   - Soft white/grey glass for health/utility.
   - Photo/blur backgrounds for discovery/nature/travel.
   - Rich brown/cream for finance/lifestyle.
   - Repeated motifs connect screens, but each screen layout changes.

5. **Copy rhythm is short and loud**
   - 3–6 words for primary headline.
   - One clear benefit per frame.
   - Big type with tight leading.
   - Social proof/ratings/awards are used as visual elements, not report text.

6. **Set-level variation**
   - A good 5-screen set mixes: hook poster, feature zoom, proof card, split-device comparison, final premium frame.
   - Repeating the same phone scale/position five times feels low quality.

## Product implications for App Screenshot AI

- VisualSystem needs richer direction than palette/layoutFamily: backgroundStyle, objectStyle, deviceComposition, proofBadges, setRhythm.
- Storyboard should request per-screen composition: single-device, split-device, cropped-device, proof-poster, object-led, before-after.
- Render engine needs deterministic support for:
  - faux-3D objects,
  - split mockups,
  - overlapping devices,
  - category-specific background motifs,
  - loading shader previews.
- Fixture mode must visibly change by category; otherwise users think category does nothing.

## Immediate changes made

- Added animated shader skeletons while generation is running.
- Made fixture visual systems category-specific.
- Made utility fixture use blue practical art direction rather than travel editorial.
- Added split mockup support when a storyboard screen has a secondary screenshot.
- Added deterministic faux-3D floating objects for classic/utility-style renders.

## Follow-up work

- Extend schemas with explicit composition and decorative object contracts.
- Add deterministic render treatments for: split-device, cropped-edge-device, proof-poster, avatar/character, before-after.
- Add Appshot-inspired evaluator checks for layout repetition and object/depth richness.
- Add a design-pattern library of category-specific screenshot set recipes.
