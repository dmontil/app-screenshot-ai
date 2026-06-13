"use client";

import { useState } from "react";

import type { EditableStoryboard, GenerateResponse, ProjectSummary, TextLayerOverride } from "./types";

const categories = ["travel", "productivity", "fitness", "finance", "education", "utility", "social"];

type ProviderSettingsProps = {
  provider: string;
  model: string;
  geminiApiKey: string;
  openaiApiKey: string;
  onProviderChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onGeminiApiKeyChange: (value: string) => void;
  onOpenaiApiKeyChange: (value: string) => void;
};

type ProjectSwitcherProps = {
  projects: ProjectSummary[];
  selectedProjectId: string;
  selectedGenerationId: string;
  loadingGeneration: boolean;
  onProjectChange: (value: string) => void;
  onGenerationChange: (value: string) => void;
  onLoad: () => void;
  onRefresh: () => void;
};

type ScreenshotPreview = { name: string; size: number; type: string; url: string };

type CreationStepperProps = ProviderSettingsProps & {
  loading: boolean;
  fileCount: number;
  screenshotPreviews: ScreenshotPreview[];
  onScreenshotsChange: (files: FileList | null) => void;
};

type PreviewGalleryProps = {
  result: GenerateResponse | null;
  storyboard: EditableStoryboard | null;
  loading: boolean;
};

type ManualCopyEditorProps = {
  storyboard: EditableStoryboard | null;
  rerendering: boolean;
  autoRerender: boolean;
  activeLocale: string;
  translationStatus: string;
  onActiveLocaleChange: (value: string) => void;
  onTranslateCopy: () => void;
  onAutoRerenderChange: (value: boolean) => void;
  onUpdateScreenText: (index: number, field: "headline" | "subheadline", value: string) => void;
  onUpdateCalloutLabel: (screenIndex: number, calloutIndex: number, value: string) => void;
  onUpdateTextLayer: (screenIndex: number, layer: "headline" | "subheadline", field: keyof TextLayerOverride, value: string) => void;
  onSaveVersion: () => void;
};

type QualityExportProps = {
  result: GenerateResponse;
  rerendering: boolean;
  onDownload: () => void;
};

export function StudioHero() {
  return (
    <section className="studio-hero">
      <div className="hero-copy">
        <div className="badge">Local-first · BYOK · Open-source</div>
        <h1>Create App Store screenshots in minutes.</h1>
        <p>
          Upload raw app screens, generate a coherent five-screen store set, edit the copy visually, and download a ZIP — all from a local-first Screenshot Studio.
        </p>
        <div className="hero-actions">
          <a className="button primary" href="#create">Start with fixture demo</a>
          <a className="button secondary" href="#projects">Load saved project</a>
        </div>
      </div>
      <div className="hero-preview" aria-label="Example generated store screenshot set">
        {[
          "Turn books into routes",
          "Find places nearby",
          "Walk the story",
          "Save every trip",
          "Share memories",
        ].map((headline, index) => (
          <div className="store-mock" key={headline}>
            <b>{headline}</b>
            <span className="device-mock" />
            <small>{String(index + 1).padStart(2, "0")}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProjectSwitcher(props: ProjectSwitcherProps) {
  const selectedProject = props.projects.find((project) => project.projectId === props.selectedProjectId);

  return (
    <section className="panel project-switcher" id="projects">
      <SectionHeader eyebrow="Project history" title="Saved projects & A/B versions" description="Load a previous generation when you want to continue editing or compare manual rerenders." />
      <div className="grid two">
        <Field label="Project">
          <select value={props.selectedProjectId} onChange={(event) => props.onProjectChange(event.target.value)}>
            <option value="">Choose a saved project</option>
            {props.projects.map((project) => (
              <option value={project.projectId} key={project.projectId}>{project.appName ? `${project.appName} — ` : ""}{project.projectId}</option>
            ))}
          </select>
        </Field>
        <Field label="Generation">
          <select value={props.selectedGenerationId} onChange={(event) => props.onGenerationChange(event.target.value)} disabled={!selectedProject}>
            <option value="">Choose a generation</option>
            {selectedProject?.generations.map((generation) => (
              <option value={generation.generationId} key={generation.generationId}>
                {generation.label ?? generation.kind} · {new Date(generation.createdAt).toLocaleString()} · {generation.generationId}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="actions">
        <button type="button" className="button primary" disabled={!props.selectedProjectId || !props.selectedGenerationId || props.loadingGeneration} onClick={props.onLoad}>{props.loadingGeneration ? "Loading generation..." : "Load for editing"}</button>
        <button type="button" className="button secondary" onClick={props.onRefresh}>Refresh projects</button>
      </div>
    </section>
  );
}

export function CreationStepper(props: CreationStepperProps) {
  return (
    <section className="panel create-panel" id="create">
      <SectionHeader eyebrow="New project" title="Upload, describe, generate" description="A guided path for the required AppInput: raw screenshots, audience, value proposition, brand hints, and target locale." />
      <div className="stepper" aria-label="Creation steps">
        <Step active label="1" title="Upload" detail="3–8 app screens" />
        <Step active label="2" title="Brand" detail="Audience + value" />
        <Step label="3" title="Generate" detail="Fixture or BYOK" />
      </div>

      <div className="studio-section">
        <div>
          <h3>1. Upload screenshots</h3>
          <p>Upload at least 3 screenshots. At least 2 should show functional in-app UI; avoid relying on splash/logo screens.</p>
        </div>
        <Field label="Raw app screenshots">
          <input name="screenshots" type="file" accept="image/png,image/jpeg" multiple required onChange={(event) => props.onScreenshotsChange(event.target.files)} />
          <small>{props.fileCount ? `${props.fileCount} file(s) selected` : "No files selected yet."}</small>
        </Field>
        {props.screenshotPreviews.length > 0 && (
          <div className="upload-preview-grid" aria-label="Selected screenshot previews">
            {props.screenshotPreviews.map((file, index) => (
              <figure className="upload-preview-card" key={`${file.name}-${index}`}>
                <img src={file.url} alt={`Selected screenshot ${index + 1}: ${file.name}`} />
                <figcaption>
                  <b>{String(index + 1).padStart(2, "0")} · {file.name}</b>
                  <span>{formatFileSize(file.size)} · {file.type || "image"}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <div className="grid three">
          {Array.from({ length: Math.max(props.fileCount, 3) }).map((_, index) => (
            <Field label={`Screenshot ${index + 1} kind`} key={index}>
              <select name="screenshotKinds" defaultValue="functional">
                <option value="functional">Functional UI</option>
                <option value="splash">Splash</option>
                <option value="logo">Logo</option>
                <option value="empty">Empty</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
          ))}
        </div>
      </div>

      <div className="studio-section">
        <div>
          <h3>2. Brand & audience</h3>
          <p>Keep it short. The pipeline uses these fields to create the creative brief, VisualSystem, and storyboard.</p>
        </div>
        <div className="grid two">
          <Field label="Project ID"><input name="projectId" placeholder="literarytrip" defaultValue="ui-test-project" /></Field>
          <Field label="Generation label"><input name="generationLabel" placeholder="A/B label" defaultValue="AI generation" /></Field>
          <Field label="App name"><input name="appName" required defaultValue="LiteraryTrip" /></Field>
          <Field label="Category"><select name="category" defaultValue="travel">{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></Field>
          <Field label="Base locale"><input name="baseLocale" required defaultValue="en-US" /></Field>
          <Field label="Target audience"><input name="targetAudience" required defaultValue="readers who travel" /></Field>
          <Field label="Main value proposition"><input name="mainValueProposition" required defaultValue="turn books into walkable routes" /></Field>
          <Field label="Brand colors"><input name="brandColors" defaultValue="#F7F1E7, #3B2416, #D99A32" /></Field>
          <Field label="Website URL"><input name="websiteUrl" placeholder="https://example.com" /></Field>
        </div>
      </div>

      <ProviderSettings {...props} />

      <div className="actions sticky-actions">
        <button className="button primary large" disabled={props.loading}>{props.loading ? "Generating your store set..." : "Generate screenshots"}</button>
        <small>Creates 5 PNGs, quality checks, ZIP, and local project artifacts.</small>
      </div>
    </section>
  );
}

export function ProviderSettings(props: ProviderSettingsProps) {
  return (
    <details className="advanced-card">
      <summary>Advanced provider settings</summary>
      <p>Fixture mode is the fastest way to test. Switch to Gemini or OpenAI when you want model-generated output with your own local key. Masked values mean a key was detected from your local environment.</p>
      <div className="key-status-row">
        <span className={props.geminiApiKey ? "key-status configured" : "key-status"}>Gemini key {props.geminiApiKey ? "configured" : "not set"}</span>
        <span className={props.openaiApiKey ? "key-status configured" : "key-status"}>OpenAI key {props.openaiApiKey ? "configured" : "not set"}</span>
      </div>
      <div className="grid two">
        <Field label="Provider">
          <select name="provider" value={props.provider} onChange={(event) => props.onProviderChange(event.target.value)}>
            <option value="fixture">Fixture — no API key</option>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </Field>
        <Field label="Model"><input name="model" value={props.model} onChange={(event) => props.onModelChange(event.target.value)} /></Field>
        <Field label="Gemini API key"><input name="geminiApiKey" type="password" autoComplete="off" value={props.geminiApiKey} onChange={(event) => props.onGeminiApiKeyChange(event.target.value)} placeholder="Only required for Gemini" /></Field>
        <Field label="OpenAI API key"><input name="openaiApiKey" type="password" autoComplete="off" value={props.openaiApiKey} onChange={(event) => props.onOpenaiApiKeyChange(event.target.value)} placeholder="Only required for OpenAI" /></Field>
      </div>
    </details>
  );
}

export function PreviewGallery({ result, storyboard, loading }: PreviewGalleryProps) {
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number | null>(null);
  const screensByIndex = new Map(storyboard?.screens.map((screen) => [screen.index, screen]));
  const selectedPreview = selectedPreviewIndex !== null ? result?.screenshots[selectedPreviewIndex] : undefined;
  const selectedScreen = selectedPreviewIndex !== null ? screensByIndex.get(selectedPreviewIndex + 1) : undefined;

  return (
    <section className="panel" id="preview">
      <SectionHeader eyebrow="Preview" title="Generated store set" description="Review the rendered PNGs before fine-tuning the copy." />
      {!result ? (
        <div className="empty-preview">
          <div className={`preview-row skeleton ${loading ? "is-generating" : ""}`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="skeleton-shot" key={index}>
                <span className="shader-orb one" />
                <span className="shader-orb two" />
                <span className="shader-phone" />
                <span className="shader-line" />
              </div>
            ))}
          </div>
          <p>{loading ? "Composing backgrounds, devices, copy, and export assets…" : "Generated screenshots will appear here after the first run."}</p>
        </div>
      ) : (
        <div className="preview-grid">
          {result.screenshots.map((screenshot, index) => {
            const screen = screensByIndex.get(index + 1);
            return (
              <button type="button" className="preview-card" key={screenshot.fileName} onClick={() => setSelectedPreviewIndex(index)}>
                <img src={screenshot.dataUrl} alt={`Generated screenshot ${index + 1}: ${screen?.headline ?? screenshot.fileName}`} />
                <span className="preview-caption">
                  <b>{String(index + 1).padStart(2, "0")} · {screen?.role ?? "store screen"}</b>
                  <span>{screen?.headline ?? screenshot.fileName}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {selectedPreview && (
        <div className="preview-modal" role="dialog" aria-modal="true" aria-label="Large screenshot preview" onClick={() => setSelectedPreviewIndex(null)}>
          <div className="preview-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="preview-modal-header">
              <div>
                <b>{selectedScreen?.headline ?? selectedPreview.fileName}</b>
                <small>{selectedPreview.fileName}</small>
              </div>
              <button type="button" className="button secondary" onClick={() => setSelectedPreviewIndex(null)}>Close</button>
            </div>
            <img src={selectedPreview.dataUrl} alt={`Large preview: ${selectedScreen?.headline ?? selectedPreview.fileName}`} />
          </div>
        </div>
      )}
    </section>
  );
}

export function ManualCopyEditor(props: ManualCopyEditorProps) {
  if (!props.storyboard) return null;

  return (
    <section className="panel editor-panel">
      <SectionHeader eyebrow="Editor" title="Fine-tune copy and layout" description="Edit the AI draft without calling the model again. Auto-preview rerenders PNGs locally after a short delay." />
      <div className="translation-panel">
        <div>
          <b>Write another locale</b>
          <small>Choose a target language, then use Translate copy as the starting point for localized screenshots.</small>
        </div>
        <select value={props.activeLocale} onChange={(event) => props.onActiveLocaleChange(event.target.value)} aria-label="Target translation language">
          <option value="en-US">English — US</option>
          <option value="es-ES">Español — España</option>
          <option value="es-MX">Español — México</option>
          <option value="fr-FR">Français</option>
          <option value="de-DE">Deutsch</option>
          <option value="it-IT">Italiano</option>
          <option value="pt-BR">Português — Brasil</option>
        </select>
        <button type="button" className="button primary translate-cta" onClick={props.onTranslateCopy}>Translate copy</button>
        {props.translationStatus && <small className="translation-status">{props.translationStatus}</small>}
      </div>
      <div className="editor-layout">
        <div className="storyboard-list">
          {props.storyboard.screens.map((screen) => (
            <article className="screen-card" key={screen.id}>
              <div className="screen-heading"><b>{String(screen.index).padStart(2, "0")}. {screen.role}</b><small>{screen.treatment ?? "hero-device"}</small></div>
              <Field label="Headline"><textarea value={screen.headline} onChange={(event) => props.onUpdateScreenText(screen.index, "headline", event.target.value)} /></Field>
              <Field label="Subheadline"><textarea value={screen.subheadline ?? ""} onChange={(event) => props.onUpdateScreenText(screen.index, "subheadline", event.target.value)} /></Field>
              {(screen.callouts ?? []).map((callout, calloutIndex) => (
                <Field label={`Callout ${calloutIndex + 1}`} key={calloutIndex}>
                  <input value={callout.label} onChange={(event) => props.onUpdateCalloutLabel(screen.index, calloutIndex, event.target.value)} />
                </Field>
              ))}
              <TextControls screen={screen} onUpdateTextLayer={props.onUpdateTextLayer} />
            </article>
          ))}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="button primary" disabled={props.rerendering || !props.storyboard} onClick={props.onSaveVersion}>{props.rerendering ? "Updating preview..." : "Save version"}</button>
        <label className="inline-toggle"><input type="checkbox" checked={props.autoRerender} onChange={(event) => props.onAutoRerenderChange(event.target.checked)} /> Fast auto preview</label>
        <small>Preview now starts about 300ms after you stop typing. Save version adds this rerender to A/B history.</small>
      </div>
    </section>
  );
}

function TextControls({ screen, onUpdateTextLayer }: { screen: EditableStoryboard["screens"][number]; onUpdateTextLayer: ManualCopyEditorProps["onUpdateTextLayer"] }) {
  return (
    <details className="advanced-card compact">
      <summary>Typography & position</summary>
      <div className="grid three">
        <Field label="Headline font"><select value={screen.text?.headline?.fontFamily ?? ""} onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontFamily", event.target.value)}><option value="">Visual system default</option><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Avenir Next">Avenir Next</option><option value="Helvetica Neue">Helvetica Neue</option></select></Field>
        <Field label="Headline size"><input type="number" min="40" max="140" value={screen.text?.headline?.fontSize ?? ""} placeholder="104" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontSize", event.target.value)} /></Field>
        <Field label="Headline weight"><input type="number" min="300" max="950" step="50" value={screen.text?.headline?.fontWeight ?? ""} placeholder="760" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontWeight", event.target.value)} /></Field>
        <Field label="Wrap chars"><input type="number" min="8" max="28" value={screen.text?.headline?.maxCharsPerLine ?? ""} placeholder="16" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "maxCharsPerLine", event.target.value)} /></Field>
        <Field label="Headline X"><input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.x ?? ""} placeholder="0.07" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "x", event.target.value)} /></Field>
        <Field label="Headline Y"><input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.y ?? ""} placeholder="0.09" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "y", event.target.value)} /></Field>
        <Field label="Align"><select value={screen.text?.headline?.align ?? ""} onChange={(event) => onUpdateTextLayer(screen.index, "headline", "align", event.target.value)}><option value="">Default</option><option value="start">Left</option><option value="middle">Center</option><option value="end">Right</option></select></Field>
        <Field label="Subheadline size"><input type="number" min="18" max="58" value={screen.text?.subheadline?.fontSize ?? ""} placeholder="34" onChange={(event) => onUpdateTextLayer(screen.index, "subheadline", "fontSize", event.target.value)} /></Field>
        <Field label="Subheadline Y"><input type="number" min="0" max="1" step="0.01" value={screen.text?.subheadline?.y ?? ""} placeholder="auto" onChange={(event) => onUpdateTextLayer(screen.index, "subheadline", "y", event.target.value)} /></Field>
      </div>
    </details>
  );
}

export function QualityExport({ result, rerendering, onDownload }: QualityExportProps) {
  const report = result.qualityReport as { checks?: Array<{ name?: string; status?: string; message?: string }> };
  const checks = Array.isArray(report?.checks) && report.checks.length ? report.checks : [
    { name: "Rendered assets", status: "ok", message: `${result.screenshots.length} PNGs ready` },
    { name: "Export package", status: "ok", message: result.zip.fileName },
  ];

  return (
    <section className="panel export-panel">
      <SectionHeader eyebrow="Export" title="Ready to download" description="Download saves the current preview as an A/B version first when needed, then exports the ZIP." />
      <div className="quality-list">
        {checks.slice(0, 6).map((check, index) => (
          <div className="quality-check" key={`${check.name}-${index}`}>
            <span className={check.status === "fail" ? "status-dot fail" : "status-dot ok"} />
            <div><b>{check.name ?? `Check ${index + 1}`}</b><small>{check.message ?? check.status ?? "Ready"}</small></div>
          </div>
        ))}
      </div>
      <div className="actions">
        <button type="button" className="button primary large" disabled={rerendering} onClick={onDownload}>{rerendering ? "Saving..." : `Save version & download ${result.zip.fileName}`}</button>
        <small>{result.screenshots.length} PNGs · ZIP export · {result.localProjectPath}</small>
      </div>
    </section>
  );
}

export function AdvancedInspector({ result, storyboard }: { result: GenerateResponse | null; storyboard: EditableStoryboard | null }) {
  return (
    <section className="panel advanced-inspector">
      <details>
        <summary>Advanced developer inspector</summary>
        {!result ? <p>No generation loaded yet.</p> : (
          <div className="inspector-grid">
            <InspectorBlock title="Local project" value={{ path: result.localProjectPath, provider: result.provider, model: result.model, generationId: result.generationId }} />
            <InspectorBlock title="Quality report" value={result.qualityReport} />
            <InspectorBlock title="VisualSystem + Storyboard" value={{ visualSystem: result.visualSystem, storyboard: storyboard ?? result.storyboard }} />
            <InspectorBlock title="Premium planning" value={{ brandKit: result.brandKit, productUnderstanding: result.productUnderstanding, premiumRecipes: result.premiumRecipes, premiumCandidates: result.premiumCandidates, sceneSet: result.sceneSet }} />
            <InspectorBlock title="Export manifest" value={result.exportManifest} />
          </div>
        )}
      </details>
    </section>
  );
}

export function StatusBanner({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return <section className={`status-banner ${kind}`}>{children}</section>;
}

function InspectorBlock({ title, value }: { title: string; value: unknown }) {
  return <div className="inspector-block"><h3>{title}</h3><pre>{JSON.stringify(value, null, 2)}</pre></div>;
}

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function Step({ active, label, title, detail }: { active?: boolean; label: string; title: string; detail: string }) {
  return <div className={`step ${active ? "active" : ""}`}><strong>{label}</strong><div><b>{title}</b><small>{detail}</small></div></div>;
}
