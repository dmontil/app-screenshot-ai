"use client";

import { useState } from "react";

import type { EditableStoryboard, GenerateResponse } from "./types";

type PreviewGalleryProps = {
  result: GenerateResponse | null;
  storyboard: EditableStoryboard | null;
  loading: boolean;
};

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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="section-header"><span>{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>;
}
