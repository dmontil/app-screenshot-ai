"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { StatusBanner } from "./status";

type AiImageDirectPanelProps = {
  loading: boolean;
  error: string | null;
  result: { image?: { fileName: string; dataUrl: string }; imageUrl?: string; prompt?: string; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }>; scenePlan?: unknown } | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AiImageDirectPanel(props: AiImageDirectPanelProps) {
  const [sceneType, setSceneType] = useState<"cover" | "feature">("feature");

  return (
    <section className="panel ai-direct-panel" id="ai-direct">
      <SectionHeader eyebrow="AI Image Direct" title="Generate one final App Store image" description="Fill only the product message, choose cover or feature, upload the visual references, then generate one PNG you can preview, download, and audit." />
      <div className="ai-direct-layout">
        <form onSubmit={props.onSubmit} className="ai-direct-form">
          <div className="form-card">
            <h3>1. Product message</h3>
            <div className="grid two">
              <Field label="App name"><input name="appName" required placeholder="VanTrip" /></Field>
              <Field label="Category"><input name="category" required placeholder="Travel / Campervan" /></Field>
              <Field label="Audience"><input name="targetAudience" required placeholder="Campervan owners planning weekend routes" /></Field>
              <Field label="Value proposition"><input name="valueProposition" required placeholder="Create personalized van trips fast" /></Field>
              <Field label="Headline"><input name="headline" placeholder="Leave blank to auto-generate" /></Field>
              <Field label="Subheadline"><input name="subheadline" placeholder="Smart routes for every RV adventure" /></Field>
            </div>
          </div>

          <div className="form-card">
            <h3>2. Semantic guidance</h3>
            <div className="grid two">
              <Field label="Product visual anchor"><textarea name="productVisualAnchor" placeholder="campervan, RV, route pin, road, map, compass, destination marker, route planning" /><small>Tell the model what the buddy/object/decorations must come from. This prevents it from copying mascots or drifting into generic category clichés.</small></Field>
              <Field label="Avoid generic clichés"><textarea name="avoidGenericCliches" placeholder="animal mascot, bear, backpack mascot, generic hiking gear, fake badges, stock mountains, generic camping poster" /><small>Comma or newline separated. Use this to block bears, laurels, fake ratings, proof badges, etc.</small></Field>
            </div>
          </div>

          <div className="form-card compact-fields">
            <h3>3. Scene and output</h3>
            <div className="grid three">
              <Field label="Scene type"><select name="sceneType" value={sceneType} onChange={(event) => setSceneType(event.target.value as "cover" | "feature")}><option value="cover">Cover / hook</option><option value="feature">Feature with screenshot</option></select></Field>
              <Field label="Output width"><input name="outputWidth" type="number" defaultValue="1320" min="320" /></Field>
              <Field label="Output height"><input name="outputHeight" type="number" defaultValue="2868" min="320" /></Field>
            </div>
          </div>

          <div className="form-card">
            <h3>4. Inputs</h3>
            <div className="grid two">
              <Field label="Style reference"><input name="referenceStyleImage" type="file" accept="image/png,image/jpeg,image/webp" required /><small>Required. Use the target visual style.</small></Field>
              <Field label="App screenshot"><input name="screenshotImage" type="file" accept="image/png,image/jpeg,image/webp" required={sceneType === "feature"} disabled={sceneType === "cover"} /><small>{sceneType === "feature" ? "Required for feature scenes." : "Disabled for cover-only exploration."}</small></Field>
              <Field label="Approved cover"><input name="approvedCoverImage" type="file" accept="image/png,image/jpeg,image/webp" /><small>Optional. Keeps later feature scenes consistent with a cover you like.</small></Field>
              <Field label="FAL key"><input name="falKey" type="password" placeholder="Uses FAL_KEY env if empty" autoComplete="off" /><small>Paste only when your local env has no key.</small></Field>
            </div>
            <input name="projectId" type="hidden" value="ai-image-direct" />
          </div>

          <div className="actions sticky-actions">
            <button className="button primary large" disabled={props.loading}>{props.loading ? "Generating PNG..." : "Generate PNG"}</button>
            <small>Calls fal-ai/nano-banana-2/edit and stores the prompt, response, and output image locally.</small>
          </div>
        </form>

        <aside className="ai-direct-preview" id="ai-direct-result" aria-label="AI Image Direct preview">
          <div className="preview-frame">
            {props.result?.image ? <img src={props.result.image.dataUrl} alt="AI Image Direct result" /> : <div className="preview-placeholder"><b>Preview appears here</b><small>Generate a PNG to download it and inspect the prompt.</small></div>}
          </div>
          {props.error && <StatusBanner kind="error">{props.error}</StatusBanner>}
          {props.result?.image && (
            <div className="ai-direct-result">
              <div className="actions"><a className="button primary" href={props.result.image.dataUrl} download={props.result.image.fileName}>Download PNG</a><small>{props.result.localProjectPath}</small></div>
              <details className="advanced-card" open><summary>Scene plan</summary><pre>{JSON.stringify(props.result.scenePlan ?? {}, null, 2)}</pre></details>
              <details className="advanced-card"><summary>Generation log</summary><pre>{JSON.stringify(props.result.trace ?? [], null, 2)}</pre></details>
              <details className="advanced-card"><summary>Inspect generated prompt</summary><pre>{props.result.prompt}</pre></details>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
