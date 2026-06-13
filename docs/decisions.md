# Decisions

## 2026-06-13

### Product identity

- Name: **App Screenshot AI**.
- Folder/repo: `app-screenshot-ai`.
- Tagline: Open-source AI pipeline for generating coherent app store screenshots.

### Old codebase

- Existing `ScreenshotGenerator` is considered disposable prototype code.
- New product starts from zero.
- Reuse only useful ideas/docs, not the old architecture.

### Primary goal

- Build a real local-first v1 product.
- The working product is also the AI Product Engineering showcase.
- Do not build a fake demo-only artifact.

### Positioning

- Target role signal: **AI Product Engineer**.
- Secondary signals: multimodal AI, model gateway, evals, deterministic rendering.

### v1 distribution

- Local-first open-source web app.
- BYOK model credentials.
- No hosted SaaS in v1.
- No payments in v1.

### Provider strategy

- Multi-provider configurable from v1.
- User chooses one active provider/model per run.
- Benchmark mode is planned for v1.1.
- Provider-per-task routing is out of scope for v1.

### App examples

- First real example: LiteraryTrip.
- LiteraryTrip must live under `examples/literarytrip` only.
- Core packages must stay app-agnostic.

### Required universal input

Mandatory:

- app name,
- category,
- target audience,
- main value proposition,
- 3-8 functional screenshots,
- target stores,
- base locale.

Optional:

- logo,
- app icon,
- brand colors,
- website URL,
- ASO keywords.

### Input readiness

- Bad/insufficient screenshots block generation.
- The product should not pretend splash screens are enough.
- Initial rule: at least 3 distinct functional screens.

### Storyboard for LiteraryTrip example

1. Turn books into walkable routes.
2. Search by book, author, or city.
3. Discover real story places.
4. Follow the route on the map.
5. Save literary walks for later.

### Engineering standards

- Follow SOLID.
- Use pragmatic Clean Architecture.
- Organize feature-first where it improves navigation.
- Keep core separate from UI/infrastructure.
- Apply DRY to duplicated knowledge, not incidental repeated lines.
- Apply KISS: avoid speculative abstractions.
- Use TDD with vertical red-green-refactor slices.
