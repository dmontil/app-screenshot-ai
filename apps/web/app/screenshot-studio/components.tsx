"use client";

import { useEffect, useState } from "react";

import { analyzeLandingPage, approveCreatorWorkspaceScreen, updateCreatorWorkspaceLocaleScreens, type CreatorWorkspaceApp } from "./api-client";
import { approvePackScreen, buildPackZipEntries, translatePackCopy, type PackScreenApproval } from "./pack-workspace-actions";
import { StatusBanner } from "./status";
import type { EditableStoryboard, GenerateResponse, LandingPageAnalysis } from "./types";

export { CreationStepper, ProviderSettings } from "./creation-stepper";
export { ManualCopyEditor } from "./manual-copy-editor";
export { QualityExport } from "./quality-export";
export { StudioHeader, StudioHero, StudioSidebar } from "./navigation";
export { ProjectSwitcher } from "./project-switcher";
export { PreviewGallery } from "./preview-gallery";
export { PipelineStatus, StatusBanner, StudioTopBar } from "./status";

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
