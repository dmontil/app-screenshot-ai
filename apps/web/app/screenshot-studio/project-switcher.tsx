import type { ReactNode } from "react";

import type { ProjectSummary } from "./types";

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function formatProjectDate(value: string | undefined) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
