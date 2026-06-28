"use client";

import { useEffect, useRef, useState } from "react";

import {
  AdvancedInspector,
  AiDirectPackPlanner,
  AiImageDirectPanel,
  CreationStepper,
  ManualCopyEditor,
  PipelineStatus,
  PreviewGallery,
  ProjectSwitcher,
  QualityExport,
  StatusBanner,
} from "./screenshot-studio/components";
import { createCreatorWorkspaceApp, createCreatorWorkspacePack, fetchCreatorWorkspace, fetchProjectGeneration, fetchProjects, fetchProviderSettings, generateAiImageDirect, generateAiImageDirectPack, generateStorePack, rerenderStorePack, saveCreatorWorkspaceGenerationArtifacts } from "./screenshot-studio/api-client";
import { loadProviderPreferences, mergeProviderSettings, saveProviderPreferences } from "./screenshot-studio/provider-preferences";
import type { EditableStoryboard, GenerateResponse, ProjectSummary, StoredAppInput, TextLayerOverride } from "./screenshot-studio/types";

type CreatorView = "home" | "create-app" | "app-dashboard" | "pack" | "settings";

type CreatorApp = {
  id: string;
  name: string;
  category: string;
  audience: string;
  valueProposition: string;
  websiteUrl?: string;
  brandColors?: string;
  updatedAt: string;
  packs: CreatorPack[];
};

type CreatorPack = {
  id: string;
  name: string;
  platform: string;
  size: string;
  screenCount: number;
  locales: Array<{ code: string; status: string; screens?: Array<{ index: number; sceneType: string; headline: string; subheadline: string; status: "Draft" | "Approved"; approvedAt?: string }> }>;
  latestGeneration?: {
    generatedAt: string;
    localProjectPath?: string;
    images: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>;
    trace: Array<{ at: string; step: string; detail?: string }>;
  };
  updatedAt: string;
};

type CreatorSettings = {
  falKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  defaultPlatform: string;
  defaultPromptVersion: "v1" | "v2" | "v3" | "v4";
};

const creatorStorageKey = "app-screenshot-ai.creator-state.v1";
const creatorSettingsKey = "app-screenshot-ai.creator-settings.v1";

export default function HomePage() {
  const [provider, setProvider] = useState("fixture");
  const [model, setModel] = useState("fixture-v1");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [providerSettingsLoaded, setProviderSettingsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiDirectLoading, setAiDirectLoading] = useState(false);
  const [aiDirectError, setAiDirectError] = useState<string | null>(null);
  const [aiDirectResult, setAiDirectResult] = useState<{ image?: { fileName: string; dataUrl: string }; imageUrl?: string; prompt?: string; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }>; scenePlan?: unknown } | null>(null);
  const [aiDirectPackLoading, setAiDirectPackLoading] = useState(false);
  const [aiDirectPackError, setAiDirectPackError] = useState<string | null>(null);
  const [aiDirectPackResult, setAiDirectPackResult] = useState<{ images?: Array<{ index: number; id: string; fileName: string; dataUrl: string; prompt?: string; scenePlan?: unknown }>; localProjectPath?: string; trace?: Array<{ at: string; step: string; detail?: string }> } | null>(null);
  const [loadingGeneration, setLoadingGeneration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [editableStoryboard, setEditableStoryboard] = useState<EditableStoryboard | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [screenshotPreviews, setScreenshotPreviews] = useState<Array<{ name: string; size: number; type: string; url: string }>>([]);
  const [rerendering, setRerendering] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGenerationId, setSelectedGenerationId] = useState("");
  const [autoRerender, setAutoRerender] = useState(true);
  const [activeLocale, setActiveLocale] = useState("en-US");
  const [translationStatus, setTranslationStatus] = useState("");
  const [hasUnsavedPreview, setHasUnsavedPreview] = useState(false);
  const [prefillMode, setPrefillMode] = useState<"blank" | "demo">("blank");
  const [loadedInput, setLoadedInput] = useState<StoredAppInput | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [generationMode, setGenerationMode] = useState<"deterministic" | "premium-direct">("deterministic");
  const [premiumDirectCandidateCount, setPremiumDirectCandidateCount] = useState(1);
  const lastRenderedStoryboardJsonRef = useRef("");
  const autoRerenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [creatorView, setCreatorView] = useState<CreatorView>("home");
  const [creatorApps, setCreatorApps] = useState<CreatorApp[]>([]);
  const [selectedCreatorAppId, setSelectedCreatorAppId] = useState("");
  const [selectedCreatorPackId, setSelectedCreatorPackId] = useState("");
  const [creatorSettings, setCreatorSettings] = useState<CreatorSettings>({ falKey: "", geminiApiKey: "", openaiApiKey: "", defaultPlatform: "iphone", defaultPromptVersion: "v4" });

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(creatorStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { apps?: CreatorApp[]; selectedAppId?: string; selectedPackId?: string; view?: CreatorView };
        setCreatorApps(parsed.apps ?? []);
        setSelectedCreatorAppId(parsed.selectedAppId ?? "");
        setSelectedCreatorPackId(parsed.selectedPackId ?? "");
        setCreatorView(parsed.view ?? (parsed.apps?.length ? "app-dashboard" : "home"));
      }
      const storedSettings = window.localStorage.getItem(creatorSettingsKey);
      if (storedSettings) setCreatorSettings((current) => ({ ...current, ...JSON.parse(storedSettings) as Partial<CreatorSettings> }));
      fetchCreatorWorkspace()
        .then((apps) => {
          setCreatorApps(apps);
          if (apps.length && !selectedCreatorAppId) {
            setSelectedCreatorAppId(apps[0]?.id ?? "");
            setCreatorView("home");
          }
        })
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load creator workspace"));
    } catch {
      setCreatorView("home");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(creatorStorageKey, JSON.stringify({ apps: creatorApps, selectedAppId: selectedCreatorAppId, selectedPackId: selectedCreatorPackId, view: creatorView }));
  }, [creatorApps, selectedCreatorAppId, selectedCreatorPackId, creatorView]);

  useEffect(() => {
    window.localStorage.setItem(creatorSettingsKey, JSON.stringify(creatorSettings));
  }, [creatorSettings]);

  useEffect(() => {
    return () => {
      screenshotPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [screenshotPreviews]);

  useEffect(() => {
    let cancelled = false;
    fetchProviderSettings()
      .then((settings) => {
        if (cancelled) return;
        const merged = mergeProviderSettings(settings, loadProviderPreferences(window.localStorage));
        setProvider(merged.provider);
        setModel(merged.model);
        setGeminiApiKey(merged.geminiApiKey);
        setOpenaiApiKey(merged.openaiApiKey);
        setProviderSettingsLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        const stored = loadProviderPreferences(window.localStorage);
        if (stored.provider) setProvider(stored.provider);
        if (stored.model) setModel(stored.model);
        if (stored.geminiApiKey) setGeminiApiKey(stored.geminiApiKey);
        if (stored.openaiApiKey) setOpenaiApiKey(stored.openaiApiKey);
        setProviderSettingsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!providerSettingsLoaded) return;
    saveProviderPreferences(window.localStorage, { provider, model, geminiApiKey, openaiApiKey });
  }, [providerSettingsLoaded, provider, model, geminiApiKey, openaiApiKey]);

  useEffect(() => {
    if (!autoRerender || !result || !editableStoryboard || rerendering) return;
    const serializedStoryboard = JSON.stringify(editableStoryboard);
    if (!lastRenderedStoryboardJsonRef.current) {
      lastRenderedStoryboardJsonRef.current = serializedStoryboard;
      return;
    }
    if (serializedStoryboard === lastRenderedStoryboardJsonRef.current) return;

    if (autoRerenderTimerRef.current) clearTimeout(autoRerenderTimerRef.current);
    autoRerenderTimerRef.current = setTimeout(() => {
      void rerenderWithManualText({ storyboard: editableStoryboard, persist: false });
    }, 300);

    return () => {
      if (autoRerenderTimerRef.current) clearTimeout(autoRerenderTimerRef.current);
    };
  }, [autoRerender, editableStoryboard, result, rerendering]);

  async function refreshProjects() {
    setProjects(await fetchProjects());
  }

  async function loadSelectedGeneration() {
    if (!selectedProjectId || !selectedGenerationId) return;
    setLoadingGeneration(true);
    try {
      const loaded = await fetchProjectGeneration(selectedProjectId, selectedGenerationId);
      lastRenderedStoryboardJsonRef.current = JSON.stringify(loaded.storyboard);
      setHasUnsavedPreview(false);
      setResult({ ...loaded, provider, model });
      setEditableStoryboard(loaded.storyboard);
      setLoadedInput(loaded.input ?? null);
      setPrefillMode("blank");
      setFormVersion((current) => current + 1);
      setError(null);
      scrollToPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load generation");
    } finally {
      setLoadingGeneration(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const modeIssue = generationModeIssueFor({ generationMode, provider, openaiApiKey });
    if (modeIssue) {
      setError(modeIssue);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      const generated = await generateStorePack(formData);
      lastRenderedStoryboardJsonRef.current = JSON.stringify(generated.storyboard);
      setHasUnsavedPreview(false);
      setResult(generated);
      setEditableStoryboard(generated.storyboard);
      setLoadedInput(generated.input ?? null);
      await refreshProjects();
      scrollToPreview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onAiImageDirectPackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiDirectPackLoading(true);
    setAiDirectPackError(null);
    try {
      const generated = await generateAiImageDirectPack(new FormData(event.currentTarget));
      setAiDirectPackResult(generated);
      if (selectedCreatorApp?.id && selectedCreatorPack?.id) {
        const { apps } = await saveCreatorWorkspaceGenerationArtifacts(selectedCreatorApp.id, selectedCreatorPack.id, {
          generatedAt: new Date().toISOString(),
          images: generated.images ?? [],
          trace: generated.trace ?? [],
          ...(generated.localProjectPath ? { localProjectPath: generated.localProjectPath } : {}),
        });
        if (apps) setCreatorApps(apps);
      }
    } catch (err) {
      setAiDirectPackError(err instanceof Error ? err.message : "AI Image Direct pack failed");
    } finally {
      setAiDirectPackLoading(false);
    }
  }

  async function onAiImageDirectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAiDirectLoading(true);
    setAiDirectError(null);
    try {
      const generated = await generateAiImageDirect(new FormData(event.currentTarget));
      setAiDirectResult(generated);
    } catch (err) {
      setAiDirectError(err instanceof Error ? err.message : "AI Image Direct failed");
    } finally {
      setAiDirectLoading(false);
    }
  }

  async function rerenderWithManualText(options: { storyboard?: EditableStoryboard; label?: string; persist?: boolean } = {}): Promise<GenerateResponse | undefined> {
    const storyboardToRender = options.storyboard ?? editableStoryboard;
    if (!result || !storyboardToRender) return undefined;
    setRerendering(true);
    setError(null);

    try {
      const payload = await rerenderStorePack({
        projectId: result.projectId,
        locale: "en-US",
        visualSystem: result.visualSystem,
        storyboard: storyboardToRender,
        label: options.label ?? "Manual rerender",
        persist: options.persist ?? true,
        styleReference: result.styleReference,
      });
      const nextResult = { ...result, ...payload, provider: result.provider, model: result.model };
      lastRenderedStoryboardJsonRef.current = JSON.stringify(nextResult.storyboard);
      setResult(nextResult);
      setEditableStoryboard(nextResult.storyboard);
      setHasUnsavedPreview(options.persist === false);
      if (options.persist !== false) await refreshProjects();
      return nextResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      return undefined;
    } finally {
      setRerendering(false);
    }
  }

  async function saveVersionAndDownload() {
    if (!result) return;
    const hasUnrenderedEdits = editableStoryboard
      ? JSON.stringify(editableStoryboard) !== lastRenderedStoryboardJsonRef.current
      : false;
    const saved = hasUnsavedPreview || hasUnrenderedEdits
      ? await rerenderWithManualText({ label: "Downloaded version", persist: true })
      : result;
    if (!saved) return;
    triggerDownload(saved.zip.dataUrl, saved.zip.fileName);
  }

  function scrollToPreview() {
    window.setTimeout(() => {
      document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  function triggerDownload(dataUrl: string, fileName: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function updateScreenshotPreviews(files: FileList | null) {
    screenshotPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const nextFiles = Array.from(files ?? []);
    setFileCount(nextFiles.length);
    setScreenshotPreviews(nextFiles.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    })));
  }

  function resetCreateForm(mode: "blank" | "demo") {
    screenshotPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    setScreenshotPreviews([]);
    setFileCount(0);
    setPrefillMode(mode);
    setLoadedInput(null);
    setFormVersion((current) => current + 1);
  }

  function changeProvider(nextProvider: string) {
    setProvider(nextProvider);
    if (nextProvider === "gemini") setModel("gemini-2.5-flash");
    else if (nextProvider === "openai") setModel("gpt-4.1");
    else setModel("fixture-v1");
  }

  function translateCopyForActiveLocale() {
    if (!editableStoryboard) return;
    if (activeLocale === "en-US") {
      setTranslationStatus("Choose a non-English locale to create a localized copy draft.");
      return;
    }

    setEditableStoryboard({
      screens: editableStoryboard.screens.map((screen) => ({
        ...screen,
        headline: translateText(screen.headline, activeLocale),
        ...(screen.subheadline ? { subheadline: translateText(screen.subheadline, activeLocale) } : {}),
        ...(screen.callouts ? { callouts: screen.callouts.map((callout) => ({ ...callout, label: translateText(callout.label, activeLocale) })) } : {}),
      })),
    });
    setTranslationStatus(`Draft translated to ${activeLocale}. Review the copy, then preview/save.`);
  }

  function updateScreenText(index: number, field: "headline" | "subheadline", value: string) {
    setEditableStoryboard((current) => {
      if (!current) return current;
      return {
        screens: current.screens.map((screen) =>
          screen.index === index ? { ...screen, [field]: value } : screen,
        ),
      };
    });
  }

  function updateCalloutLabel(screenIndex: number, calloutIndex: number, value: string) {
    setEditableStoryboard((current) => {
      if (!current) return current;
      return {
        screens: current.screens.map((screen) => {
          if (screen.index !== screenIndex) return screen;
          const callouts = [...(screen.callouts ?? [])];
          const existing = callouts[calloutIndex];
          if (!existing) return screen;
          callouts[calloutIndex] = { ...existing, label: value };
          return { ...screen, callouts };
        }),
      };
    });
  }

  function updateTextLayer(
    screenIndex: number,
    layer: "headline" | "subheadline",
    field: keyof TextLayerOverride,
    value: string,
  ) {
    setEditableStoryboard((current) => {
      if (!current) return current;
      return {
        screens: current.screens.map((screen) => {
          if (screen.index !== screenIndex) return screen;
          const text = screen.text ?? {};
          const layerValue = text[layer] ?? {};
          const nextValue = field === "fontFamily" || field === "align" ? value : value === "" ? undefined : Number(value);
          return {
            ...screen,
            text: {
              ...text,
              [layer]: {
                ...layerValue,
                [field]: nextValue,
              },
            },
          };
        }),
      };
    });
  }

  async function createCreatorApp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const app = await createCreatorWorkspaceApp({
        name: readFormString(formData, "name") || "Untitled app",
        category: readFormString(formData, "category"),
        audience: readFormString(formData, "audience"),
        valueProposition: readFormString(formData, "valueProposition"),
        websiteUrl: readFormString(formData, "websiteUrl"),
        brandColors: readFormString(formData, "brandColors"),
      });
      setCreatorApps((current) => [app, ...current.filter((currentApp) => currentApp.id !== app.id)]);
      setSelectedCreatorAppId(app.id);
      setCreatorView("app-dashboard");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create app");
    }
  }

  async function createCreatorPack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCreatorApp) return;
    const formData = new FormData(event.currentTarget);
    const platform = readFormString(formData, "platform") || creatorSettings.defaultPlatform;
    const screenCount = Number(readFormString(formData, "screenCount") || "5");
    try {
      const { pack, apps } = await createCreatorWorkspacePack(selectedCreatorApp.id, {
        name: readFormString(formData, "name") || "Launch pack",
        platform,
        size: sizeForPlatform(platform),
        screenCount,
        locale: readFormString(formData, "locale") || "en-US",
      });
      if (!pack) throw new Error("Could not create pack");
      if (apps) setCreatorApps(apps);
      setSelectedCreatorPackId(pack.id);
      setCreatorView("pack");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pack");
    }
  }

  function saveCreatorSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextSettings: CreatorSettings = {
      falKey: readFormString(formData, "falKey"),
      geminiApiKey: readFormString(formData, "geminiApiKey"),
      openaiApiKey: readFormString(formData, "openaiApiKey"),
      defaultPlatform: readFormString(formData, "defaultPlatform") || "iphone",
      defaultPromptVersion: (readFormString(formData, "defaultPromptVersion") || "v2") as CreatorSettings["defaultPromptVersion"],
    };
    setCreatorSettings(nextSettings);
    setGeminiApiKey(nextSettings.geminiApiKey);
    setOpenaiApiKey(nextSettings.openaiApiKey);
    setCreatorView(selectedCreatorApp ? "app-dashboard" : "home");
  }

  const selectedProject = projects.find((project) => project.projectId === selectedProjectId);
  const selectedCreatorApp = creatorApps.find((app) => app.id === selectedCreatorAppId);
  const selectedCreatorPack = selectedCreatorApp?.packs.find((pack) => pack.id === selectedCreatorPackId) ?? selectedCreatorApp?.packs[0];

  useEffect(() => {
    setAiDirectPackResult(selectedCreatorPack?.latestGeneration
      ? {
        images: selectedCreatorPack.latestGeneration.images,
        trace: selectedCreatorPack.latestGeneration.trace,
        ...(selectedCreatorPack.latestGeneration.localProjectPath ? { localProjectPath: selectedCreatorPack.latestGeneration.localProjectPath } : {}),
      }
      : null);
  }, [selectedCreatorPack?.id]);

  const generationModeIssue = generationModeIssueFor({ generationMode, provider, openaiApiKey });

  return (
    <main className="creator-app-shell" id="top">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="product-topbar">
        <button type="button" className="product-brand" onClick={() => setCreatorView("home")}>Screenshot Studio</button>
        <nav aria-label="Product navigation">
          <button type="button" className={creatorView === "home" ? "active" : ""} onClick={() => setCreatorView("home")}>Apps</button>
          <button type="button" className={creatorView === "settings" ? "active" : ""} onClick={() => setCreatorView("settings")}>Settings</button>
        </nav>
      </header>

      <section id="main-content">
        {creatorView === "home" && (
          <div className="home-view">
            <div className="home-hero">
              <span className="rail-kicker">Apps</span>
              <h1>Create screenshot packs from persistent app context.</h1>
              <p>Create an app once, keep its audience, value proposition, brand and provider settings, then generate packs for each platform and locale.</p>
              <button type="button" className="button primary" onClick={() => setCreatorView("create-app")}>Create new app</button>
            </div>
            <div className="app-grid" aria-label="Saved apps">
              {creatorApps.length === 0 ? <div className="empty-state"><b>No apps yet</b><p>Start by creating your first app context. Packs will live inside it.</p></div> : creatorApps.map((app) => (
                <button type="button" className="app-tile" key={app.id} onClick={() => { setSelectedCreatorAppId(app.id); setCreatorView("app-dashboard"); }}>
                  <b>{app.name}</b>
                  <span>{app.category || "Uncategorized"}</span>
                  <small>{app.packs.length} pack{app.packs.length === 1 ? "" : "s"} · updated {formatShortDate(app.updatedAt)}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {creatorView === "create-app" && (
          <form className="create-app-view" onSubmit={createCreatorApp}>
            <div className="form-intro"><span className="rail-kicker">New app</span><h1>Create your first app</h1><p>These basics improve generation quality and will be reused by every future screenshot pack.</p></div>
            <div className="app-brief-card"><div className="grid two">
              <Field label="App name"><input name="name" required placeholder="VanTrip" /></Field>
              <Field label="Category"><input name="category" required placeholder="Travel / Campervan" /></Field>
              <Field label="Audience"><input name="audience" required placeholder="Campervan owners and digital nomads" /></Field>
              <Field label="Value proposition"><input name="valueProposition" required placeholder="Create personalized trips with AI" /></Field>
              <Field label="Website URL"><input name="websiteUrl" placeholder="https://example.com" /></Field>
              <Field label="Brand colors"><input name="brandColors" placeholder="#111111, #ffffff, #ff8a3d" /></Field>
            </div></div>
            <div className="actions"><button className="button primary">Create app</button><button type="button" className="button secondary" onClick={() => setCreatorView("home")}>Cancel</button></div>
          </form>
        )}

        {creatorView === "settings" && (
          <form className="settings-view" onSubmit={saveCreatorSettings}>
            <div className="form-intro"><span className="rail-kicker">Settings</span><h1>Provider keys and defaults</h1><p>Keys are saved in this browser and reused by pack generation. They are not shown inside the main workflow.</p></div>
            <div className="app-brief-card"><div className="grid two">
              <Field label="FAL key"><input name="falKey" type="password" defaultValue={creatorSettings.falKey} placeholder="fal_..." /></Field>
              <Field label="Gemini key"><input name="geminiApiKey" type="password" defaultValue={creatorSettings.geminiApiKey || geminiApiKey} /></Field>
              <Field label="OpenAI key"><input name="openaiApiKey" type="password" defaultValue={creatorSettings.openaiApiKey || openaiApiKey} /></Field>
              <Field label="Default platform"><select name="defaultPlatform" defaultValue={creatorSettings.defaultPlatform}><option value="iphone">iPhone</option><option value="ipad">iPad</option><option value="android-phone">Android phone</option><option value="android-tablet">Android tablet</option></select></Field>
              <Field label="Default prompt version"><select name="defaultPromptVersion" defaultValue={creatorSettings.defaultPromptVersion}><option value="v1">v1 · image loop</option><option value="v2">v2 · screenshot first</option><option value="v3">v3 · strict UI</option><option value="v4">v4 · feature minimal</option></select></Field>
            </div></div>
            <div className="actions"><button className="button primary">Save settings</button><button type="button" className="button secondary" onClick={() => setCreatorView(selectedCreatorApp ? "app-dashboard" : "home")}>Cancel</button></div>
          </form>
        )}

        {creatorView === "app-dashboard" && selectedCreatorApp && (
          <div className="app-dashboard-view">
            <div className="dashboard-header"><div><span className="rail-kicker">App</span><h1>{selectedCreatorApp.name}</h1><p>{selectedCreatorApp.valueProposition}</p></div><button type="button" className="button primary" onClick={() => setCreatorView("pack")}>Open workspace</button></div>
            <form className="new-pack-card" onSubmit={createCreatorPack}>
              <h2>New screenshot pack</h2>
              <div className="grid four">
                <Field label="Pack name"><input name="name" placeholder="iPhone launch" /></Field>
                <Field label="Platform"><select name="platform" defaultValue={creatorSettings.defaultPlatform}><option value="iphone">iPhone</option><option value="ipad">iPad</option><option value="android-phone">Android phone</option><option value="android-tablet">Android tablet</option></select></Field>
                <Field label="Screens"><select name="screenCount" defaultValue="5"><option value="3">3</option><option value="4">4</option><option value="5">5</option></select></Field>
                <Field label="Default locale"><select name="locale" defaultValue="en-US"><option value="en-US">English</option><option value="es-ES">Spanish</option><option value="fr-FR">French</option></select></Field>
              </div>
              <button className="button primary">Create pack</button>
            </form>
            <div className="pack-list">{selectedCreatorApp.packs.length === 0 ? <div className="empty-state"><b>No packs yet</b><p>Create a pack for iPhone, iPad, Android or a localization campaign.</p></div> : selectedCreatorApp.packs.map((pack) => <button type="button" className="pack-row" key={pack.id} onClick={() => { setSelectedCreatorPackId(pack.id); setCreatorView("pack"); }}><b>{pack.name}</b><span>{pack.platform} · {pack.size} · {pack.screenCount} screens</span><small>{pack.locales.map((locale) => `${locale.code}: ${locale.status}`).join(" · ")}</small></button>)}</div>
          </div>
        )}

        {creatorView === "pack" && (
          <div className="pack-product-view">
            <AiDirectPackPlanner loading={aiDirectPackLoading} error={aiDirectPackError} result={aiDirectPackResult} onSubmit={onAiImageDirectPackSubmit} persistedFalKey={creatorSettings.falKey} app={selectedCreatorApp} pack={selectedCreatorPack} onWorkspaceAppsChange={setCreatorApps} />
            <details className="legacy-workflow" id="single-image"><summary>Single image generator</summary><AiImageDirectPanel loading={aiDirectLoading} error={aiDirectError} result={aiDirectResult} onSubmit={onAiImageDirectSubmit} /></details>
          </div>
        )}
      </section>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function readFormString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function sizeForPlatform(platform: string): string {
  if (platform === "ipad") return "2048×2732";
  if (platform === "android-phone") return "1080×1920";
  if (platform === "android-tablet") return "1600×2560";
  return "1320×2868";
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function generationModeIssueFor(params: { generationMode: "deterministic" | "premium-direct"; provider: string; openaiApiKey: string }): string | undefined {
  if (params.generationMode !== "premium-direct") return undefined;
  if (params.provider === "fixture") return undefined;
  if (params.provider !== "openai") return "Premium Direct needs OpenAI image generation. Switch provider to OpenAI, or use Fixture for a free smoke test.";
  if (!params.openaiApiKey) return "Premium Direct with OpenAI needs an OpenAI API key. Paste it in Advanced provider settings first.";
  return undefined;
}

function translateText(value: string, locale: string): string {
  const normalized = value.trim();
  const phraseTranslations: Record<string, Record<string, string>> = {
    "es-ES": {
      "Turn books into routes": "Convierte libros en rutas",
      "turn books into walkable routes": "convierte libros en rutas a pie",
      "Search by book, author, or city": "Busca por libro, autor o ciudad",
      "Discover real story places": "Descubre lugares reales de la historia",
      "Follow the route on the map": "Sigue la ruta en el mapa",
      "Save literary walks for later": "Guarda paseos literarios para después",
      "Find places nearby": "Encuentra lugares cercanos",
      "Walk the story": "Camina la historia",
      "Save every trip": "Guarda cada viaje",
      "Share memories": "Comparte recuerdos",
    },
    "es-MX": {
      "Turn books into routes": "Convierte libros en rutas",
      "turn books into walkable routes": "convierte libros en recorridos a pie",
      "Search by book, author, or city": "Busca por libro, autor o ciudad",
      "Discover real story places": "Descubre lugares reales de la historia",
      "Follow the route on the map": "Sigue el recorrido en el mapa",
      "Save literary walks for later": "Guarda caminatas literarias para después",
    },
    "fr-FR": {
      "Turn books into routes": "Transformez les livres en itinéraires",
      "Search by book, author, or city": "Recherchez par livre, auteur ou ville",
      "Discover real story places": "Découvrez les lieux réels de l’histoire",
      "Follow the route on the map": "Suivez l’itinéraire sur la carte",
      "Save literary walks for later": "Enregistrez vos balades littéraires",
    },
  };

  return phraseTranslations[locale]?.[normalized] ?? normalized;
}
