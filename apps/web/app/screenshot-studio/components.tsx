"use client";

import { useEffect, useState } from "react";

import { STANDARD_STYLE_REFERENCES } from "@app-screenshot-ai/schemas";

import { analyzeLandingPage, approveCreatorWorkspaceScreen, updateCreatorWorkspaceLocaleScreens, type CreatorWorkspaceApp } from "./api-client";
import { approvePackScreen, buildPackZipEntries, translatePackCopy, type PackScreenApproval } from "./pack-workspace-actions";
import type { EditableStoryboard, GenerateResponse, LandingPageAnalysis, ProjectSummary, StoredAppInput, TextLayerOverride } from "./types";

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

type AiDirectPackPlannerProps = {
  loading: boolean;
  error: string | null;
  result: { images?: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }> } | null;
  persistedFalKey?: string;
  app?: { id?: string; name: string; category: string; audience: string; valueProposition: string; websiteUrl?: string; brandColors?: string } | undefined;
  pack?: { id?: string; name: string; platform: string; screenCount: number; locales?: Array<{ code: string; status: string; screens?: Array<{ index: number; sceneType: string; headline: string; subheadline: string; status: "Draft" | "Approved"; approvedAt?: string }> }> } | undefined;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onWorkspaceAppsChange?: (apps: CreatorWorkspaceApp[]) => void;
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
  const initialBrandColors = loaded?.brand?.colors?.join(", ") || (demo ? "#F7F1E7, #3B2416, #D99A32" : "");
  const [brandColorsValue, setBrandColorsValue] = useState(initialBrandColors);
  const [websiteUrlValue, setWebsiteUrlValue] = useState(loaded?.brand?.websiteUrl ?? "");
  const [landingAnalysis, setLandingAnalysis] = useState<LandingPageAnalysis | null>(null);
  const [landingLoading, setLandingLoading] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);

  async function extractLandingColors() {
    if (!websiteUrlValue.trim()) {
      setLandingError("Enter a landing page URL first.");
      return;
    }
    setLandingLoading(true);
    setLandingError(null);
    try {
      const analysis = await analyzeLandingPage(websiteUrlValue);
      setLandingAnalysis(analysis);
      if (analysis.extractedColors.length === 0) {
        setLandingError("Landing page loaded, but no hex colors were found.");
        return;
      }

      const nextColors = analysis.extractedColors.join(", ");
      if (!brandColorsValue.trim()) {
        setBrandColorsValue(nextColors);
        return;
      }

      const shouldReplace = window.confirm([
        "Replace current brand colors with landing page colors?",
        "",
        `Current: ${brandColorsValue}`,
        `New: ${nextColors}`,
      ].join("\n"));
      if (shouldReplace) setBrandColorsValue(nextColors);
    } catch (err) {
      setLandingError(err instanceof Error ? err.message : "Landing page analysis failed");
    } finally {
      setLandingLoading(false);
    }
  }
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
          <Field label="Brand colors"><input name="brandColors" placeholder="#111111, #ffffff, #ff8a3d" value={brandColorsValue} onChange={(event) => setBrandColorsValue(event.target.value)} /></Field>
          <Field label="Website URL"><input name="websiteUrl" placeholder="https://example.com" value={websiteUrlValue} onChange={(event) => setWebsiteUrlValue(event.target.value)} /><small>Optional: extracts landing page colors, title, description, and H1 when reachable.</small></Field>
              <div className="landing-color-tools">
                <button type="button" className="button secondary" disabled={landingLoading} onClick={() => { void extractLandingColors(); }}>{landingLoading ? "Extracting..." : "Extract landing colors"}</button>
                {landingError && <small className="landing-color-error">{landingError}</small>}
                {landingAnalysis && landingAnalysis.extractedColors.length > 0 && (
                  <div className="landing-color-result" aria-label="Extracted landing page colors">
                    <div>
                      <b>{landingAnalysis.headline ?? landingAnalysis.title ?? "Landing colors"}</b>
                      {landingAnalysis.description && <small>{landingAnalysis.description}</small>}
                    </div>
                    <div className="landing-color-swatches">
                      {landingAnalysis.extractedColors.map((color) => <span className="landing-color-swatch" style={{ backgroundColor: color }} title={color} key={color}>{color}</span>)}
                    </div>
                  </div>
                )}
              </div>
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
  status?: "Draft" | "Approved";
  approvedAt?: string;
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
    headline: "",
    subheadline: "",
  }));
}

export function AiDirectPackPlanner(props: AiDirectPackPlannerProps) {
  const [platform, setPlatform] = useState<PackPlatform>("iphone");
  const [screenCount, setScreenCount] = useState(5);
  const [promptVersion, setPromptVersion] = useState<"v1" | "v2" | "v3" | "v4">("v4");
  const [screens, setScreens] = useState<PackScreen[]>(() => buildInitialPackScreens(5));
  const [selectedScreenIndex, setSelectedScreenIndex] = useState(1);
  const [activeLocale, setActiveLocale] = useState("en-US");
  const [generationStrategy, setGenerationStrategy] = useState<"cover-first" | "fast-pack">("cover-first");
  const [developerMode, setDeveloperMode] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<"edit" | "references" | "dev">("edit");
  const [approvals, setApprovals] = useState<PackScreenApproval[]>([]);
  const [showTranslatePanel, setShowTranslatePanel] = useState(false);
  const [targetLocale, setTargetLocale] = useState("es-ES");
  const [translationMode, setTranslationMode] = useState<"copy" | "images">("copy");
  const [translateInAppText, setTranslateInAppText] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [packBrandColorsValue, setPackBrandColorsValue] = useState("");
  const [packWebsiteUrlValue, setPackWebsiteUrlValue] = useState("");
  const [packLandingAnalysis, setPackLandingAnalysis] = useState<LandingPageAnalysis | null>(null);
  const [packLandingLoading, setPackLandingLoading] = useState(false);
  const [packLandingError, setPackLandingError] = useState<string | null>(null);
  const preset = platformPresets[platform];
  const selectedScreen = screens.find((screen) => screen.index === selectedScreenIndex) ?? screens[0] ?? { index: 1, sceneType: "cover", headline: "", subheadline: "" };
  const generatedImageByIndex = new Map((props.result?.images ?? []).map((image) => [image.index, image]));
  const completedCount = props.result?.images?.length ?? 0;
  const packStatus = props.loading ? `Generating · ${completedCount}/${screenCount} complete` : completedCount ? `Needs review · ${completedCount}/${screenCount} complete` : "Ready to generate";
  const [localeStatuses, setLocaleStatuses] = useState([
    { code: "en-US", label: "English", status: "Draft" },
    { code: "es-ES", label: "Spanish", status: "Not translated" },
    { code: "fr-FR", label: "French", status: "Not translated" },
  ]);

  useEffect(() => {
    const locale = props.pack?.locales?.find((candidate) => candidate.code === activeLocale) ?? props.pack?.locales?.[0];
    if (!locale?.screens?.length) return;
    setActiveLocale(locale.code);
    setScreens(locale.screens.map((screen) => ({
      index: screen.index,
      sceneType: screen.sceneType === "cover" ? "cover" : "feature",
      headline: screen.headline,
      subheadline: screen.subheadline,
      status: screen.status,
      ...(screen.approvedAt ? { approvedAt: screen.approvedAt } : {}),
    })));
    setScreenCount(locale.screens.length);
    setApprovals(locale.screens.filter((screen) => screen.status === "Approved" && screen.approvedAt).map((screen) => ({ index: screen.index, approvedAt: screen.approvedAt as string })));
  }, [props.pack?.id]);

  async function extractPackLandingColors() {
    if (!packWebsiteUrlValue.trim()) {
      setPackLandingError("Enter a landing page URL first.");
      return;
    }
    setPackLandingLoading(true);
    setPackLandingError(null);
    try {
      const analysis = await analyzeLandingPage(packWebsiteUrlValue);
      setPackLandingAnalysis(analysis);
      if (analysis.extractedColors.length === 0) {
        setPackLandingError("Landing page loaded, but no hex colors were found.");
        return;
      }
      const nextColors = analysis.extractedColors.join(", ");
      if (!packBrandColorsValue.trim() || window.confirm(`Replace current brand colors with landing page colors?\n\nCurrent: ${packBrandColorsValue}\nNew: ${nextColors}`)) {
        setPackBrandColorsValue(nextColors);
      }
    } catch (err) {
      setPackLandingError(err instanceof Error ? err.message : "Landing page analysis failed");
    } finally {
      setPackLandingLoading(false);
    }
  }

  function changeScreenCount(nextCount: number) {
    setScreenCount(nextCount);
    setScreens((current) => {
      const next = buildInitialPackScreens(nextCount);
      return next.map((screen, index) => current[index] ? { ...screen, ...current[index], index: screen.index, sceneType: index === 0 ? "cover" : current[index].sceneType } : screen);
    });
    setSelectedScreenIndex((current) => Math.min(current, nextCount));
  }

  function updateScreen(index: number, patch: Partial<PackScreen>) {
    setScreens((current) => current.map((screen) => screen.index === index ? { ...screen, ...patch, status: patch.status ?? screen.status ?? "Draft" } : screen));
  }

  async function saveScreenPlan() {
    if (!props.app?.id || !props.pack?.id) {
      setActionMessage("Create or select a persisted pack before saving screens.");
      return;
    }
    try {
      const { apps } = await updateCreatorWorkspaceLocaleScreens(props.app.id, props.pack.id, activeLocale, screens.map((screen) => ({
        index: screen.index,
        sceneType: screen.sceneType,
        headline: screen.headline,
        subheadline: screen.subheadline,
        status: screen.status ?? "Draft",
        ...(screen.approvedAt ? { approvedAt: screen.approvedAt } : {}),
      })));
      if (apps) props.onWorkspaceAppsChange?.(apps);
      setActionMessage("Screen plan saved to this pack.");
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not save screen plan.");
    }
  }

  async function approveSelectedScreen() {
    try {
      const nextApprovals = approvePackScreen(approvals, props.result?.images ?? [], selectedScreen.index);
      if (props.app?.id && props.pack?.id) {
        const { apps } = await approveCreatorWorkspaceScreen(props.app.id, props.pack.id, activeLocale, selectedScreen.index);
        if (apps) props.onWorkspaceAppsChange?.(apps);
      }
      setApprovals(nextApprovals);
      setScreens((current) => current.map((screen) => screen.index === selectedScreen.index ? { ...screen, status: "Approved", approvedAt: new Date().toISOString() } : screen));
      setActionMessage(`Screen ${String(selectedScreen.index).padStart(2, "0")} approved.`);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Could not approve screen.");
    }
  }

  async function downloadApprovedZip() {
    const entries = buildPackZipEntries({
      appName: props.app?.name ?? "app",
      packName: props.pack?.name ?? "screenshot-pack",
      platform,
      locale: activeLocale,
      images: props.result?.images ?? [],
      approvals,
    });
    if (!entries.length) {
      setActionMessage("Approve at least one generated screen before downloading a ZIP.");
      return;
    }
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    entries.forEach((entry) => zip.file(entry.filename, entry.base64, { base64: true }));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${props.app?.name ?? "app"}-${props.pack?.name ?? "pack"}-${activeLocale}.zip`.toLowerCase().replace(/[^a-z0-9-.]+/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setActionMessage(`Downloaded ${entries.length} approved screen${entries.length === 1 ? "" : "s"}.`);
  }

  function translateActivePack() {
    const translated = translatePackCopy(screens, targetLocale);
    setScreens(translated);
    setActiveLocale(targetLocale);
    setLocaleStatuses((current) => current.map((locale) => locale.code === targetLocale ? { ...locale, status: translationMode === "copy" ? "Copy translated" : "Needs image generation" } : locale));
    setShowTranslatePanel(false);
    setActionMessage(translationMode === "copy"
      ? `Copy translated to ${targetLocale}. Review text before generating images.`
      : `Copy prepared for ${targetLocale}. Generate the pack to localize final images${translateInAppText ? " including in-app screenshot text" : ""}.`);
  }

  function attachScreensPayload(form: HTMLFormElement) {
    const screensPayload = screens.map((screen) => ({
      id: `screen-${String(screen.index).padStart(2, "0")}`,
      sceneType: screen.sceneType,
      headline: screen.headline.trim(),
      subheadline: screen.subheadline.trim(),
    }));
    let hidden = form.querySelector<HTMLInputElement>('input[name="screens"]');
    if (!hidden) {
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "screens";
      form.appendChild(hidden);
    }
    hidden.value = JSON.stringify(screensPayload);
  }

  return (
    <section className="creator-workspace" id="ai-direct-pack" aria-label="AI Direct Pack workspace">
      <form className="creator-layout" onSubmit={(event) => {
        attachScreensPayload(event.currentTarget);
        props.onSubmit(event);
      }}>
        <aside className="creator-rail" aria-label="Pack controls">
          <div className="rail-block app-context-card">
            <span className="rail-kicker">App</span>
            <h2>{props.app?.name ?? "App context"}</h2>
            <div className="context-meter" aria-label="Context quality good"><span style={{ width: "72%" }} /></div>
            <small>Tell us what the app does once. Every pack reuses this context.</small>
          </div>

          <div className="rail-block">
            <span className="rail-kicker">Pack</span>
            <Field label="Platform">
              <select value={platform} onChange={(event) => setPlatform(event.target.value as PackPlatform)}>
                {Object.entries(platformPresets).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
              </select>
            </Field>
            <div className="size-readout"><b>{preset.width}×{preset.height}</b><small>{preset.store} preset</small></div>
            <Field label="Screens">
              <select value={screenCount} onChange={(event) => changeScreenCount(Number(event.target.value))}>
                <option value={3}>3 screenshots</option>
                <option value={4}>4 screenshots</option>
                <option value={5}>5 screenshots</option>
              </select>
            </Field>
            <Field label="Strategy">
              <select value={generationStrategy} onChange={(event) => setGenerationStrategy(event.target.value as "cover-first" | "fast-pack")}>
                <option value="cover-first">Recommended · cover first</option>
                <option value="fast-pack">Fast · full pack</option>
              </select>
            </Field>
          </div>

          <div className="rail-block">
            <span className="rail-kicker">Locales</span>
            <Field label="Active locale"><select value={activeLocale} onChange={(event) => setActiveLocale(event.target.value)}>{localeStatuses.map((locale) => <option value={locale.code} key={locale.code}>{locale.label}</option>)}</select></Field>
            <div className="locale-list">
              {localeStatuses.map((locale) => <button type="button" className={locale.code === activeLocale ? "locale-pill active" : "locale-pill"} onClick={() => setActiveLocale(locale.code)} key={locale.code}><b>{locale.code.slice(0, 2).toUpperCase()}</b><span>{locale.status}</span></button>)}
            </div>
            <button type="button" className="button secondary rail-action" onClick={() => setShowTranslatePanel((current) => !current)}>Translate pack</button>
            {showTranslatePanel && (
              <div className="translate-panel-mini">
                <Field label="Target language"><select value={targetLocale} onChange={(event) => setTargetLocale(event.target.value)}><option value="es-ES">Spanish</option><option value="fr-FR">French</option><option value="de-DE">German</option><option value="it-IT">Italian</option><option value="pt-BR">Portuguese</option></select></Field>
                <Field label="Mode"><select value={translationMode} onChange={(event) => setTranslationMode(event.target.value as "copy" | "images")}><option value="copy">Copy only</option><option value="images">Localize final images</option></select></Field>
                <label className="inline-toggle"><input type="checkbox" checked={translateInAppText} onChange={(event) => setTranslateInAppText(event.target.checked)} /> Translate in-app screenshot text</label>
                <button type="button" className="button primary rail-action" onClick={translateActivePack}>{translationMode === "copy" ? "Translate copy" : "Prepare image localization"}</button>
              </div>
            )}
          </div>

          <div className="rail-block">
            <span className="rail-kicker">Generation</span>
            <div className="pack-status"><b>{packStatus}</b><span><i style={{ width: `${Math.max(8, (completedCount / screenCount) * 100)}%` }} /></span></div>
            <button type="submit" className="button primary rail-action" disabled={props.loading || !props.persistedFalKey}>{props.loading ? "Generating…" : generationStrategy === "cover-first" ? "Generate cover first" : "Generate full pack"}</button>
            <button type="button" className="button secondary rail-action" onClick={() => { void saveScreenPlan(); }}>Save screen plan</button>
            <button type="button" className="button secondary rail-action" disabled={!approvals.length} onClick={() => { void downloadApprovedZip(); }}>Download ZIP</button>
          </div>

          <label className="developer-toggle"><input type="checkbox" checked={developerMode} onChange={(event) => { setDeveloperMode(event.target.checked); if (!event.target.checked && inspectorTab === "dev") setInspectorTab("edit"); }} /> Developer mode</label>
        </aside>

        <main className="creator-board" aria-label="Screenshot pack board">
          <header className="board-header">
            <div>
              <span className="rail-kicker">AI Screenshot Pack</span>
              <h1>Create screenshot pack</h1>
              <p>Start on the left, add app context here, then review all screens together for visual consistency.</p>
            </div>
            <div className="board-meta"><span>{preset.label}</span><span>{screenCount} screens</span><span>{preset.width}×{preset.height}</span><span>{packStatus}</span></div>
          </header>

          <div className="app-brief-card">
            <div className="grid two">
              <Field label="App name"><input name="appName" required placeholder="VanTrip" defaultValue={props.app?.name ?? ""} /></Field>
              <Field label="Category"><input name="category" required placeholder="Travel / Campervan" defaultValue={props.app?.category ?? ""} /></Field>
              <Field label="Audience"><input name="targetAudience" required placeholder="Campervan owners and digital nomads" defaultValue={props.app?.audience ?? ""} /></Field>
              <Field label="Value proposition"><input name="valueProposition" required placeholder="Create personalized trips with AI" defaultValue={props.app?.valueProposition ?? ""} /></Field>
              <Field label="Website URL"><input name="websiteUrl" placeholder="https://example.com" value={packWebsiteUrlValue || props.app?.websiteUrl || ""} onChange={(event) => setPackWebsiteUrlValue(event.target.value)} /></Field>
              <Field label="Brand colors"><input name="brandColors" placeholder="#111111, #ffffff, #ff8a3d" value={packBrandColorsValue || props.app?.brandColors || ""} onChange={(event) => setPackBrandColorsValue(event.target.value)} /></Field>
            </div>
            <div className="brief-actions">
              <button type="button" className="button secondary" disabled={packLandingLoading} onClick={() => { void extractPackLandingColors(); }}>{packLandingLoading ? "Extracting…" : "Extract landing colors"}</button>
              {packLandingError && <small className="landing-color-error">{packLandingError}</small>}
              {packLandingAnalysis?.extractedColors.length ? <div className="landing-color-swatches">{packLandingAnalysis.extractedColors.map((color) => <span className="landing-color-swatch" style={{ backgroundColor: color }} title={color} key={color}>{color}</span>)}</div> : null}
            </div>
          </div>

          <div className="shared-assets-card">
            <Field label="Style reference"><input name="referenceStyleImage" type="file" accept="image/png,image/jpeg,image/webp" required /><small>Used by every generated screen.</small></Field>
            <Field label="Approved cover"><input name="approvedCoverImage" type="file" accept="image/png,image/jpeg,image/webp" /><small>Optional continuity anchor.</small></Field>
            <div className="provider-key-status"><b>FAL key</b><small>{props.persistedFalKey ? "Saved in Settings" : "Missing — open Settings to save your key"}</small><input name="falKey" type="hidden" value={props.persistedFalKey ?? ""} /></div>
            <Field label="Prompt version"><select name="promptVersion" value={promptVersion} onChange={(event) => setPromptVersion(event.target.value as "v1" | "v2" | "v3" | "v4")}><option value="v1">v1 · image loop</option><option value="v2">v2 · screenshot first</option><option value="v3">v3 · strict UI</option><option value="v4">v4 · feature minimal</option></select></Field>
          </div>

          <div className="visual-pack-board" aria-label="All screenshots in this pack">
            {screens.map((screen) => {
              const generated = generatedImageByIndex.get(screen.index);
              const isSelected = screen.index === selectedScreen.index;
              const isApproved = approvals.some((approval) => approval.index === screen.index);
              const status = isApproved ? "Approved" : props.loading && screen.index === completedCount + 1 ? "Generating" : generated ? "Needs approval" : screen.index === 1 ? "Ready to generate" : "Queued";
              return (
                <button type="button" className={isSelected ? "artboard-card selected" : "artboard-card"} aria-pressed={isSelected} onClick={() => setSelectedScreenIndex(screen.index)} key={screen.index}>
                  <span className="artboard-number">{String(screen.index).padStart(2, "0")}</span>
                  {generated ? <img src={generated.dataUrl} alt={`Generated screen ${screen.index}`} /> : <span className="artboard-placeholder"><b>{screen.headline || (screen.index === 1 ? "Cover hook" : `Feature ${screen.index - 1}`)}</b><small>{screen.sceneType}</small></span>}
                  <span className={`screen-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{status}</span>
                </button>
              );
            })}
          </div>

          <input name="projectId" type="hidden" value="ai-image-direct-pack" />
          <input name="outputWidth" type="hidden" value={preset.width} />
          <input name="outputHeight" type="hidden" value={preset.height} />
          {actionMessage && <StatusBanner kind={actionMessage.toLowerCase().includes("could not") || actionMessage.toLowerCase().includes("approve at least") ? "error" : "success"}>{actionMessage}</StatusBanner>}
          {props.error && <StatusBanner kind="error">{props.error}</StatusBanner>}
        </main>

        <aside className="screen-inspector" aria-label="Selected screen inspector">
          <div className="inspector-heading"><span className="rail-kicker">Selected screen</span><h2>{String(selectedScreen.index).padStart(2, "0")} · {selectedScreen.sceneType === "cover" ? "Cover" : "Feature"}</h2></div>
          <div className="inspector-tabs" role="tablist" aria-label="Inspector tabs">
            <button type="button" className={inspectorTab === "edit" ? "active" : ""} onClick={() => setInspectorTab("edit")}>Edit</button>
            <button type="button" className={inspectorTab === "references" ? "active" : ""} onClick={() => setInspectorTab("references")}>References</button>
            {developerMode && <button type="button" className={inspectorTab === "dev" ? "active" : ""} onClick={() => setInspectorTab("dev")}>Dev mode</button>}
          </div>

          {inspectorTab === "edit" && (
            <div className="inspector-panel">
              <Field label="Scene type"><select value={selectedScreen.sceneType} onChange={(event) => updateScreen(selectedScreen.index, { sceneType: event.target.value as PackScreen["sceneType"] })} disabled={selectedScreen.index === 1}><option value="cover">Cover / hook</option><option value="feature">Feature with screenshot</option></select></Field>
              <Field label="Headline"><textarea value={selectedScreen.headline} placeholder="Leave blank to auto-generate" onChange={(event) => updateScreen(selectedScreen.index, { headline: event.target.value })} /></Field>
              <Field label="Subheadline"><textarea value={selectedScreen.subheadline} placeholder="Leave blank to auto-generate" onChange={(event) => updateScreen(selectedScreen.index, { subheadline: event.target.value })} /></Field>
              <Field label="App screenshot"><input name={`screenshotImage-${selectedScreen.index}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={selectedScreen.sceneType === "cover"} required={selectedScreen.sceneType === "feature"} /><small>{selectedScreen.sceneType === "cover" ? "Not needed for cover." : "Required for this feature screen."}</small></Field>
              <div className="inspector-actions"><button type="submit" className="button primary" disabled={props.loading || !props.persistedFalKey}>{selectedScreen.index === 1 ? "Generate cover" : "Generate selected"}</button><button type="button" className="button secondary" disabled={!generatedImageByIndex.get(selectedScreen.index)} onClick={approveSelectedScreen}>{approvals.some((approval) => approval.index === selectedScreen.index) ? "Approved" : "Approve"}</button><a className="button secondary" aria-disabled={!generatedImageByIndex.get(selectedScreen.index)} href={generatedImageByIndex.get(selectedScreen.index)?.dataUrl ?? "#"} download={generatedImageByIndex.get(selectedScreen.index)?.fileName}>Download PNG</a></div>
            </div>
          )}

          {inspectorTab === "references" && (
            <div className="inspector-panel reference-stack">
              <div><b>Style reference</b><small>Always used for the visual direction.</small></div>
              <div><b>Approved cover</b><small>{selectedScreen.index === 1 ? "Created by this screen." : "Used as the main continuity anchor when available."}</small></div>
              <div><b>Previous approved screens</b><small>{selectedScreen.index === 1 ? "None for the cover." : `Screens 01–${String(selectedScreen.index - 1).padStart(2, "0")} are passed forward for consistency.`}</small></div>
              <div><b>Locale</b><small>{activeLocale}. Translate copy only or localize image text from the Locales section.</small></div>
            </div>
          )}

          {inspectorTab === "dev" && developerMode && (
            <div className="inspector-panel dev-panel">
              <details open><summary>Trace</summary><pre>{JSON.stringify(props.result?.trace ?? [{ step: "No generation trace yet" }], null, 2)}</pre></details>
              <details><summary>Selected screen payload</summary><pre>{JSON.stringify(selectedScreen, null, 2)}</pre></details>
              <details><summary>Generated artifact</summary><pre>{JSON.stringify(generatedImageByIndex.get(selectedScreen.index) ?? null, null, 2)}</pre></details>
            </div>
          )}
        </aside>
      </form>
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
  return <section className={`status-banner ${kind}`} role={kind === "error" ? "alert" : "status"}>{children}</section>;
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
