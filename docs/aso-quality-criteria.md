# ASO Screenshot Quality Criteria

Sources: abstract pattern review from Appshot Gallery (`docs/appshot-research/appshot-gallery.png`, `patterns.md`) plus workflow criteria from `adamlyttleapps/claude-skill-aso-appstore-screenshots`.

This is a quality bar, not a copying brief. We use references to learn patterns, not to clone assets, screenshots, trademarked layouts, or exact campaign designs.

## Top-1% gates

A screenshot set cannot be considered top-1% unless it passes these gates:

1. **Benefit-first copy**
   - 3–6 words ideal; 8 words max.
   - Starts with a strong action/value verb when possible: Turn, Find, Track, Compare, Save, Learn, Build, Boost, Plan, Record, Identify.
   - One clear user benefit per frame.

2. **Strong screenshot pairing**
   - Every source app screenshot must demonstrate the headline.
   - Avoid empty states, settings pages, sparse lists, login screens, debug UI, placeholder content, and generic onboarding.
   - Reuse is allowed only when the source screenshot truly supports multiple benefits; a 5-screen set should normally use at least 3 distinct app screens.

3. **Category-native art direction**
   - Fitness: dark/neon, metrics, energy, strong contrast.
   - Utility/productivity: crisp blue/white, cards, clear workflow, practical UI focus.
   - Finance: trust palette, proof badges, large numbers, calm confidence.
   - Travel/discovery: maps, editorial texture, place/photo cues, route continuity.
   - Social/AI: gradients, avatars, chat/video moments, expressive human context.

4. **Role-specific composition**
   - A 5-screen set should mix at least 4 composition roles: hook, feature, proof, comparison, CTA.
   - At least 3 distinct visual compositions: hero poster, split devices, proof poster, cropped edge device, object-led, before/after, panorama.
   - Repeating one centered phone five times is not premium.

5. **Premium depth and finish**
   - Devices have realistic scale, tilt/crop/overlap where appropriate.
   - Foreground/background objects earn their place and reinforce the message.
   - Shadows, blur, glass/cards, badges, routes, or props create intentional depth.

6. **Continuity across the set**
   - Shared motif, palette, typography, and device treatment.
   - Screens vary composition while still reading as one campaign.

7. **Proof signal**
   - At least one screen should communicate proof: rating, award, trust badge, result, metric, or recognizable value evidence.

## Scoring axes for the evaluator

- `compositionDiversity`: how many distinct premium compositions appear.
- `objectDepth`: whether the set uses layered objects/cards/badges/props.
- `deviceRichness`: split devices, crops, tilts, overlap, and non-generic frame treatment.
- `continuity`: shared campaign motif and progressive device treatment.
- `benefitClarity`: short, benefit-led copy with action/value verbs.
- `screenshotPairing`: enough distinct app screens and credible role coverage.
- `proofSignal`: presence of a proof/rating/badge/result frame.
- `thumbnailReadability`: short headlines/subheads that survive App Store thumbnail scale.

## Implementation implication

The pipeline should not pick “best” by structural diversity alone. It must reject or down-rank candidates that look busy but lack benefit-led copy, proof, source-screen variety, or category-native art direction.
