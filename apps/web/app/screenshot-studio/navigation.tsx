import type { GenerateResponse, ProjectSummary } from "./types";

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
