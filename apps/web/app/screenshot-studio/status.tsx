import type { GenerateResponse, ProjectSummary } from "./types";

type StudioTopBarProps = {
  result: GenerateResponse | null;
  selectedProject: ProjectSummary | undefined;
  selectedGenerationId: string;
  hasUnsavedPreview: boolean;
  rerendering: boolean;
  autoRerender: boolean;
  onDownload: () => void;
};

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}
