"use client";

import { useState } from "react";

import { STANDARD_STYLE_REFERENCES } from "@app-screenshot-ai/schemas";

import type { EditableStoryboard, GenerateResponse, ProjectSummary, StoredAppInput, TextLayerOverride } from "./types";

const categories = ["travel", "productivity", "fitness", "finance", "education", "utility", "social"];

type ProviderSettingsProps = {
  provider: string;
  model: string;
  geminiApiKey: string;
  openaiApiKey: string;
  defaultOpen?: boolean | undefined;
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
  prefillMode: "blank" | "demo";
  loadedInput: StoredAppInput | null;
  loadedProjectId?: string | undefined;
  generationMode: "deterministic" | "premium-direct";
  premiumDirectCandidateCount: number;
  generationModeIssue?: string | undefined;
  onGenerationModeChange: (value: "deterministic" | "premium-direct") => void;
  onPremiumDirectCandidateCountChange: (value: number) => void;
  onUseDemoProject: () => void;
  onStartBlankProject: () => void;
  onScreenshotsChange: (files: FileList | null) => void;
};

type AiImageDirectPanelProps = {
  loading: boolean;
  error: string | null;
  result: { image?: { fileName: string; dataUrl: string }; imageUrl?: string; prompt?: string; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }>; scenePlan?: unknown } | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
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

type StudioTopBarProps = {
  result: GenerateResponse | null;
  selectedProject: ProjectSummary | undefined;
  selectedGenerationId: string;
  hasUnsavedPreview: boolean;
  rerendering: boolean;
  autoRerender: boolean;
  onDownload: () => void;
};

type StudioNavigationProps = {
  result: GenerateResponse | null;
  selectedProject: ProjectSummary | undefined;
  hasUnsavedPreview: boolean;
  rerendering: boolean;
  autoRerender: boolean;
  onDownload: () => void;
};

const primaryNavItems = [
  { href: "#ai-direct-pack", label: "Pack", detail: "Plan 4–5 screenshots" },
  { href: "#ai-direct", label: "Single", detail: "Generate one PNG" },
  { href: "#ai-direct-result", label: "Preview", detail: "Download and inspect" },
  { href: "#create", label: "Full set", detail: "Legacy flow" },
];

const advancedNavItems = [
  { href: "#projects", label: "Projects" },
  { href: "#pipeline", label: "Pipeline" },
  { href: "#provider-settings", label: "Provider settings" },
  { href: "#inspector", label: "Inspector" },
];

export function StudioSidebar({ result, selectedProject, hasUnsavedPreview }: Pick<StudioNavigationProps, "result" | "selectedProject" | "hasUnsavedPreview">) {
  const projectLabel = result?.projectId ?? selectedProject?.appName ?? selectedProject?.projectId ?? "No project";

  return (
    <aside className="studio-sidebar" aria-label="Studio navigation">
      <a className="sidebar-brand" href="#top" aria-label="Go to top">
        <span className="brand-mark">AI</span>
        <span><b>Screenshot Studio</b><small>{projectLabel}</small></span>
      </a>
      <nav className="sidebar-nav" aria-label="Main tools">
        {primaryNavItems.map((item) => (
          <a href={item.href} key={item.href}>
            <b>{item.label}</b>
            <small>{item.detail}</small>
          </a>
        ))}
      </nav>
      <details className="sidebar-advanced">
        <summary>Advanced tools</summary>
        <nav aria-label="Advanced tools">
          {advancedNavItems.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
      </details>
      <span className={hasUnsavedPreview ? "status-pill warning" : "status-pill"}>{hasUnsavedPreview ? "Unsaved preview" : result ? "Saved version" : "Idle"}</span>
    </aside>
  );
}

export function StudioHeader(props: StudioNavigationProps) {
  const projectName = props.result?.projectId ?? props.selectedProject?.appName ?? props.selectedProject?.projectId ?? "No project open";
  const status = props.rerendering ? "Rendering preview" : props.hasUnsavedPreview ? "Unsaved preview" : props.result ? "Saved version" : "Ready to create";

  return (
    <header className="studio-header">
      <div>
        <small>AI Direct Pack workspace</small>
        <h1>{projectName}</h1>
      </div>
      <div className="header-meta" aria-label="Workspace status">
        <span>{status}</span>
        <span>Auto-preview {props.autoRerender ? "on" : "off"}</span>
      </div>
      <a className="button secondary" href="#create">Full set</a>
      <button type="button" className="button primary" disabled={!props.result || props.rerendering} onClick={props.onDownload}>Export ZIP</button>
    </header>
  );
}

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
          <a className="button primary" href="#create">Start project</a>
          <a className="button secondary" href="#projects">Open saved project</a>
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
      <SectionHeader eyebrow="Projects" title="Continue a project or open a saved version" description="Projects are the workspace. Each project keeps source inputs, AI generations, manual rerenders, quality reports, and ZIP exports." />
      {props.projects.length === 0 ? (
        <div className="empty-projects">
          <b>No projects yet.</b>
          <p>Start a blank project or use the demo flow below to create your first local workspace.</p>
        </div>
      ) : (
        <div className="project-card-grid">
          {props.projects.slice(0, 6).map((project) => {
            const isSelected = project.projectId === props.selectedProjectId;
            return (
              <button type="button" className={`project-card ${isSelected ? "selected" : ""}`} key={project.projectId} onClick={() => {
                props.onProjectChange(project.projectId);
                props.onGenerationChange(project.currentGenerationId ?? project.generations[0]?.generationId ?? "");
              }}>
                <span className="project-thumb" aria-hidden="true">
                  {project.thumbnailDataUrl ? <img src={project.thumbnailDataUrl} alt="" /> : <span className="project-thumb-empty">No preview</span>}
                </span>
                <span className="project-card-body">
                  <span className={`project-status ${project.status ?? "draft"}`}>{project.status ?? "draft"}</span>
                  <b>{project.appName ?? project.projectId}</b>
                  <small>{project.category ?? "uncategorized"} · {project.generations.length} version{project.generations.length === 1 ? "" : "s"}</small>
                  <small>Updated {formatProjectDate(project.updatedAt)}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="grid two project-load-row">
        <Field label="Selected version">
          <select value={props.selectedGenerationId} onChange={(event) => props.onGenerationChange(event.target.value)} disabled={!selectedProject}>
            <option value="">Choose a generation</option>
            {selectedProject?.generations.map((generation) => (
              <option value={generation.generationId} key={generation.generationId}>
                {generation.label ?? generation.kind} · {new Date(generation.createdAt).toLocaleString()} · {generation.generationId}
              </option>
            ))}
          </select>
        </Field>
        <div className="actions align-end">
          <button type="button" className="button primary" disabled={!props.selectedProjectId || !props.selectedGenerationId || props.loadingGeneration} onClick={props.onLoad}>{props.loadingGeneration ? "Opening..." : "Open in studio"}</button>
          <button type="button" className="button secondary" onClick={props.onRefresh}>Refresh</button>
        </div>
      </div>
    </section>
  );
}

export function StudioTopBar(props: StudioTopBarProps) {
  const projectName = props.result?.projectId ?? props.selectedProject?.appName ?? props.selectedProject?.projectId ?? "No project open";
  const status = props.rerendering ? "Rendering preview" : props.hasUnsavedPreview ? "Unsaved preview" : props.result ? "Saved version" : "Ready";
  return (
    <section className="studio-topbar" aria-label="Current project status">
      <div>
        <small>Current workspace</small>
        <b>{projectName}</b>
      </div>
      <div className="topbar-meta">
        <span>{status}</span>
        <span>Auto-preview {props.autoRerender ? "on" : "off"}</span>
        {props.result?.generationId && <span>{props.result.generationId}</span>}
      </div>
      <button type="button" className="button primary" disabled={!props.result || props.rerendering} onClick={props.onDownload}>Export current ZIP</button>
    </section>
  );
}

export function PipelineStatus({ loading, result }: { loading: boolean; result: GenerateResponse | null }) {
  const steps = ["Checking inputs", "Understanding app", "Creating visual system", "Building storyboard", "Rendering screenshots", "Evaluating quality", "Creating ZIP"];
  return (
    <section className="panel pipeline-panel" id="pipeline">
      <SectionHeader eyebrow="Pipeline" title="Generation progress" description="Follow the local-first pipeline from readiness check to export package." />
      <div className="pipeline-steps">
        {steps.map((step, index) => {
          const state = result ? "done" : loading && index < 3 ? "active" : "pending";
          return <div className={`pipeline-step ${state}`} key={step}><strong>{index + 1}</strong><span>{step}</span></div>;
        })}
      </div>
    </section>
  );
}

export function CreationStepper(props: CreationStepperProps) {
  const demo = props.prefillMode === "demo";
  const loaded = props.loadedInput;
  const brandColors = loaded?.brand?.colors?.join(", ") ?? "";
  return (
    <section className="panel create-panel" id="create">
      <SectionHeader eyebrow="New project" title="Upload, describe, generate" description="Start blank for a real app, load the LiteraryTrip demo, or open a saved project to reuse its stored metadata." />
      {loaded && <div className="loaded-project-banner"><b>Loaded saved project data</b><small>{loaded.appName} · {loaded.category} · {loaded.screenshots?.length ?? 0} saved source screenshot{loaded.screenshots?.length === 1 ? "" : "s"}. Browser security prevents pre-filling the file picker; the opened generation is still editable/exportable below.</small></div>}
      <div className="template-switcher" aria-label="Project starter">
        <button type="button" className={demo ? "button secondary selected" : "button secondary"} onClick={props.onUseDemoProject}>Use LiteraryTrip demo copy</button>
        <button type="button" className={!demo ? "button secondary selected" : "button secondary"} onClick={props.onStartBlankProject}>Start blank project</button>
      </div>
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
          <input name="screenshots" type="file" accept="image/png,image/jpeg" multiple required={!loaded} onChange={(event) => props.onScreenshotsChange(event.target.files)} />
          <small>{props.fileCount ? `${props.fileCount} file(s) selected` : loaded ? `Using ${loaded.screenshots?.length ?? 0} saved source screenshot${loaded.screenshots?.length === 1 ? "" : "s"} unless you upload replacements.` : "No files selected yet."}</small>
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
          <Field label="Project ID"><input name="projectId" placeholder="literarytrip" defaultValue={props.loadedProjectId ?? (demo ? "literarytrip-demo" : "")} /></Field>
          <Field label="Generation label"><input name="generationLabel" placeholder="A/B label" defaultValue={loaded ? "New version from saved project" : "AI generation"} /></Field>
          <Field label="App name"><input name="appName" required placeholder="Your app name" defaultValue={loaded?.appName ?? (demo ? "LiteraryTrip" : "")} /></Field>
          <Field label="Category"><select name="category" defaultValue={loaded?.category ?? (demo ? "travel" : "utility")}>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></Field>
          <Field label="Base locale"><input name="baseLocale" required defaultValue={loaded?.baseLocale ?? "en-US"} /></Field>
          <Field label="Target audience"><input name="targetAudience" required placeholder="e.g. indie readers who travel" defaultValue={loaded?.targetAudience ?? (demo ? "readers who travel" : "")} /></Field>
          <Field label="Main value proposition"><input name="mainValueProposition" required placeholder="the main reason people install it" defaultValue={loaded?.mainValueProposition ?? (demo ? "turn books into walkable routes" : "")} /></Field>
          <Field label="Brand colors"><input name="brandColors" placeholder="#111111, #ffffff, #ff8a3d" defaultValue={brandColors || (demo ? "#F7F1E7, #3B2416, #D99A32" : "")} /></Field>
          <Field label="Website URL"><input name="websiteUrl" placeholder="https://example.com" defaultValue={loaded?.brand?.websiteUrl ?? ""} /><small>Optional: extracts landing page colors, title, description, and H1 when reachable.</small></Field>
        </div>
      </div>

      <div className="studio-section">
        <div>
          <h3>3. Choose visual reference</h3>
          <p>Pick the standard art-direction reference the AI must follow. The model adapts the style to your app content instead of copying the reference.</p>
        </div>
        <label className="inline-toggle cover-toggle"><input name="includeCoverScreen" type="checkbox" /> Generate one extra cover / portada</label>
        <div className="style-reference-grid" role="radiogroup" aria-label="Standard visual references">
          {STANDARD_STYLE_REFERENCES.map((reference, index) => (
            <label className="style-reference-card" key={reference.id}>
              <input name="styleReferenceId" type="radio" value={reference.id} required defaultChecked={demo && index === 0} />
              <span className="style-reference-preview">
                <img src={reference.previewPath ?? reference.path} alt="" />
              </span>
              <span className="style-reference-copy">
                <b>{reference.name}</b>
                <small>{reference.width}×{reference.height} · {reference.mimeType}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="studio-section mode-section">
        <div>
          <h3>4. Generation mode</h3>
          <p>Start with Deterministic for cheap local checks. Use Premium Direct when the goal is to match a direct ChatGPT-style result: OpenAI creates the complete final poster — background, phone, screenshot treatment, headline and layout.</p>
        </div>
        <input type="hidden" name="generationMode" value={props.generationMode} />
        <div className="mode-card-grid" role="radiogroup" aria-label="Generation mode">
          <button type="button" className={`mode-card ${props.generationMode === "deterministic" ? "selected" : ""}`} onClick={() => props.onGenerationModeChange("deterministic")} aria-pressed={props.generationMode === "deterministic"}>
            <span className="mode-kicker">Fast / cheap</span>
            <b>Deterministic</b>
            <small>Current recipe pipeline. Best for smoke tests, fixture runs, and repeatable local exports.</small>
          </button>
          <button type="button" className={`mode-card premium ${props.generationMode === "premium-direct" ? "selected" : ""}`} onClick={() => props.onGenerationModeChange("premium-direct")} aria-pressed={props.generationMode === "premium-direct"}>
            <span className="mode-kicker">Best visual quality</span>
            <b>Premium Direct</b>
            <small>OpenAI creates the full final screenshot poster using your style reference and uploaded app screenshots.</small>
          </button>
        </div>

        {props.generationMode === "premium-direct" && (
          <div className="premium-direct-panel">
            <div>
              <b>Control paid image generations</b>
              <small>Each candidate generates one AI stage per final screenshot. Start with 1; use 3 only when comparing directions.</small>
            </div>
            <input type="hidden" name="premiumDirectCandidateCount" value={props.premiumDirectCandidateCount} />
            <div className="candidate-picker" aria-label="Premium Direct candidate count">
              {[1, 2, 3].map((count) => (
                <button type="button" key={count} className={props.premiumDirectCandidateCount === count ? "selected" : ""} onClick={() => props.onPremiumDirectCandidateCountChange(count)}>
                  {count}<span>{count === 1 ? "lowest cost" : count === 2 ? "compare" : "best odds"}</span>
                </button>
              ))}
            </div>
            {props.generationModeIssue ? <div className="mode-warning">{props.generationModeIssue}</div> : <div className="mode-success">Ready: OpenAI will generate the complete final poster. This is less controlled, but closest to direct ChatGPT visual output.</div>}
          </div>
        )}
      </div>

      <ProviderSettings {...props} defaultOpen={props.generationMode === "premium-direct" || Boolean(props.generationModeIssue)} />

      <div className="actions sticky-actions">
        <button className="button primary large" disabled={props.loading || Boolean(props.generationModeIssue)}>{props.loading ? "Generating your store set..." : props.generationMode === "premium-direct" ? "Generate Premium Direct set" : "Generate screenshots"}</button>
        <small>{props.generationModeIssue ?? "Creates one PNG per uploaded screenshot, optionally plus one cover, with quality checks, ZIP, and local project artifacts."}</small>
      </div>
    </section>
  );
}

export function ProviderSettings(props: ProviderSettingsProps) {
  return (
    <details className="advanced-card" id="provider-settings" open={props.defaultOpen}>
      <summary>Advanced provider settings</summary>
      <p>Fixture mode is the fastest way to test. Switch to OpenAI for Premium Direct full-poster generation, or Gemini for deterministic planning. Keys you type are saved in this browser so you do not need to re-enter them every time. Masked values mean a key was detected from your local environment.</p>
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
        <Field label="Planning model"><input name="model" value={props.model} onChange={(event) => props.onModelChange(event.target.value)} /></Field>
        {props.provider === "openai" && <Field label="OpenAI image model"><input name="imageModel" list="openai-image-models" defaultValue="gpt-image-2" /><datalist id="openai-image-models"><option value="gpt-image-2" /><option value="gpt-image-1" /></datalist><small>Used by Premium Direct to generate complete final posters. Use gpt-image-2 if your OpenAI account has access; fall back to gpt-image-1 otherwise.</small></Field>}
        <Field label="Gemini API key"><input name="geminiApiKey" type="password" autoComplete="off" value={props.geminiApiKey} onChange={(event) => props.onGeminiApiKeyChange(event.target.value)} placeholder="Only required for Gemini" /></Field>
        <Field label="OpenAI API key"><input name="openaiApiKey" type="password" autoComplete="off" value={props.openaiApiKey} onChange={(event) => props.onOpenaiApiKeyChange(event.target.value)} placeholder="Only required for OpenAI" /></Field>
      </div>
    </details>
  );
}

type PackPlatform = "iphone" | "ipad" | "android-phone" | "android-tablet";

type PackScreen = {
  index: number;
  sceneType: "cover" | "feature";
  headline: string;
  subheadline: string;
};

const platformPresets: Record<PackPlatform, { label: string; width: number; height: number; store: string }> = {
  iphone: { label: "iPhone", width: 1320, height: 2868, store: "App Store" },
  ipad: { label: "iPad", width: 2048, height: 2732, store: "App Store" },
  "android-phone": { label: "Android phone", width: 1080, height: 1920, store: "Google Play" },
  "android-tablet": { label: "Android tablet", width: 1600, height: 2560, store: "Google Play" },
};

function buildInitialPackScreens(count: number): PackScreen[] {
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    sceneType: index === 0 ? "cover" : "feature",
    headline: index === 0 ? "Your strongest hook" : `Feature benefit ${index}`,
    subheadline: index === 0 ? "Set the promise for the whole screenshot set" : "Explain the user value in one short line",
  }));
}

export function AiDirectPackPlanner() {
  const [platform, setPlatform] = useState<PackPlatform>("iphone");
  const [screenCount, setScreenCount] = useState(5);
  const [screens, setScreens] = useState<PackScreen[]>(() => buildInitialPackScreens(5));
  const preset = platformPresets[platform];

  function changeScreenCount(nextCount: number) {
    setScreenCount(nextCount);
    setScreens((current) => {
      const next = buildInitialPackScreens(nextCount);
      return next.map((screen, index) => current[index] ? { ...screen, ...current[index], index: screen.index, sceneType: index === 0 ? "cover" : current[index].sceneType } : screen);
    });
  }

  function updateScreen(index: number, patch: Partial<PackScreen>) {
    setScreens((current) => current.map((screen) => screen.index === index ? { ...screen, ...patch } : screen));
  }

  return (
    <section className="panel pack-planner" id="ai-direct-pack">
      <SectionHeader eyebrow="AI Direct Pack" title="Plan a coherent screenshot pack" description="Design the full 4–5 image set first. Generation will happen one image at a time, using approved previous images to preserve visual continuity." />
      <div className="pack-layout">
        <div className="pack-main">
          <div className="form-card">
            <h3>1. Pack setup</h3>
            <div className="grid three">
              <Field label="Platform">
                <select value={platform} onChange={(event) => setPlatform(event.target.value as PackPlatform)}>
                  {Object.entries(platformPresets).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="Screenshots">
                <select value={screenCount} onChange={(event) => changeScreenCount(Number(event.target.value))}>
                  <option value={4}>4 screenshots</option>
                  <option value={5}>5 screenshots</option>
                </select>
              </Field>
              <Field label="Output size"><input readOnly value={`${preset.width} × ${preset.height}`} /></Field>
            </div>
            <div className="pack-summary">
              <span>{preset.store}</span>
              <span>{preset.label}</span>
              <span>{screenCount} PNGs</span>
              <span>Sequential generation</span>
            </div>
          </div>

          <div className="form-card">
            <h3>2. Shared inputs</h3>
            <div className="grid two">
              <Field label="Style reference"><input type="file" accept="image/png,image/jpeg,image/webp" /><small>Global visual direction for every screen.</small></Field>
              <Field label="Approved cover"><input type="file" accept="image/png,image/jpeg,image/webp" /><small>Optional. Use when you already have a cover to match.</small></Field>
              <Field label="FAL key"><input type="password" placeholder="Uses FAL_KEY env if empty" autoComplete="off" /></Field>
            </div>
          </div>

          <div className="screen-plan">
            <div className="screen-plan-header">
              <div><h3>3. Screen plan</h3><p>Each feature screen can use its own app screenshot. Later generation should receive previous approved outputs as continuity references.</p></div>
            </div>
            {screens.map((screen) => (
              <article className="pack-screen-card" key={screen.index}>
                <div className="pack-screen-index"><b>{String(screen.index).padStart(2, "0")}</b><small>{screen.index === 1 ? "Hook" : "Feature"}</small></div>
                <div className="pack-screen-fields">
                  <div className="grid two">
                    <Field label="Scene type">
                      <select value={screen.sceneType} onChange={(event) => updateScreen(screen.index, { sceneType: event.target.value as PackScreen["sceneType"] })} disabled={screen.index === 1}>
                        <option value="cover">Cover / hook</option>
                        <option value="feature">Feature with screenshot</option>
                      </select>
                    </Field>
                    <Field label="App screenshot"><input type="file" accept="image/png,image/jpeg,image/webp" disabled={screen.sceneType === "cover"} /><small>{screen.sceneType === "cover" ? "Not needed for cover." : "Optional now; needed when generating."}</small></Field>
                  </div>
                  <Field label="Headline"><input value={screen.headline} onChange={(event) => updateScreen(screen.index, { headline: event.target.value })} /></Field>
                  <Field label="Subheadline"><input value={screen.subheadline} onChange={(event) => updateScreen(screen.index, { subheadline: event.target.value })} /></Field>
                  <div className="continuity-note">Continuity: {screen.index === 1 ? "uses style reference" : `uses style reference + approved screens 01–${String(screen.index - 1).padStart(2, "0")}`}</div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="pack-preview" aria-label="Pack preview">
          <div className="pack-preview-header">
            <b>Pack preview</b>
            <small>{preset.label} · {preset.width}×{preset.height}</small>
          </div>
          <div className="pack-preview-grid">
            {screens.map((screen) => (
              <div className="pack-preview-card" key={screen.index}>
                <span>{String(screen.index).padStart(2, "0")}</span>
                <b>{screen.headline}</b>
                <small>{screen.sceneType === "cover" ? "Cover" : "Feature"} · Not generated</small>
              </div>
            ))}
          </div>
          <div className="pack-actions">
            <button type="button" className="button primary" disabled>Generate pack</button>
            <button type="button" className="button secondary" disabled>Download ZIP</button>
            <small>UI only for now. Backend will generate one-by-one and pass prior approved images forward.</small>
          </div>
        </aside>
      </div>
    </section>
  );
}

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
              <Field label="Headline"><input name="headline" required placeholder="Plan Perfect Van Routes" /></Field>
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
    <section className="panel editor-panel" id="editor">
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
    <section className="panel export-panel" id="export">
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

function formatProjectDate(value: string | undefined) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Step({ active, label, title, detail }: { active?: boolean; label: string; title: string; detail: string }) {
  return <div className={`step ${active ? "active" : ""}`}><strong>{label}</strong><div><b>{title}</b><small>{detail}</small></div></div>;
}
