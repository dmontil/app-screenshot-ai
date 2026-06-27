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
  StudioHeader,
  StudioSidebar,
} from "./screenshot-studio/components";
import { fetchProjectGeneration, fetchProjects, fetchProviderSettings, generateAiImageDirect, generateStorePack, rerenderStorePack } from "./screenshot-studio/api-client";
import { loadProviderPreferences, mergeProviderSettings, saveProviderPreferences } from "./screenshot-studio/provider-preferences";
import type { EditableStoryboard, GenerateResponse, ProjectSummary, StoredAppInput, TextLayerOverride } from "./screenshot-studio/types";

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

  useEffect(() => {
    void refreshProjects();
  }, []);

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

  const selectedProject = projects.find((project) => project.projectId === selectedProjectId);
  const generationModeIssue = generationModeIssueFor({ generationMode, provider, openaiApiKey });

  return (
    <main className="studio-shell" id="top">
      <StudioSidebar result={result} selectedProject={selectedProject} hasUnsavedPreview={hasUnsavedPreview} />
      <div className="studio-workspace">
        <StudioHeader
          result={result}
          selectedProject={selectedProject}
          hasUnsavedPreview={hasUnsavedPreview}
          rerendering={rerendering}
          autoRerender={autoRerender}
          onDownload={saveVersionAndDownload}
        />

        <AiDirectPackPlanner />

        <AiImageDirectPanel loading={aiDirectLoading} error={aiDirectError} result={aiDirectResult} onSubmit={onAiImageDirectSubmit} />

        <details className="legacy-workflow" id="create">
          <summary>Full screenshot-set workflow</summary>
          <div className="legacy-workflow-body">
            <form key={`${prefillMode}-${formVersion}`} onSubmit={onSubmit}>
              <CreationStepper
                provider={provider}
                model={model}
                geminiApiKey={geminiApiKey}
                openaiApiKey={openaiApiKey}
                onProviderChange={changeProvider}
                onModelChange={setModel}
                onGeminiApiKeyChange={setGeminiApiKey}
                onOpenaiApiKeyChange={setOpenaiApiKey}
                loading={loading}
                fileCount={fileCount}
                screenshotPreviews={screenshotPreviews}
                prefillMode={prefillMode}
                loadedInput={loadedInput}
                loadedProjectId={loadedInput ? selectedProjectId : undefined}
                generationMode={generationMode}
                premiumDirectCandidateCount={premiumDirectCandidateCount}
                generationModeIssue={generationModeIssue}
                onGenerationModeChange={setGenerationMode}
                onPremiumDirectCandidateCountChange={(value) => setPremiumDirectCandidateCount(Math.max(1, Math.min(3, value || 1)))}
                onUseDemoProject={() => resetCreateForm("demo")}
                onStartBlankProject={() => resetCreateForm("blank")}
                onScreenshotsChange={updateScreenshotPreviews}
              />
            </form>

            {error && <StatusBanner kind="error">{error}</StatusBanner>}
            {result && <StatusBanner kind="success">Generated {result.screenshots.length} screenshots with {result.provider}/{result.model}{result.generationMode === "premium-direct" ? ` · Premium Direct (${result.premiumDirect?.candidateCount ?? 1} candidate${result.premiumDirect?.candidateCount === 1 ? "" : "s"})` : ""}. Local path: {result.localProjectPath}</StatusBanner>}

            <ProjectSwitcher
              projects={projects}
              selectedProjectId={selectedProjectId}
              selectedGenerationId={selectedGenerationId}
              loadingGeneration={loadingGeneration}
              onProjectChange={(value) => { setSelectedProjectId(value); setSelectedGenerationId(""); }}
              onGenerationChange={setSelectedGenerationId}
              onLoad={loadSelectedGeneration}
              onRefresh={refreshProjects}
            />

            <PreviewGallery result={result} storyboard={editableStoryboard} loading={loading} />

            <ManualCopyEditor
              storyboard={editableStoryboard}
              rerendering={rerendering}
              autoRerender={autoRerender}
              activeLocale={activeLocale}
              translationStatus={translationStatus}
              onActiveLocaleChange={(value) => { setActiveLocale(value); setTranslationStatus(""); }}
              onTranslateCopy={translateCopyForActiveLocale}
              onAutoRerenderChange={setAutoRerender}
              onUpdateScreenText={updateScreenText}
              onUpdateCalloutLabel={updateCalloutLabel}
              onUpdateTextLayer={updateTextLayer}
              onSaveVersion={() => { void rerenderWithManualText({ label: "Saved manual version", persist: true }); }}
            />

            {result && <QualityExport result={result} rerendering={rerendering} onDownload={saveVersionAndDownload} />}
            <PipelineStatus loading={loading} result={result} />
            <AdvancedInspector result={result} storyboard={editableStoryboard} />
          </div>
        </details>
      </div>
    </main>
  );
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
