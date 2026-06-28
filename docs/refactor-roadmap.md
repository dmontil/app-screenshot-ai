# Refactor Roadmap

This roadmap records the six-PR architecture refactor sequence started after the architecture audit.

## Completed sequence

1. **Verification baseline**
   - Fixed stale tests.
   - Replaced deprecated interactive `next lint` with ESLint CLI.
   - Added a root `test:coverage` script.

2. **Creator workspace view model**
   - Moved creator workspace display types and pack summary helpers out of `page.tsx`.
   - Added direct behavior tests for summary and locale badge mapping.

3. **Screenshot Studio navigation UI split**
   - Moved Studio sidebar/header/hero from the large UI bucket into `navigation.tsx`.
   - Preserved existing imports via re-export.

4. **Generate route utility extraction**
   - Moved pure route parsing/default helpers out of `app/api/generate/route.ts`.
   - Added tests for provider, generation mode, screenshot kind, secret, model, and slug parsing.

5. **Premium candidate selection extraction**
   - Moved premium candidate score/tie-break selection out of `GenerateStorePackUseCase`.
   - Added direct tests for score selection, variant priority, and empty input.

6. **Architecture guardrails documentation**
   - Documented expected React/Next module shape.
   - Documented refactor guardrails for future slices.

## Remaining refactor opportunities

- Continue shrinking `apps/web/app/page.tsx` by extracting provider settings state, project selection state, screenshot upload previews, and auto-rerender debounce logic.
- Continue splitting `apps/web/app/screenshot-studio/components.tsx` by feature area: project switcher, generation panels, manual copy editor, preview/quality/inspector.
- Continue thinning route handlers by extracting request parsers, presenters, filesystem persistence helpers, and session factories.
- Split `GenerateStorePackUseCase` into explicit flow modules after enough tested seams exist: deterministic SceneSet flow, AI-first composition flow, and style reference analysis flow.

## Verification expectations

Every refactor PR should run:

```bash
npm test
npm run lint
npm run build
```

Use `npm run test:coverage` when adding or moving tested seams.
