# PRD — Refactor para Premium Direct Mode y paridad con ChatGPT directo

## Problem Statement

App Screenshot AI tiene una arquitectura sólida, pero todavía no consigue de forma consistente el tipo de resultado visual que se obtiene al trabajar directamente con ChatGPT: una composición premium, con dirección creativa fuerte, buena profundidad, iluminación, fondos atractivos y una campaña visual menos genérica.

El pipeline actual prioriza recetas, variantes deterministas, JSON estructurado y render SVG. Eso da control, repetibilidad y artefactos inspeccionables, pero puede limitar la calidad visual inicial. Antes de optimizar evaluación, repair loops o una gran arquitectura de calidad, necesitamos una ruta experimental que permita conseguir primero un buen resultado visual para una app concreta, con el menor número posible de pruebas pagadas.

El problema de usuario es: “quiero generar screenshots tan buenos como los que consigo manualmente con ChatGPT, pero dentro del producto, guardando outputs y pudiendo iterar sin tirar dinero”.

## Solution

Crear un refactor incremental que introduzca un **Premium Direct Mode**.

Este modo debe imitar el flujo de ChatGPT directo:

1. recibir app metadata, screenshots y referencia visual,
2. generar una dirección visual/campaña fuerte,
3. pedir a un modelo de imagen que cree un stage/background premium sin UI falsa, texto ni teléfonos,
4. componer encima, de forma determinista, el screenshot real, device frame, headline y subheadline,
5. guardar prompt, inputs, outputs y coste aproximado para poder aprender de cada prueba.

El objetivo inicial no es automatizar top 1% para todas las categorías. El objetivo inicial es conseguir **un buen resultado visual para una app benchmark concreta**, y después convertir ese aprendizaje en pipeline repetible.

## User Stories

1. As a founder, I want a premium direct generation mode, so that I can quickly test whether the product can match ChatGPT-quality outputs.
2. As a founder, I want to generate only a small number of candidates, so that I avoid wasting money on many paid image generations.
3. As a founder, I want every paid generation to save its prompt and output, so that no learning is lost.
4. As a founder, I want to compare generated candidates visually, so that I can choose the strongest direction manually.
5. As a founder, I want AI to generate only the visual stage/background, so that the app UI remains real and controlled.
6. As a founder, I want deterministic overlay of screenshots and text, so that final exports are reliable and editable later.
7. As a founder, I want to reuse a selected style reference, so that the output follows a known premium direction.
8. As a founder, I want the system to avoid fake UI, fake text, logos and random words, so that generated images do not look broken or unsafe.
9. As a founder, I want the system to create 3 strong candidates rather than many weak variants, so that cost stays low.
10. As a founder, I want to know which prompt version generated each result, so that I can improve prompts systematically.
11. As a founder, I want to use one benchmark app first, so that we optimize quality before generalizing.
12. As a founder, I want to preserve the current deterministic pipeline, so that existing generation still works as fallback.
13. As a founder, I want a generation mode selector, so that I can choose deterministic, premium direct, or future benchmark mode.
14. As a founder, I want contact sheets for candidates, so that I can evaluate the whole screenshot set quickly.
15. As a founder, I want to export the selected candidate, so that manual evaluation can lead to a real store pack.
16. As a developer, I want Premium Direct Mode isolated from the current recipe pipeline, so that experiments do not destabilize existing generation.
17. As a developer, I want prompt contracts versioned, so that changes can be evaluated across runs.
18. As a developer, I want generation artifacts persisted locally, so that debugging does not depend on API responses alone.
19. As a developer, I want image generation calls cached by prompt/input hash where possible, so that repeated tests do not cost money.
20. As a developer, I want the renderer to own text/device/UI composition, so that generated backgrounds cannot introduce incorrect UI.

## Implementation Decisions

- Add a new generation mode concept with at least:
  - `deterministic`: current recipe/SceneSet pipeline.
  - `premium-direct`: ChatGPT-like premium stage generation plus deterministic overlay.
  - `benchmark`: reserved for later multi-candidate/provider comparisons.

- Keep the current deterministic renderer and SceneSet pipeline as fallback. Do not replace it with AI-first globally.

- Introduce a Premium Direct orchestration use case that runs beside the current store-pack generation use case rather than rewriting it immediately.

- Premium Direct Mode should generate a small fixed number of candidates initially, probably 3.

- Premium Direct Mode should use the selected style reference as the main visual source. It should extract/adapt visual DNA without copying specific text, logos, objects, brands or layouts.

- AI-generated images should be treated as stage/background assets only. The image prompt must explicitly forbid:
  - readable text,
  - app UI,
  - fake phones,
  - logos,
  - trademarks,
  - people/faces unless explicitly required later,
  - watermarks,
  - random letters,
  - copied reference content.

- Deterministic composition remains responsible for:
  - source screenshot placement,
  - device frame,
  - headline,
  - subheadline,
  - callouts/badges if needed,
  - final PNG dimensions,
  - export manifest/ZIP.

- Add prompt version metadata to generation artifacts.

- Persist every Premium Direct run with:
  - app input summary,
  - provider/model/image model,
  - style reference id,
  - prompt version,
  - full prompt text,
  - generated background assets,
  - composed screenshots,
  - selected candidate if chosen,
  - notes/score if manually added later.

- Do not build the full multimodal evaluator first. For this refactor, manual visual review is acceptable because the immediate goal is matching ChatGPT output quality with controlled cost.

- Add contact sheet creation if cheap to implement, because it provides high debugging value and helps compare candidates.

- Avoid broad category/archetype expansion in this first refactor. Optimize for one benchmark app first.

- Keep existing PremiumRecipeLibrary, candidates and SVG renderer available. They remain useful as deterministic fallback and for future hybrid mode.

## Testing Decisions

- Tests should focus on external behavior and saved artifacts, not private implementation details.

- Test that Premium Direct Mode creates the expected number of candidates.

- Test that Premium Direct Mode stores prompt metadata, prompt version, provider/model metadata and generated assets.

- Test that generated background assets are passed into deterministic composition rather than replacing screenshots or text.

- Test that deterministic overlay produces valid rendered assets with correct target dimensions.

- Test that existing deterministic generation still works unchanged.

- Test provider gateway image generation through fake/fixture adapters where possible, to avoid paid calls in tests.

- Test that repeated generation can use cached fixture outputs or deterministic fake image responses.

- Good tests should assert:
  - final asset count,
  - manifest shape,
  - artifact persistence,
  - no accidental provider calls in unit tests,
  - correct mode routing.

- Avoid tests that assert exact prompt prose except for critical safety constraints. Prompt text will iterate.

## Out of Scope

- Fully automated top 1% evaluation.
- Multimodal visual evaluator.
- Repair loop.
- Large benchmark library.
- Full category/archetype taxonomy.
- Human editing UI.
- Replacing the deterministic renderer.
- Generating complete app UI inside images.
- Generating fake app screenshots.
- Multi-provider benchmark mode.

## Further Notes

This refactor is intentionally quality-first. The immediate success criterion is not architectural completeness. The immediate success criterion is:

```txt
Can App Screenshot AI produce one screenshot set that is visually close to what we can get from ChatGPT directly?
```

Once that is true, we can iterate toward:

1. lower cost,
2. better repeatability,
3. visual evaluator,
4. repair loop,
5. category archetypes,
6. broader automation.

Recommended first implementation slice:

```txt
1. Add generation mode routing.
2. Add PremiumDirectGenerateUseCase.
3. Create versioned prompt file for premium direct stage generation.
4. Generate 3 stage candidates for one benchmark app.
5. Compose screenshots/text deterministically on top.
6. Save all artifacts and a contact sheet.
```

Proposed testing seams:

- Highest seam: local project generation session with `generationMode: "premium-direct"` and fixture image provider.
- Mid seam: Premium Direct use case with fake model gateway and fake source screenshot loader.
- Existing seam: render engine composition with generated background assets.
- Persistence seam: local project store writes candidate artifacts and metadata.
