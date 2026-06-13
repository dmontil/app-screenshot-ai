# Render Benchmark Principles

Source of inspiration: AppShot Gallery-style top App Store screenshot sets. This is an abstract pattern analysis, not a copying brief.

## What top sets have that our current renderer lacks

1. **Strong art direction per app**
   - Each app has a recognizable campaign world.
   - Background, typography, device treatment, and accents feel custom to the app category.

2. **Role-specific composition**
   - Screens are not five copies of the same template.
   - Hook, feature, proof, map/result, and CTA screens use different layouts while sharing one system.

3. **Oversized confident typography**
   - Headlines are short, punchy, and typographically designed.
   - Text placement is intentional, not simply top-centered every time.

4. **UI is integrated into the artwork**
   - Device/screenshots are cropped, tilted, stacked, masked, enlarged, or framed depending on the message.
   - Screenshots are not just pasted inside a generic phone frame.

5. **Depth and premium finish**
   - Gradients, shadows, blur, glows, texture, glass/card layers, and foreground/background overlap create depth.
   - Flat beige background + phone is not enough.

6. **Continuity across the full set**
   - The set works as five separate screenshots and as one campaign.
   - Repeated motifs create continuity: lines, shapes, cards, map paths, glow systems, badges.

7. **Category-native visual language**
   - Fitness: energy, body/metrics, bold contrast.
   - Finance: trust, clarity, confident numbers.
   - Travel: maps, place texture, editorial storytelling.
   - AI/social: expressive cards, chat bubbles, gradients.

## Renderer implications

The renderer should not expose one generic layout. It needs a small library of premium layout families:

```txt
hero-device
split-proof-card
stacked-screens
panoramic-campaign
callout-zoom
metric-badge
cinematic-poster
map-route-editorial
```

Each `ScreenPlan` should choose a `treatment`, not just a headline:

```json
{
  "role": "hook",
  "headline": "Turn books into walkable routes",
  "treatment": "map-route-editorial",
  "device": {
    "crop": "upper-map",
    "scale": 0.82,
    "tilt": -2
  },
  "decor": {
    "motif": "route-line",
    "density": "medium",
    "depth": "high"
  },
  "callouts": []
}
```

## New product quality bar

A generated set is not acceptable unless:

- at least 3 of 5 screens have distinct compositions,
- all 5 share a visual motif,
- screenshot/device treatment changes by role,
- typography feels designed and readable at thumbnail size,
- the result looks closer to AppShot Gallery references than to a plain template generator.

## Immediate next implementation target

Absorb the best prototype direction into `render-engine` as a new `PremiumRenderer`:

1. Extend schemas:
   - `layoutFamily`
   - `screenTreatment`
   - `deviceTreatment`
   - `decorMotif`
   - `callouts`
2. Add 3 production layout families first:
   - `map-route-editorial`
   - `premium-proof-cards`
   - `cinematic-atlas`
3. Update Gemini prompt contract to output these fields.
4. Render role-specific layouts instead of one repeated template.
5. Add visual QA heuristics:
   - layout diversity count,
   - motif consistency,
   - headline length,
   - UI visibility.
