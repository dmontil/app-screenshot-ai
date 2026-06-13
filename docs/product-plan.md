# Product Plan

## Positioning

**App Screenshot AI** is a local-first open-source product for turning raw mobile app screenshots into coherent app store screenshot sets.

It is built as a real v1 product and doubles as an AI Product Engineering showcase.

## Primary objective

Build a usable local product that proves:

> AI can propose visual direction, copy, and storyboard, while deterministic code owns the final render, quality checks, and export.

## Target user for v1

Technical indie developers and AI/product engineers who are comfortable running a local app and providing their own model API keys.

## v1 principles

1. **Local-first.** No hosted backend required.
2. **BYOK.** Users configure their own model provider credentials.
3. **Multi-provider configurable.** User can choose provider/model; benchmark mode comes later.
4. **App-agnostic.** LiteraryTrip is only an example; no app-specific logic in core packages.
5. **Block bad inputs.** If screenshots are not functional or diverse enough, generation stops.
6. **Structured outputs.** AI returns validated schemas, not loose prose.
7. **VisualSystem as source of truth.** Consistency comes from a locked design object.
8. **Deterministic final render.** Text, device frames, layout, and export are code-controlled.
9. **Evaluate before export.** Quality/compliance report is part of the product.
10. **No store secret custody.** v1 exports assets only.

## Required input

Mandatory:

- app name,
- category,
- target audience,
- main value proposition,
- 3-8 functional screenshots,
- target stores,
- base locale.

Optional:

- app icon,
- logo,
- brand colors,
- website URL,
- ASO keywords,
- existing store description.

## Screenshot readiness policy

Generation is blocked unless the project has enough functional source material.

Initial rules:

- minimum 3 screenshots,
- at least 3 visually distinct screens,
- no more than 1 splash/logo screen,
- at least 2 screens with functional UI visible.

Blocked response example:

```json
{
  "status": "blocked",
  "reason": "insufficient_functional_screenshots",
  "message": "Upload at least 3 distinct in-app screens: home/search, feature/detail, result/map/list."
}
```

## v1 user flow

1. Start local web app.
2. Configure model provider credentials.
3. Create app project.
4. Add app metadata.
5. Upload screenshots.
6. Run input readiness check.
7. Generate app understanding and creative brief.
8. Generate 3 creative directions.
9. Select one direction.
10. Lock `VisualSystem`.
11. Generate 5-screen storyboard.
12. Render final screenshots.
13. Run evaluator.
14. Export ZIP.

## v1 model provider scope

v1 supports multi-provider configuration, not automatic benchmark mode.

Required:

- provider/model selected in settings,
- provider used for the whole pipeline,
- provider metadata stored with every generation,
- common error model across providers.

Planned providers:

1. Gemini / Google AI Studio.
2. OpenAI.
3. Anthropic.

Benchmark mode is v1.1:

- run same input against multiple providers,
- compare quality scores,
- choose best output.

## v1 output

A generated project should contain:

```txt
output/
  app-context.json
  input-readiness.json
  screenshot-analysis.json
  creative-brief.json
  creative-directions.json
  visual-system.json
  storyboard.json
  quality-report.json
  export-manifest.json
  screenshots/
    01-hook.png
    02-search.png
    03-value.png
    04-map.png
    05-save.png
  app-store-pack.zip
```

## Example project

`examples/literarytrip` is the first real example.

Storyboard direction:

1. Turn books into walkable routes.
2. Search by book, author, or city.
3. Discover real story places.
4. Follow the route on the map.
5. Save literary walks for later.

Important: LiteraryTrip data must stay inside `examples/literarytrip`; the core product remains app-agnostic.
