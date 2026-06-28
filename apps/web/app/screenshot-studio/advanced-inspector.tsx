import type { EditableStoryboard, GenerateResponse } from "./types";

export function AdvancedInspector({ result, storyboard }: { result: GenerateResponse | null; storyboard: EditableStoryboard | null }) {
  return (
    <section className="panel advanced-inspector" id="inspector">
      <details>
        <summary>Advanced developer inspector</summary>
        {!result ? <p>No generation loaded yet.</p> : (
          <div className="inspector-grid">
            <InspectorBlock title="Local project" value={{ path: result.localProjectPath, provider: result.provider, model: result.model, generationId: result.generationId }} />
            <InspectorBlock title="Quality report" value={result.qualityReport} />
            <InspectorBlock title="VisualSystem + Storyboard" value={{ visualSystem: result.visualSystem, storyboard: storyboard ?? result.storyboard }} />
            <InspectorBlock title="Premium planning" value={{ styleReference: result.styleReference, brandKit: result.brandKit, productUnderstanding: result.productUnderstanding, premiumRecipes: result.premiumRecipes, premiumCandidates: result.premiumCandidates, sceneSet: result.sceneSet }} />
            <InspectorBlock title="Export manifest" value={result.exportManifest} />
          </div>
        )}
      </details>
    </section>
  );
}

function InspectorBlock({ title, value }: { title: string; value: unknown }) {
  return <div className="inspector-block"><h3>{title}</h3><pre>{JSON.stringify(value, null, 2)}</pre></div>;
}
