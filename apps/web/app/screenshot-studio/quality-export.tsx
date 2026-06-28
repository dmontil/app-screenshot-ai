import type { GenerateResponse } from "./types";

type QualityExportProps = {
  result: GenerateResponse;
  rerendering: boolean;
  onDownload: () => void;
};

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}
