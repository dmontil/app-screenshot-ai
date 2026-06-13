# Premium Screenshot Pipeline Plan

## Executive summary

The current product can generate coherent screenshots, but it cannot consistently produce Appshot-gallery/top-1% results because the pipeline is still a shallow `VisualSystem + Storyboard + SVG treatment` renderer. Changing category currently influences palette, copy, and a few treatments, but not the deep scene composition that makes premium screenshot sets feel expensive: split devices, cropped edge devices, 3D objects, proof posters, panoramic continuity, background systems, realistic shadows, category-specific objects, and multi-variant selection.

To reach a real 9+/10 product, App Screenshot AI needs to evolve from:

```txt
AppInput -> VisualSystem -> Storyboard -> Render PNGs
```

to:

```txt
Raw app screens + landing/manual brand -> Product & Brand Analysis -> Premium Recipe Selection -> Scene Graph candidates -> Deterministic/asset-assisted renderer -> Multimodal visual evaluator -> iterate/rank -> export selected set
```

The key idea: **AI should choose and configure a premium scene recipe; deterministic code should render it reliably.** For 9.9/10, deterministic recipes alone are probably not enough: we need either a curated premium asset library or generated scene assets/backgrounds, then deterministic compositing of the actual app UI.

---

## Current pipeline reality

### Current implemented flow

1. User provides `AppInput`: metadata + screenshots + optional brand colors.
2. Input readiness blocks insufficient screenshots.
3. `PatternLibrary.retrieve()` returns a tiny category-filtered list.
4. Model gateway generates:
   - `VisualSystem`
   - `Storyboard`
5. `RenderStoreSetUseCase` renders each screen using `RenderScreenshotUseCase`.
6. Evaluator checks basic compliance.
7. Export engine creates ZIP.

### Current strengths

- Local-first generation works.
- Deterministic final render works.
- Source screenshots are preserved inside device frames.
- Versions/manual rerender/export are working.
- The package seams are clean enough to evolve.

### Current blockers to premium quality

#### 1. `VisualSystem` is too shallow

Current `VisualSystem` can express:

- `layoutFamily`
- `motif`
- palette
- typography
- safe margins and device sizing

It cannot express:

- full art direction
- composition style per screenshot
- object system
- depth/shadow language
- background type
- proof badges
- photography/blur/gradient systems
- continuity across a 5-screen set
- category-specific premium devices/props

A top screenshot set is not a palette. It is a scene system.

#### 2. `Storyboard` is not a scene graph

Current screen plan has:

- headline/subheadline
- one source screenshot
- optional secondary screenshot
- one treatment enum
- simple device scale/tilt
- callouts

It cannot express:

- multiple device slots
- edge-cropped device
- split screen across two devices
- 3D object placement
- background layers
- social proof badges
- before/after comparison
- panoramic continuity between frames
- object overlap with device
- per-screen focal crop

#### 3. Render treatments are too few and too coupled

Current renderer effectively has four SVG render treatments:

- classic-device
- map-route-editorial
- premium-proof-cards
- cinematic-atlas

`callout-zoom` is not a first-class render treatment in practice. Several screen treatments collapse into the same visual result depending on `layoutFamily`, so screenshots still look similar.

#### 4. Pattern library is not a premium recipe library

Current patterns are lightweight metadata:

- category
- conversion intent
- layout family
- tone
- max headline words

Premium screenshots need recipes with slots:

- background system
- device composition
- object kit
- screen rhythm
- proof elements
- copy constraints
- renderer requirements

#### 5. Model prompts are generic

The adapters ask the model for JSON with a generic prompt. There are no embedded Appshot-grade heuristics, negative examples, composition requirements, or style recipes.

#### 6. No screenshot or landing analysis

The implementation does not yet deeply analyze:

- what each raw screen actually shows
- which screenshot is best for each role
- dominant UI colors
- landing page palette/type/tone
- app category visual conventions
- ASO keywords

Changing category while using screenshots from a different domain can only go so far.

#### 7. Evaluator cannot distinguish mediocre from premium

Current evaluator checks:

- dimensions
- headline length
- number of treatments

It does not score:

- visual hierarchy
- premium composition
- device realism
- category fit
- continuity
- object/depth richness
- background quality
- App Store conversion quality
- screenshot uniqueness

So bad or average outputs can pass.

---

## What Appshot-grade screenshots do

Based on `docs/appshot-research/appshot-gallery.png`:

1. **Every category has a distinct art direction**
   - Fitness: black/neon, metric rings, bold devices.
   - Utility: white/blue/grey, crisp cards, practical UI emphasis.
   - Finance: trust palettes, proof badges, large money numbers.
   - Social/AI: saturated gradients, avatars, chat/video mockups.
   - Education/nature: photographic backgrounds, soft labels, before/after layouts.

2. **They vary composition across the set**
   - Hook poster.
   - Split-device feature.
   - Proof/social proof frame.
   - Cropped-edge device.
   - Final CTA/premium poster.

3. **They use depth**
   - Floating cards.
   - 3D cubes/trophies/avatars/objects.
   - Deep shadows.
   - Overlap between objects and phones.

4. **They use continuity**
   - Shared palette.
   - Repeating object system.
   - One story rhythm across five frames.
   - Sometimes panoramic visual motifs across all frames.

5. **They are loud and simple**
   - Big headline.
   - One benefit per frame.
   - Minimal subcopy.
   - The app UI is visible but not the only visual asset.

---

## Options to reach premium quality

### Option A — Deterministic premium recipe engine

Build a large curated library of premium scene recipes and deterministic renderers.

**Quality ceiling:** 8.0–9.0/10 if recipes are very good.  
**Pros:** local-first, predictable, cheap, fast.  
**Cons:** requires building many renderer treatments and asset packs manually.

Good for OSS/local-first.

### Option B — Curated templates + deterministic renderer

Create high-quality template families inspired by Appshot but original. AI chooses template and fills slots.

**Quality ceiling:** 8.5–9.3/10.  
**Pros:** highly reliable, productizable.  
**Cons:** less flexible; needs designer-quality template craft.

Good commercial v1 path.

### Option C — AI-generated backgrounds/objects + deterministic app compositing

Use image models to generate backgrounds/3D objects/props, then deterministically composite actual app screenshots and text.

**Quality ceiling:** 9.0–9.7/10.  
**Pros:** more unique, can adapt to any category.  
**Cons:** cost, latency, inconsistency, licensing/safety questions, not fully deterministic.

Best for wow factor.

### Option D — Figma/template import pipeline

Render from curated Figma-like templates or JSON scene files.

**Quality ceiling:** 9.0–9.5/10 with great templates.  
**Pros:** designers can create templates outside code.  
**Cons:** importing/rendering complexity; template compatibility.

Best if the product becomes template-driven.

### Recommended approach

Use a hybrid:

1. **Deterministic Premium Recipe Engine** for reliability.
2. **Curated asset packs** for 3D objects, badges, gradients, backgrounds.
3. **Optional AI-generated scene assets** later for top-tier custom output.
4. **Multimodal evaluator loop** to rank/repair outputs.

---

## Target architecture

### New domain objects

#### `BrandKit`

Source of truth for visual identity.

```ts
type BrandKit = {
  source: "manual" | "landing" | "screenshots" | "mixed";
  palette: {
    background: string;
    surface: string;
    text: string;
    primary: string;
    accent: string;
    secondary?: string;
  };
  typography: {
    displayFamily?: string;
    uiFamily?: string;
    weight: number;
    mood: "serif-editorial" | "modern-saas" | "bold-sport" | "friendly";
  };
  imagery: {
    style: "none" | "3d" | "photo" | "illustration" | "avatar" | "abstract";
    keywords: string[];
  };
  tone: string[];
};
```

Priority order:

1. Manual colors/user override.
2. Landing page analysis.
3. Raw screenshot palette extraction.
4. Category defaults.

#### `ProductUnderstanding`

Describes what the app does and what each screen contains.

```ts
type ProductUnderstanding = {
  appName: string;
  category: string;
  valueProposition: string;
  audience: string;
  screenInventory: Array<{
    screenshotId: string;
    role: "home" | "search" | "detail" | "map" | "profile" | "checkout" | "unknown";
    visibleFeatures: string[];
    visualDensity: "low" | "medium" | "high";
    bestFor: Array<"hook" | "feature" | "proof" | "comparison" | "cta">;
  }>;
};
```

#### `PremiumRecipe`

A reusable Appshot-grade scene system.

```ts
type PremiumRecipe = {
  id: string;
  category: string;
  name: string;
  qualityTarget: "premium" | "top-1-percent";
  setRhythm: ["hook", "feature", "proof", "comparison", "cta"];
  scenes: Array<{
    composition:
      | "hero-poster"
      | "split-devices"
      | "cropped-edge-device"
      | "proof-poster"
      | "object-led"
      | "before-after"
      | "panoramic-sequence";
    requiredAssets: Array<"3d-object" | "badge" | "gradient" | "photo" | "avatar" | "none">;
    deviceSlots: number;
    copyStyle: "big-loud" | "minimal-premium" | "proof-heavy";
  }>;
};
```

#### `SceneSet`

The actual render contract.

```ts
type SceneSet = {
  id: string;
  brandKit: BrandKit;
  recipeId: string;
  continuity: {
    sharedBackground: "gradient" | "panorama" | "photo-blur" | "solid";
    recurringObjects: string[];
    deviceTreatment: "consistent" | "progressive";
  };
  scenes: Scene[];
};
```

#### `Scene`

The new replacement/deepening of `ScreenPlan`.

```ts
type Scene = {
  index: number;
  role: "hook" | "feature" | "proof" | "comparison" | "cta";
  composition: string;
  copy: {
    headline: string;
    subheadline?: string;
    badge?: string;
  };
  background: {
    kind: "gradient" | "mesh" | "photo" | "panorama" | "dark-stage";
    paletteRole: string;
    intensity: number;
  };
  devices: Array<{
    screenshotId: string;
    x: number;
    y: number;
    scale: number;
    tilt: number;
    crop: "full" | "top" | "bottom" | "edge-left" | "edge-right";
    depth: number;
  }>;
  objects: Array<{
    assetId: string;
    kind: "3d-cube" | "badge" | "coin" | "trophy" | "avatar" | "card" | "orb";
    x: number;
    y: number;
    scale: number;
    rotation: number;
    depth: number;
  }>;
  callouts: Array<{ label: string; x: number; y: number; anchorDevice?: number }>;
};
```

---

## Proposed pipeline

### Phase 1 — Premium benchmark harness

Goal: stop guessing.

Build an E2E harness that:

- runs multiple configurations,
- renders contact sheets,
- writes an HTML report per run,
- scores outputs against a premium rubric,
- stores the winning artifacts.

Already started under:

```txt
docs/e2e-results/premium-render-loop/
docs/appshot-research/
```

Next improvement: make the score semi-automated with a rubric JSON.

### Phase 2 — Brand/source analysis

Build:

1. `AnalyzeScreenshotsUseCase`
   - Extract source screenshot dimensions.
   - Extract dominant colors.
   - Classify each screen role.
   - Detect visual density and safe crop areas.

2. `AnalyzeLandingPageUseCase`
   - Input: optional website URL.
   - Fetch HTML/meta/CSS/social image.
   - Extract palette, typography clues, tone, product claims.

3. `BuildBrandKitUseCase`
   - Merge manual brand colors + landing + screenshots + category defaults.
   - Manual colors always win.

### Phase 3 — Premium recipe library

Replace shallow `PatternLibrary` with `PremiumRecipeLibrary`.

Initial recipe families:

1. `saas-utility-blue-depth`
   - crisp blue/white, floating 3D cubes, split devices.
2. `travel-editorial-panorama`
   - warm route map, book/photo cards, panoramic path.
3. `finance-trust-proof`
   - dark/cream money cards, ratings, proof badges.
4. `fitness-neon-energy`
   - black/neon, metric rings, trophies, progress cards.
5. `social-avatar-gradient`
   - avatars, chat bubbles, saturated gradients.
6. `education-bright-cards`
   - friendly yellow/cream cards, progress badges.

Each recipe must include exact scene slots and renderer requirements.

### Phase 4 — Scene graph schema and compiler

Add `SceneSetSchema` and compile old `Storyboard` to a `SceneSet` temporarily for backwards compatibility.

New flow:

```txt
ProductUnderstanding + BrandKit + PremiumRecipe -> SceneSet -> RenderPlan -> PNGs
```

The AI should generate `SceneSet`, not just storyboard text.

### Phase 5 — Scene renderer v2

Build deterministic renderers for scene compositions:

1. `hero-poster`
2. `split-devices`
3. `cropped-edge-device`
4. `proof-poster`
5. `object-led`
6. `before-after`
7. `panoramic-sequence`

Use browser/HTML/CSS or an SVG scene renderer, but with real composition objects. Current SVG can continue for v1 compatibility, but premium render should become a separate deep module.

Add asset packs:

```txt
assets/premium-objects/
  utility/cubes/*.png or svg
  finance/coins-badges/*.png or svg
  fitness/trophies-rings/*.png or svg
  travel/books-maps/*.png or svg
  social/avatars-bubbles/*.png or svg
```

### Phase 6 — Candidate generation and ranking

Generate 4–8 candidates per project:

- conservative brand-safe
- bold category-native
- object-heavy 3D
- dark premium
- editorial/photo
- minimalist SaaS

Render thumbnails/contact sheets.

Then rank by:

- deterministic checks,
- multimodal judge,
- uniqueness/variety,
- category fit,
- user preference.

Only export the selected set.

### Phase 7 — Multimodal premium evaluator

Add evaluator rubric:

```txt
- App Store compliance: 10%
- Text clarity: 15%
- UI visibility: 15%
- Category fit: 15%
- Layout variation: 15%
- Visual premium/depth: 20%
- Set continuity: 10%
```

Use a vision-capable model to evaluate rendered contact sheets. If below threshold, ask generator for a repair plan and rerender.

Quality gates:

- < 7.0: reject
- 7.0–8.4: acceptable internal draft
- 8.5–9.2: marketable
- 9.3+: premium candidate
- 9.7+: top 1% candidate

### Phase 8 — UI product workflow

Expose this simply:

1. Upload raw screenshots.
2. Optional: paste landing URL.
3. Choose brand source:
   - auto from screenshots
   - auto from landing
   - manual colors
4. Generate 4 style directions.
5. Pick one.
6. Generate final pack.
7. Edit copy/translate/export.

---

## Critical product truth

A top 1% screenshot generator cannot rely only on raw screenshots and a palette. It needs at least one of:

1. **Great source app UI**
2. **Curated premium scene recipes**
3. **Premium asset packs**
4. **AI-generated scene/background assets**
5. **A strong visual evaluator loop**

Without those, outputs will keep feeling like template variations.

---

## Implementation plan

### Milestone 1 — Make quality visible

- Keep current CLI E2E harness.
- Add `premium-score.json` per run.
- Add a comparison gallery page.
- Add regression fixture sets for travel, utility, finance, fitness.

Acceptance: every pipeline change produces a visual comparison report.

### Milestone 2 — Add BrandKit and ScreenshotAnalysis

- Extract palette from raw screenshots.
- Add optional landing URL analysis.
- Merge brand sources with manual override precedence.
- Save `brand-kit.json` and `screenshot-analysis.json` artifacts.

Acceptance: generation can explain which colors/tone/source it used.

### Milestone 3 — PremiumRecipeLibrary

- Replace/augment `PatternLibrary` with recipes.
- Encode 6 category-native recipes.
- Tests verify category changes select different recipes and scene rhythms.

Acceptance: travel/utility/finance/fitness produce structurally different scene plans.

### Milestone 4 — SceneSet schema

- Add schemas for `SceneSet`, `Scene`, `DeviceSlot`, `SceneObject`, `BackgroundPlan`.
- AI generates `SceneSet`.
- Renderer still supports old storyboard via adapter.

Acceptance: generated JSON can express split devices and 3D objects before rendering.

### Milestone 5 — Render engine v2

- Implement scene renderer for split-device, cropped-edge, proof-poster, object-led.
- Add asset pack support.
- Add deterministic faux-3D object rendering.

Acceptance: utility set has at least 3 composition types and visible object/depth system.

### Milestone 6 — Candidate loop

- Generate multiple candidate SceneSets.
- Render contact sheets.
- Rank with evaluator.
- Store all candidates and selected winner.

Acceptance: user sees multiple genuinely different directions.

### Milestone 7 — Vision evaluator repair loop

- Add multimodal evaluation of contact sheets.
- Generate repair instructions.
- Iterate until quality threshold or max attempts.

Acceptance: mediocre outputs self-repair instead of exporting immediately.

### Milestone 8 — Product UI

- Add landing URL / manual brand controls.
- Add direction picker.
- Add visual score and why-it-scored panel.
- Keep advanced artifacts inspectable.

Acceptance: simple product flow remains: raw screens → brand source → directions → final pack.

---

## Next concrete slice

Build Milestone 2 + part of Milestone 3:

1. `BrandKitSchema`
2. `ScreenshotAnalysisSchema`
3. `PremiumRecipeLibrary` with 4 recipes
4. `SceneSetSchema` draft
5. E2E report includes chosen recipe and brand source

This creates the seam needed for everything premium.
