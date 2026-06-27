# Auditoría del feedback CTO — App Screenshot AI

Fuente revisada: `/Users/monti/Documents/cto_review_app_screenshot_ai.md`

## Veredicto ejecutivo

El feedback es **mayoritariamente acertado**. La tesis central es correcta: el sistema ya tiene una buena base técnica, pero para llegar a calidad visual premium necesita pasar de “recetas deterministas + SVG” a un flujo con **visión real, dirección creativa, evaluación visual y repair loop**.

Pero no todo debe implementarse ya. Algunas propuestas tienen ROI altísimo; otras son buenas pero prematuras; y una recomendación debe matizarse: hacer **AI-first background/stage como camino principal** puede mejorar calidad, pero también aumenta coste, latencia, variabilidad y dependencia de OpenAI. Conviene introducirlo como **premium mode / candidate mode**, no reemplazar de golpe el render determinista.

---

## Qué es realmente útil para nosotros

### P0 — Muy útil, deberíamos hacerlo

## 1. `AnalyzeScreenshotsUseCase` con visión real

**Valor:** altísimo.  
**Estado actual:** no existe de verdad. `ProductUnderstanding.screenInventory` infiere roles por nombre/path.

Esto es el punto más importante del feedback.

Ahora mismo el sistema no sabe si un screenshot muestra mapa, lista, checkout, dashboard, paywall o una pantalla pobre. Por eso puede elegir mal:

- qué screenshot usar como hook,
- qué pantalla merece zoom/callout,
- dónde colocar texto sin tapar UI,
- qué screenshot es comercialmente fuerte,
- qué pantalla se lee bien en miniatura.

**Implementación recomendada:** sí, pero con contrato más simple al principio.

MVP:

```ts
type ScreenshotVisionAnalysis = {
  screenshotId: string;
  role: "home" | "search" | "map" | "detail" | "profile" | "paywall" | "settings" | "unknown";
  visibleFeatures: string[];
  commercialValue: number; // 0..1
  thumbnailReadability: number; // 0..1
  visualDensity: "low" | "medium" | "high";
  bestUse: Array<"hook" | "feature" | "proof" | "comparison" | "cta" | "secondary">;
  avoidCoveringZones: Array<{ x: number; y: number; w: number; h: number; reason: string }>;
  suggestedCrop: "full" | "top-focus" | "center-focus" | "bottom-focus" | "zoomed-detail";
  oneSentenceScreenMeaning: string;
};
```

**Por qué sí:** mejora selección, copy, composición y evaluación. Es la base para todo lo demás.

---

## 2. Multimodal visual evaluator sobre contact sheet

**Valor:** altísimo.  
**Estado actual:** el evaluator puntúa estructura JSON, no mira imágenes finales.

El feedback acierta: podemos tener falsos positivos. Un set puede tener buena diversidad estructural y aun así parecer barato, ilegible o genérico.

**Implementación recomendada:** sí.

MVP:

```ts
type VisualQualityEvaluation = {
  overallScore: number;
  premiumPerception: number;
  appStoreCompetitiveness: number;
  thumbnailReadability: number;
  screenshotVisibility: number;
  visualConsistency: number;
  categoryFit: number;
  referenceAdaptation: number;
  templateGenericness: number;
  majorIssues: string[];
  repairInstructions: string[];
  bestSceneIndex: number;
  worstSceneIndex: number;
};
```

**Condición importante:** evaluar un **contact sheet** con las 5 imágenes juntas, no cada PNG aislado. La continuidad de campaña se ve en conjunto.

**Por qué sí:** sin evaluación visual, no sabemos si los cambios mejoran o empeoran.

---

## 3. `CreativeDirectorUseCase`

**Valor:** alto.  
**Estado actual:** no existe como capa explícita. Tenemos receta + SceneSet determinista + storyboard IA.

La crítica es correcta: la campaña visual debería decidirse antes de construir escenas. Las recetas ayudan, pero no sustituyen una dirección creativa específica del producto.

**Implementación recomendada:** sí, después de screenshot vision o junto a ella.

MVP:

```ts
type CreativeDirectionPlan = {
  campaignConcept: string;
  visualPromise: string;
  archetype: string;
  setNarrative: Array<{
    index: number;
    conversionJob: "stop-scroll" | "explain-core-value" | "show-product-mechanism" | "build-trust" | "close-with-outcome";
    screenshotId: string;
    userQuestionAnswered: string;
    visualStrategy: string;
    copyAngle: string;
    risks: string[];
  }>;
  artDirection: {
    mood: string;
    lighting: string;
    depth: string;
    backgroundLanguage: string;
    deviceLanguage: string;
    objectLanguage: string;
  };
  forbidden: string[];
};
```

**Por qué sí:** convierte el sistema en “diseñador de campaña”, no solo “rellenador de template”.

---

## 4. Guardar/renderizar todas las variantes

**Valor:** medio-alto, muy práctico.  
**Estado actual:** se generan `premiumCandidates`, pero no necesariamente se renderizan/guardan todos visualmente como variantes comparables.

Esto tiene ROI rápido porque permite ver si `director-cut`, `object-rich`, etc. realmente mejoran.

Estructura recomendada:

```txt
.local/projects/{projectId}/generations/{generationId}/
  variants/
    balanced/
      screenshots/
      quality-report.json
      visual-evaluation.json
    object-rich/
    split-heavy/
    dark-premium/
    director-cut/
```

**Por qué sí:** mejora debug y evaluación sin cambiar el core creativo todavía.

---

## 5. Prompt/version registry

**Valor:** medio-alto.  
**Estado actual:** prompts embebidos en código.

Para iterar calidad visual, necesitamos saber qué prompt produjo qué resultado.

**Implementación recomendada:** sí, pero ligera.

```txt
prompts/
  style-reference/v1.md
  screenshot-analysis/v1.md
  creative-director/v1.md
  storyboard/v1.md
  visual-evaluator/v1.md
  repair/v1.md
```

Cada generación debería guardar:

```ts
{
  promptVersions,
  provider,
  model,
  imageModel,
  styleReferenceId,
  recipeId,
  archetype,
  visualEvaluation,
  qualityReport
}
```

**Por qué sí:** sin versionado de prompts, no hay mejora sistemática.

---

# P1 — Útil, pero con matices

## 6. AI-first background/stage como camino premium

**Valor:** alto para calidad visual.  
**Riesgo:** alto si se convierte en único camino.

El feedback dice convertirlo en camino principal premium. Estoy de acuerdo solo parcialmente.

Sí deberíamos separar:

```txt
AI stage: fondo, atmósfera, profundidad, objetos abstractos
Deterministic render: teléfono, screenshot real, texto, safe zones, export
```

Pero no lo haría obligatorio para todas las generaciones porque:

- sube coste,
- sube latencia,
- añade variabilidad,
- puede generar fondos inconsistentes,
- depende más de OpenAI/gpt-image,
- puede fallar con texto falso o artefactos aunque el prompt lo prohíba.

**Recomendación:** implementarlo como `premiumAiStageMode`:

```ts
type GenerationMode = "deterministic" | "ai-stage-premium" | "benchmark";
```

Uso ideal:

- default local/rápido: deterministic,
- premium quality: AI stage + deterministic overlay,
- benchmark: varias variantes y providers.

**Conclusión:** útil, pero no reemplazaría el renderer determinista. Lo usaría como capa premium opcional/candidate.

---

## 7. Repair loop

**Valor:** alto.  
**Dependencia:** necesita visual evaluator primero.

Tiene sentido, pero no antes de poder medir visualmente. Sin evaluator, el repair loop sería adivinanza.

MVP razonable:

```txt
render variants
-> visual evaluation contact sheet
-> if score below gate, apply one repair
-> rerender selected variant
-> reevaluate
```

No más de 1 iteración al inicio.

Reglas útiles:

- baja visibilidad screenshot -> reducir tilt/objetos, agrandar device,
- baja legibilidad -> simplificar background/top zone, acortar headline,
- alto genericness -> usar arquetipo específico y quitar blobs/cards genéricas,
- baja referenceAdaptation -> regenerar stage con tokens portables,
- baja consistency -> unificar palette/decoración.

**Conclusión:** sí, pero después de visual evaluator y contact sheet.

---

## 8. `CategoryArchetype`

**Valor:** alto para calidad; implementación moderada.  
**Estado actual:** categorías amplias, aunque ya hay heurísticas de keywords para campervan/maps/books/etc.

El feedback es correcto: `travel` no basta. Campervan, hotels, city guide y flight tracker no deberían verse igual.

MVP:

```ts
type CategoryArchetype =
  | "campervan-roadtrip"
  | "city-travel"
  | "route-planner"
  | "hotel-booking"
  | "fitness-tracker"
  | "habit-tracker"
  | "personal-finance"
  | "ai-productivity"
  | "photo-editor"
  | "unknown";
```

No hace falta cubrir 20 arquetipos ahora. Empezar con los que usamos en ejemplos/evals.

**Conclusión:** sí, especialmente combinado con screenshot vision y creative director.

---

## 9. Ampliar `StyleReferenceAnalysis` con tokens portables/no portables

**Valor:** medio-alto.  
**Estado actual:** ya analiza summary, rhythm, typography, color/lighting, rules, forbidden carryovers.

La propuesta es buena porque hace más accionable la referencia.

Añadir:

```ts
portableDesignTokens: {
  depthLevel: "low" | "medium" | "high";
  lightingModel: string;
  backgroundComplexity: "clean" | "medium" | "dense";
  devicePlacementPatterns: string[];
  decorationDensity: number;
  headlineZone: "top" | "center" | "bottom";
  contrastStrategy: string;
  rhythm: string[];
};
nonPortableElements: string[];
```

**Conclusión:** sí, pero no es lo primero. Útil cuando metamos creative director / AI stages.

---

## 10. `ConversionJob`

**Valor:** medio-alto.  
**Estado actual:** hay roles `hook`, `feature`, `proof`, `comparison`, `cta`, pero no están formalizados como jobs comerciales.

Es una mejora buena y barata. Puede incorporarse dentro de `CreativeDirectionPlan` o `Scene.role`.

Mapping sugerido:

```txt
hook -> stop-scroll
feature -> explain-core-value
comparison -> show-product-mechanism
proof -> build-trust
cta -> close-with-outcome
```

**Conclusión:** sí, porque ayuda a copy/layout/evaluación.

---

## 11. `CopyCriticUseCase`

**Valor:** medio.  
**Estado actual:** evaluator tiene checks simples de headline y benefit clarity.

Tiene sentido, pero lo integraría dentro del evaluator/repair antes que crear un gran módulo aparte.

Regla más útil del feedback:

```txt
Si el headline podría servir para cualquier app de la categoría, es malo.
```

MVP:

- generic risk,
- specificity,
- screenshot alignment,
- rewrite suggestions.

**Conclusión:** útil, pero P1/P2. No bloquea arquitectura.

---

# P2 — Útil después, no ahora

## 12. Benchmark library contra competidores

**Valor:** alto a largo plazo.  
**Coste:** alto manual/editorial.

Es correcto que “top 1%” necesita calibración. Pero construir una librería completa por categoría/arquetipo puede distraer ahora.

MVP más barato:

```txt
docs/benchmarks/
  travel-campervan.md
  utility-ai-productivity.md
  finance-personal.md
  fitness-tracker.md
```

Cada uno con:

- 5-10 referencias,
- patrones premium,
- patrones débiles,
- reglas de copy,
- reglas de composición.

**Conclusión:** útil, pero después de visual evaluator. Primero necesitamos medir nuestras salidas.

---

## 13. Human review mode

**Valor:** medio.  
**Momento:** producto más maduro.

Es realista: top 1% totalmente automático es difícil. Pero ahora el cuello de botella es pipeline/quality, no edición manual.

Sí tendría sentido más adelante permitir elegir:

- variante,
- headline,
- screenshot assignment,
- intensidad visual,
- background.

**Conclusión:** no ahora. Primero generar buenas opciones.

---

# Qué NO haría o no priorizaría

## 1. No añadiría más recetas SVG ahora

El feedback acierta. Más recetas/objetos puede mejorar variedad, pero no resuelve comprensión ni calidad visual.

Mantener las recetas existentes como fallback/base, pero no invertir P0 en ampliar de 6 a 20 recetas.

## 2. No haría AI-first obligatorio

Lo haría modo premium. El renderer determinista es una ventaja competitiva para:

- control,
- export exacto,
- reproducibilidad,
- evitar UI falsa,
- debugging.

## 3. No crearía demasiados schemas grandes de golpe

El feedback propone buenos contratos, pero conviene implementar vertical slices pequeñas:

1. screenshot vision,
2. creative direction mínima,
3. contact sheet evaluator,
4. one repair loop.

---

# Backlog recomendado para nosotros

## Sprint 1 — Hacer visible la verdad visual

1. `CreateContactSheetUseCase`
   - input: rendered assets,
   - output: PNG contact sheet.

2. `VisualQualityEvaluatorUseCase`
   - usa provider multimodal,
   - evalúa contact sheet,
   - guarda `visual-evaluation.json`.

3. Guardar/renderizar variantes completas
   - `balanced`, `object-rich`, `split-heavy`, `dark-premium`, `director-cut`.

**Por qué este orden:** antes de cambiar el sistema, necesitamos una manera fiable de ver y medir resultados.

---

## Sprint 2 — Entender screenshots

1. `AnalyzeScreenshotsUseCase`
   - multimodal sobre screenshots subidos,
   - actualiza/expande `ProductUnderstanding.screenInventory`.

2. Usar analysis en:
   - selección de screenshot por escena,
   - crop,
   - bestUse,
   - avoidCoveringZones,
   - copy alignment.

**Impacto esperado:** menos pantallas mal asignadas y menos copy genérico.

---

## Sprint 3 — Dirección creativa

1. `DetectCategoryArchetypeUseCase` simple.
2. `CreativeDirectorUseCase`.
3. Adaptar `BuildPremiumSceneSetUseCase` para aceptar `CreativeDirectionPlan`.

**Impacto esperado:** campañas más específicas por app, menos sensación de template.

---

## Sprint 4 — Premium AI stages + repair

1. `GenerateAIBackgroundStagesUseCase` como modo premium.
2. `RepairStorePackUseCase` con una iteración.
3. Rerender + reevaluate.

**Impacto esperado:** salto de calidad visual y profundidad.

---

# Decisión final

El feedback es útil y apunta bien. Priorizaría así:

```txt
1. Visual evaluator + contact sheet
2. AnalyzeScreenshotsUseCase
3. CreativeDirectorUseCase
4. Render/guardar variantes completas
5. CategoryArchetype
6. AI premium stages como modo opcional
7. Repair loop
8. Prompt registry
9. Copy critic
10. Benchmark library
11. Human review mode
```

La tesis que debemos adoptar:

```txt
No necesitamos más templates.
Necesitamos percepción visual, dirección creativa y evaluación visual.
```

La tesis que debemos matizar:

```txt
AI-first debe ser un modo premium, no reemplazo total del render determinista.
```
