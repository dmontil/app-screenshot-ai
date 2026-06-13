# Engineering Standards

## Architecture style

App Screenshot AI follows a pragmatic combination of:

- SOLID principles,
- Clean Architecture,
- feature-first organization,
- DRY where duplication is accidental,
- KISS where abstraction would not pay for itself,
- TDD with vertical red-green-refactor slices.

The goal is not ceremony. The goal is code that is easy to change, easy to test, and easy to reason about as the product evolves from local-first OSS to hosted product.

## Clean Architecture boundaries

Dependency direction:

```txt
UI / CLI / HTTP adapters
  -> application use cases
    -> domain contracts and entities
      -> pure schemas/value objects

Infrastructure adapters implement ports but are not imported by domain/application core.
```

Core rule:

> Business and AI pipeline decisions must not depend on React, Next.js, provider SDKs, filesystem details, or rendering engines.

## Feature-first organization

Inside each app/package, organize by product capability before technical layer when it improves navigation.

Preferred shape for app features:

```txt
apps/web/src/features/project-setup/
  components/
  actions/
  routes/
  view-models/
```

Preferred shape for pipeline packages:

```txt
packages/ai-pipeline/src/features/input-readiness/
  check-input-readiness.ts
  check-input-readiness.test.ts
  index.ts
```

Shared primitives only move to shared folders after at least two features need them.

## SOLID application

### Single Responsibility

Each module owns one reason to change.

Examples:

- `model-gateway` changes when provider behavior changes.
- `render-engine` changes when rendering changes.
- `evaluator` changes when scoring changes.
- `ai-pipeline` changes when orchestration changes.

### Open/Closed

Add providers through adapters, not conditionals spread through the pipeline.

```txt
ModelProviderPort
  GeminiAdapter
  OpenAIAdapter
  AnthropicAdapter
```

### Liskov Substitution

All model providers must honor the same contract:

- validate credentials,
- generate structured object,
- return normalized metadata,
- throw normalized errors.

### Interface Segregation

Do not create one giant provider interface.

Split capabilities when needed:

- `TextObjectGenerator`
- `MultimodalObjectGenerator`
- `CredentialValidator`

### Dependency Inversion

Application use cases depend on ports, not concrete SDKs.

## DRY policy

DRY means avoiding duplicated knowledge, not avoiding every repeated line.

Acceptable duplication:

- two feature components with similar JSX while requirements are still changing,
- duplicated test setup for readability,
- simple local mapping code.

Must deduplicate:

- schemas,
- provider error mapping,
- store size/compliance rules,
- prompt contracts,
- render coordinate conventions,
- export folder conventions.

## KISS policy

Prefer the simplest thing that supports the next real milestone.

Do not build in v1:

- plugin system,
- hosted queue abstraction,
- multi-tenant auth,
- billing abstraction,
- vector database,
- provider-per-task router,
- fine-tuning system.

Do build in v1:

- clean ports for providers,
- schema validation,
- local artifact store,
- deterministic render interface,
- evaluator interface.

## TDD workflow

Development uses vertical red-green-refactor slices.

Never write all tests first and then all implementation.

Per slice:

1. Pick one observable behavior.
2. Write one failing test through a public interface.
3. Implement the smallest code that passes.
4. Refactor only while green.
5. Commit or checkpoint the slice.

Good test names describe behavior:

```txt
blocks generation when fewer than three screenshots are provided
normalizes provider quota errors into quota_exceeded
renders every storyboard screen into the requested store size
```

Bad tests describe internals:

```txt
calls validateScreenshotCount
sets private readinessStatus field
uses GeminiClient.generateContent
```

## Testing pyramid for v1

Prioritize behavior tests at package boundaries.

```txt
Most: package integration tests through public APIs
Some: pure unit tests for algorithms/value objects
Few: UI smoke tests for critical flows
```

Mocking policy:

- Mock external providers at adapter boundaries.
- Do not mock internal collaborators just to isolate classes.
- Use fake providers/local files for integration-style tests.

## First TDD tracer bullets

Recommended implementation order:

1. `schemas`: validates required `AppInput`.
2. `ai-pipeline/input-readiness`: blocks fewer than 3 screenshots.
3. `ai-pipeline/input-readiness`: blocks duplicate splash/logo-heavy inputs.
4. `model-gateway`: normalizes unknown provider config.
5. `model-gateway`: validates provider adapter contract with a fake provider.
6. `pattern-library`: retrieves patterns by category and tone.
7. `render-engine`: renders one `ScreenPlan` to target dimensions.
8. `export-engine`: creates manifest and ZIP folder structure.

## Code review checklist

- [ ] Behavior is covered through a public interface.
- [ ] Domain/application code does not import framework or provider SDKs.
- [ ] New abstraction removes real duplication or protects a real boundary.
- [ ] Generated AI output is schema-validated.
- [ ] Errors are domain/provider normalized.
- [ ] File/module has one clear reason to change.
- [ ] Core logic is app-agnostic.
