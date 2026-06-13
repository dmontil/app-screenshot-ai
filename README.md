# App Screenshot AI

Open-source AI pipeline for generating coherent, store-ready app screenshots.

This is a local-first product, not a mock demo: users bring their own model keys, upload real app screenshots, generate a coherent visual system, render deterministic assets, evaluate quality, and export store-ready files.

## Product direction

**Goal:** build a usable v1 that also acts as an AI Product Engineering showcase.

The system demonstrates:

- multimodal app understanding,
- schema-driven AI generation,
- configurable multi-provider model gateway,
- visual system generation,
- deterministic rendering,
- quality/compliance evaluation,
- export automation.

## Current local pipeline

A fixture-backed end-to-end pipeline is already runnable:

```bash
npm install
npm run demo:literarytrip
```

It writes generated PNGs, JSON artifacts, a quality report, and a ZIP to:

```txt
examples/literarytrip/output/
```

## Target v1

Local-first web app:

```bash
npm install
npm run dev
```

User flow:

1. Choose model provider and enter BYOK credentials.
2. Create app project.
3. Upload 3-8 functional screenshots.
4. Add app name, category, audience, value proposition, locale, and target stores.
5. Generate creative directions.
6. Select one direction.
7. Render 5 screenshots from a locked `VisualSystem`.
8. Review quality/compliance report.
9. Export ZIP.

## Architecture

```txt
Raw screenshots + app metadata
  -> Input readiness
  -> App understanding
  -> Creative brief
  -> Pattern retrieval
  -> Creative directions
  -> VisualSystem
  -> Storyboard
  -> Deterministic render
  -> Quality evaluation
  -> Store-ready export
```

## Repo structure

```txt
apps/
  web/                  # Local-first web UI
packages/
  schemas/              # Zod contracts shared across pipeline, UI, render, eval
  model-gateway/        # Multi-provider BYOK abstraction
  ai-pipeline/          # Orchestrates AI product flow
  pattern-library/      # Abstract design patterns, not copied templates
  render-engine/        # Deterministic screenshot rendering
  evaluator/            # Quality/compliance scoring
  export-engine/        # ZIP + export manifest generation
examples/
  literarytrip/         # Real app example, never hardcoded into core
docs/
```

## Non-goals for v1

- Hosted SaaS.
- Payments.
- Team collaboration.
- Direct App Store / Google Play upload.
- Fine-tuning.
- Full localization.

See:

- `docs/usage.md`
- `docs/product-plan.md`
- `docs/architecture.md`
- `docs/engineering-standards.md`
