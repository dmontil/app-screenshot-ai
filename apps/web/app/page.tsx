"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TextLayerOverride = {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  x?: number;
  y?: number;
  align?: "start" | "middle" | "end";
  maxCharsPerLine?: number;
};

type EditableScreen = {
  id: string;
  index: number;
  role: string;
  headline: string;
  subheadline?: string;
  text?: { headline?: TextLayerOverride; subheadline?: TextLayerOverride };
  treatment?: string;
  sourceScreenshotPath: string;
  secondarySourceScreenshotPath?: string;
  device?: unknown;
  callouts?: Array<{ label: string; x: number; y: number }>;
};

type EditableStoryboard = {
  screens: EditableScreen[];
};

type GenerationSummary = {
  generationId: string;
  projectId: string;
  kind: "ai-generate" | "manual-rerender";
  label?: string;
  createdAt: string;
};

type ProjectSummary = {
  projectId: string;
  appName?: string;
  currentGenerationId?: string;
  generations: GenerationSummary[];
};

type GenerateResponse = {
  projectId: string;
  generationId: string | undefined;
  provider: string | undefined;
  model: string | undefined;
  screenshots: Array<{ fileName: string; dataUrl: string }>;
  qualityReport: unknown;
  visualSystem: unknown;
  storyboard: EditableStoryboard;
  exportManifest: unknown;
  zip: { fileName: string; dataUrl: string };
  localProjectPath: string;
};

const categories = ["travel", "productivity", "fitness", "finance", "education", "utility", "social"];

export default function HomePage() {
  const [provider, setProvider] = useState("fixture");
  const [model, setModel] = useState("fixture-v1");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [editableStoryboard, setEditableStoryboard] = useState<EditableStoryboard | null>(null);
  const [fileCount, setFileCount] = useState(0);
  const [rerendering, setRerendering] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGenerationId, setSelectedGenerationId] = useState("");
  const [autoRerender, setAutoRerender] = useState(true);
  const [hasUnsavedPreview, setHasUnsavedPreview] = useState(false);
  const lastRenderedStoryboardJsonRef = useRef("");
  const autoRerenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const defaultModel = useMemo(() => {
    if (provider === "gemini") return "gemini-2.5-flash";
    if (provider === "openai") return "gpt-4.1-mini";
    return "fixture-v1";
  }, [provider]);

  useEffect(() => {
    setModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    void refreshProjects();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/provider-settings")
      .then((response) => response.json())
      .then((settings: { provider: string; model: string; geminiApiKey: string; openaiApiKey: string }) => {
        if (cancelled) return;
        setProvider(settings.provider);
        setModel(settings.model);
        setGeminiApiKey(settings.geminiApiKey);
        setOpenaiApiKey(settings.openaiApiKey);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProject = projects.find((project) => project.projectId === selectedProjectId);

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
    }, 900);

    return () => {
      if (autoRerenderTimerRef.current) clearTimeout(autoRerenderTimerRef.current);
    };
  }, [autoRerender, editableStoryboard, result, rerendering]);

  async function refreshProjects() {
    const response = await fetch("/api/projects");
    const payload = (await response.json()) as { projects: ProjectSummary[] };
    setProjects(payload.projects);
  }

  async function loadSelectedGeneration() {
    if (!selectedProjectId || !selectedGenerationId) return;
    const response = await fetch(`/api/project-generation?projectId=${encodeURIComponent(selectedProjectId)}&generationId=${encodeURIComponent(selectedGenerationId)}`);
    const payload = (await response.json()) as GenerateResponse | { error: string };
    if (!response.ok) {
      setError("error" in payload ? payload.error : "Could not load generation");
      return;
    }
    const loaded = payload as GenerateResponse;
    lastRenderedStoryboardJsonRef.current = JSON.stringify(loaded.storyboard);
    setHasUnsavedPreview(false);
    setResult({ ...loaded, provider, model });
    setEditableStoryboard(loaded.storyboard);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/generate", { method: "POST", body: formData });
      const payload = (await response.json()) as GenerateResponse | { error: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Generation failed");
      const generated = payload as GenerateResponse;
      lastRenderedStoryboardJsonRef.current = JSON.stringify(generated.storyboard);
      setHasUnsavedPreview(false);
      setResult(generated);
      setEditableStoryboard(generated.storyboard);
      await refreshProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function rerenderWithManualText(options: { storyboard?: EditableStoryboard; label?: string; persist?: boolean } = {}): Promise<GenerateResponse | undefined> {
    const storyboardToRender = options.storyboard ?? editableStoryboard;
    if (!result || !storyboardToRender) return undefined;
    setRerendering(true);
    setError(null);

    try {
      const response = await fetch("/api/rerender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: result.projectId,
          locale: "en-US",
          visualSystem: result.visualSystem,
          storyboard: storyboardToRender,
          label: options.label ?? "Manual rerender",
          persist: options.persist ?? true,
        }),
      });
      const payload = (await response.json()) as GenerateResponse | { error: string };
      if (!response.ok) throw new Error("error" in payload ? payload.error : "Rerender failed");
      const nextResult = { ...result, ...(payload as GenerateResponse), provider: result.provider, model: result.model };
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

  function triggerDownload(dataUrl: string, fileName: string) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
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

  return (
    <main>
      <section className="hero">
        <div>
          <div className="badge">Local-first · BYOK · Open-source</div>
          <h1>Generate app store screenshots from raw app screens.</h1>
          <p>
            Minimal local UI for the full v1 pipeline: provider settings, project metadata, screenshot upload,
            generation, preview, quality report, and ZIP export.
          </p>
        </div>
        <div className="card">
          <h2>How to test</h2>
          <p>
            Start with <b>Fixture</b> to verify the product without API keys. Then switch to Gemini or OpenAI and paste
            your key locally.
          </p>
          <small>Nothing is hosted; generated files are written under <code>.local/projects</code>.</small>
        </div>
      </section>

      <section className="card">
        <h2>Saved projects & A/B versions</h2>
        <p>Create a project by generating once. Every AI generation and every manual rerender is saved as a version you can load, edit, and compare.</p>
        <div className="grid">
          <div className="field">
            <label>Project</label>
            <select value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setSelectedGenerationId(""); }}>
              <option value="">Choose a saved project</option>
              {projects.map((project) => (
                <option value={project.projectId} key={project.projectId}>{project.appName ? `${project.appName} — ` : ""}{project.projectId}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Generation</label>
            <select value={selectedGenerationId} onChange={(event) => setSelectedGenerationId(event.target.value)} disabled={!selectedProject}>
              <option value="">Choose a generation</option>
              {selectedProject?.generations.map((generation) => (
                <option value={generation.generationId} key={generation.generationId}>
                  {generation.label ?? generation.kind} · {new Date(generation.createdAt).toLocaleString()} · {generation.generationId}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="actions">
          <button type="button" disabled={!selectedProjectId || !selectedGenerationId} onClick={loadSelectedGeneration}>Load generation for editing</button>
          <button type="button" onClick={refreshProjects}>Refresh projects</button>
        </div>
      </section>

      <form className="card" onSubmit={onSubmit}>
        <h2>1. Provider settings</h2>
        <div className="grid">
          <div className="field">
            <label>Provider</label>
            <select name="provider" value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="fixture">Fixture — no API key</option>
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </div>
          <div className="field">
            <label>Model</label>
            <input name="model" value={model} onChange={(event) => setModel(event.target.value)} />
          </div>
          <div className="field">
            <label>Gemini API key</label>
            <input
              name="geminiApiKey"
              type="password"
              value={geminiApiKey}
              onChange={(event) => setGeminiApiKey(event.target.value)}
              placeholder="Only required for Gemini"
            />
          </div>
          <div className="field">
            <label>OpenAI API key</label>
            <input
              name="openaiApiKey"
              type="password"
              value={openaiApiKey}
              onChange={(event) => setOpenaiApiKey(event.target.value)}
              placeholder="Only required for OpenAI"
            />
          </div>
        </div>

        <h2>2. Project metadata</h2>
        <div className="grid">
          <div className="field">
            <label>Project ID</label>
            <input name="projectId" placeholder="literarytrip" defaultValue="ui-test-project" />
          </div>
          <div className="field">
            <label>Generation label</label>
            <input name="generationLabel" placeholder="A/B label, e.g. Premium route copy" defaultValue="AI generation" />
          </div>
          <div className="field">
            <label>App name</label>
            <input name="appName" required defaultValue="LiteraryTrip" />
          </div>
          <div className="field">
            <label>Category</label>
            <select name="category" defaultValue="travel">
              {categories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Base locale</label>
            <input name="baseLocale" required defaultValue="en-US" />
          </div>
          <div className="field">
            <label>Target audience</label>
            <input name="targetAudience" required defaultValue="readers who travel" />
          </div>
          <div className="field">
            <label>Main value proposition</label>
            <input name="mainValueProposition" required defaultValue="turn books into walkable routes" />
          </div>
          <div className="field">
            <label>Brand colors</label>
            <input name="brandColors" defaultValue="#F7F1E7, #3B2416, #D99A32" />
          </div>
          <div className="field">
            <label>Website URL</label>
            <input name="websiteUrl" placeholder="https://example.com" />
          </div>
        </div>

        <h2>3. Upload screenshots</h2>
        <div className="field">
          <label>Raw app screenshots</label>
          <input
            name="screenshots"
            type="file"
            accept="image/png,image/jpeg"
            multiple
            required
            onChange={(event) => setFileCount(event.target.files?.length ?? 0)}
          />
          <small>Upload at least 3 screenshots. At least 2 must be functional UI screens.</small>
        </div>
        <div className="grid">
          {Array.from({ length: Math.max(fileCount, 3) }).map((_, index) => (
            <div className="field" key={index}>
              <label>Screenshot {index + 1} kind</label>
              <select name="screenshotKinds" defaultValue="functional">
                <option value="functional">Functional UI</option>
                <option value="splash">Splash</option>
                <option value="logo">Logo</option>
                <option value="empty">Empty</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
          ))}
        </div>

        <div className="actions">
          <button disabled={loading}>{loading ? "Generating..." : "Generate screenshots"}</button>
          <small>Creates 5 PNGs, report, ZIP, and local project artifacts.</small>
        </div>
      </form>

      {error && <section className="results"><div className="error">{error}</div></section>}

      {result && (
        <section className="results">
          <div className="success">
            Generated {result.screenshots.length} screenshots with {result.provider}/{result.model}. Local path: {result.localProjectPath}
          </div>

          <div className="card">
            <h2>4. Preview</h2>
            <div className="preview-grid">
              {result.screenshots.map((screenshot) => (
                <div className="preview" key={screenshot.fileName}>
                  <img src={screenshot.dataUrl} alt={screenshot.fileName} />
                  <small>{screenshot.fileName}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>5. Manual copy editor</h2>
            <p>
              The AI gives you a first draft, but store screenshots must be editable. Change headlines, subheads, and
              callout labels here, then rerender the PNGs without calling the model again.
            </p>
            <div className="editor-grid">
              {editableStoryboard?.screens.map((screen) => (
                <div className="editor-screen" key={screen.id}>
                  <div className="editor-heading">
                    <b>{String(screen.index).padStart(2, "0")}. {screen.role}</b>
                    <small>{screen.treatment ?? "hero-device"}</small>
                  </div>
                  <div className="field">
                    <label>Headline</label>
                    <textarea
                      value={screen.headline}
                      onChange={(event) => updateScreenText(screen.index, "headline", event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Subheadline</label>
                    <textarea
                      value={screen.subheadline ?? ""}
                      onChange={(event) => updateScreenText(screen.index, "subheadline", event.target.value)}
                    />
                  </div>
                  <details className="text-controls">
                    <summary>Typography & position</summary>
                    <div className="mini-grid">
                      <div className="field">
                        <label>Headline font</label>
                        <select
                          value={screen.text?.headline?.fontFamily ?? ""}
                          onChange={(event) => updateTextLayer(screen.index, "headline", "fontFamily", event.target.value)}
                        >
                          <option value="">Visual system default</option>
                          <option value="Inter">Inter</option>
                          <option value="Arial">Arial</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Avenir Next">Avenir Next</option>
                          <option value="Helvetica Neue">Helvetica Neue</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Headline size</label>
                        <input type="number" min="40" max="140" value={screen.text?.headline?.fontSize ?? ""} placeholder="104" onChange={(event) => updateTextLayer(screen.index, "headline", "fontSize", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Headline weight</label>
                        <input type="number" min="300" max="950" step="50" value={screen.text?.headline?.fontWeight ?? ""} placeholder="760" onChange={(event) => updateTextLayer(screen.index, "headline", "fontWeight", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Headline wrap chars</label>
                        <input type="number" min="8" max="28" value={screen.text?.headline?.maxCharsPerLine ?? ""} placeholder="16" onChange={(event) => updateTextLayer(screen.index, "headline", "maxCharsPerLine", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Headline X (0–1)</label>
                        <input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.x ?? ""} placeholder="0.07" onChange={(event) => updateTextLayer(screen.index, "headline", "x", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Headline Y (0–1)</label>
                        <input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.y ?? ""} placeholder="0.09" onChange={(event) => updateTextLayer(screen.index, "headline", "y", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Align</label>
                        <select value={screen.text?.headline?.align ?? ""} onChange={(event) => updateTextLayer(screen.index, "headline", "align", event.target.value)}>
                          <option value="">Default</option>
                          <option value="start">Left</option>
                          <option value="middle">Center</option>
                          <option value="end">Right</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Subheadline size</label>
                        <input type="number" min="18" max="58" value={screen.text?.subheadline?.fontSize ?? ""} placeholder="34" onChange={(event) => updateTextLayer(screen.index, "subheadline", "fontSize", event.target.value)} />
                      </div>
                      <div className="field">
                        <label>Subheadline Y (0–1)</label>
                        <input type="number" min="0" max="1" step="0.01" value={screen.text?.subheadline?.y ?? ""} placeholder="auto" onChange={(event) => updateTextLayer(screen.index, "subheadline", "y", event.target.value)} />
                      </div>
                    </div>
                  </details>
                  {(screen.callouts ?? []).map((callout, calloutIndex) => (
                    <div className="field" key={calloutIndex}>
                      <label>Callout {calloutIndex + 1}</label>
                      <input
                        value={callout.label}
                        onChange={(event) => updateCalloutLabel(screen.index, calloutIndex, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="actions">
              <button type="button" disabled={rerendering || !editableStoryboard} onClick={() => rerenderWithManualText({ label: "Saved manual version", persist: true })}>
                {rerendering ? "Updating preview..." : "Save version"}
              </button>
              <label className="inline-toggle">
                <input
                  type="checkbox"
                  checked={autoRerender}
                  onChange={(event) => setAutoRerender(event.target.checked)}
                />
                Auto preview after edits
              </label>
              <small>Auto preview waits briefly after typing and updates the PNG preview only. Use Save version when you want to add it to A/B history.</small>
            </div>
          </div>

          <div className="card">
            <h2>6. Quality report</h2>
            <pre>{JSON.stringify(result.qualityReport, null, 2)}</pre>
          </div>

          <div className="card">
            <h2>7. Visual system + storyboard</h2>
            <pre>{JSON.stringify({ visualSystem: result.visualSystem, storyboard: editableStoryboard ?? result.storyboard }, null, 2)}</pre>
          </div>

          <div className="card">
            <h2>8. Export</h2>
            <p>Download saves the current preview as an A/B version first, then downloads the ZIP.</p>
            <button type="button" className="download" disabled={rerendering} onClick={saveVersionAndDownload}>
              {rerendering ? "Saving..." : `Save version & download ${result.zip.fileName}`}
            </button>
            <pre>{JSON.stringify(result.exportManifest, null, 2)}</pre>
          </div>
        </section>
      )}
    </main>
  );
}
