"use client";

import { useState, type ReactNode } from "react";

import { STANDARD_STYLE_REFERENCES } from "@app-screenshot-ai/schemas";

import { analyzeLandingPage } from "./api-client";
import type { LandingPageAnalysis, StoredAppInput } from "./types";

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function Step({ active, label, title, detail }: { active?: boolean; label: string; title: string; detail: string }) {
  return <div className={`step ${active ? "active" : ""}`}><strong>{label}</strong><div><b>{title}</b><small>{detail}</small></div></div>;
}
