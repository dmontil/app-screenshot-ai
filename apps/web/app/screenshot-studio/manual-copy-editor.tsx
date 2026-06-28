"use client";

import type { ReactNode } from "react";

import type { EditableStoryboard, TextLayerOverride } from "./types";

type ManualCopyEditorProps = {
  storyboard: EditableStoryboard | null;
  rerendering: boolean;
  autoRerender: boolean;
  activeLocale: string;
  translationStatus: string;
  onActiveLocaleChange: (value: string) => void;
  onTranslateCopy: () => void;
  onAutoRerenderChange: (value: boolean) => void;
  onUpdateScreenText: (index: number, field: "headline" | "subheadline", value: string) => void;
  onUpdateCalloutLabel: (screenIndex: number, calloutIndex: number, value: string) => void;
  onUpdateTextLayer: (screenIndex: number, layer: "headline" | "subheadline", field: keyof TextLayerOverride, value: string) => void;
  onSaveVersion: () => void;
};

export function ManualCopyEditor(props: ManualCopyEditorProps) {
  if (!props.storyboard) return null;

  return (
    <section className="panel editor-panel" id="editor">
      <SectionHeader eyebrow="Editor" title="Fine-tune copy and layout" description="Edit the AI draft without calling the model again. Auto-preview rerenders PNGs locally after a short delay." />
      <div className="translation-panel">
        <div>
          <b>Write another locale</b>
          <small>Choose a target language, then use Translate copy as the starting point for localized screenshots.</small>
        </div>
        <select value={props.activeLocale} onChange={(event) => props.onActiveLocaleChange(event.target.value)} aria-label="Target translation language">
          <option value="en-US">English — US</option>
          <option value="es-ES">Español — España</option>
          <option value="es-MX">Español — México</option>
          <option value="fr-FR">Français</option>
          <option value="de-DE">Deutsch</option>
          <option value="it-IT">Italiano</option>
          <option value="pt-BR">Português — Brasil</option>
        </select>
        <button type="button" className="button primary translate-cta" onClick={props.onTranslateCopy}>Translate copy</button>
        {props.translationStatus && <small className="translation-status">{props.translationStatus}</small>}
      </div>
      <div className="editor-layout">
        <div className="storyboard-list">
          {props.storyboard.screens.map((screen) => (
            <article className="screen-card" key={screen.id}>
              <div className="screen-heading"><b>{String(screen.index).padStart(2, "0")}. {screen.role}</b><small>{screen.treatment ?? "hero-device"}</small></div>
              <Field label="Headline"><textarea value={screen.headline} onChange={(event) => props.onUpdateScreenText(screen.index, "headline", event.target.value)} /></Field>
              <Field label="Subheadline"><textarea value={screen.subheadline ?? ""} onChange={(event) => props.onUpdateScreenText(screen.index, "subheadline", event.target.value)} /></Field>
              {(screen.callouts ?? []).map((callout, calloutIndex) => (
                <Field label={`Callout ${calloutIndex + 1}`} key={calloutIndex}>
                  <input value={callout.label} onChange={(event) => props.onUpdateCalloutLabel(screen.index, calloutIndex, event.target.value)} />
                </Field>
              ))}
              <TextControls screen={screen} onUpdateTextLayer={props.onUpdateTextLayer} />
            </article>
          ))}
        </div>
      </div>
      <div className="actions">
        <button type="button" className="button primary" disabled={props.rerendering || !props.storyboard} onClick={props.onSaveVersion}>{props.rerendering ? "Updating preview..." : "Save version"}</button>
        <label className="inline-toggle"><input type="checkbox" checked={props.autoRerender} onChange={(event) => props.onAutoRerenderChange(event.target.checked)} /> Fast auto preview</label>
        <small>Preview now starts about 300ms after you stop typing. Save version adds this rerender to A/B history.</small>
      </div>
    </section>
  );
}

function TextControls({ screen, onUpdateTextLayer }: { screen: EditableStoryboard["screens"][number]; onUpdateTextLayer: ManualCopyEditorProps["onUpdateTextLayer"] }) {
  return (
    <details className="advanced-card compact">
      <summary>Typography & position</summary>
      <div className="grid three">
        <Field label="Headline font"><select value={screen.text?.headline?.fontFamily ?? ""} onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontFamily", event.target.value)}><option value="">Visual system default</option><option value="Inter">Inter</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Avenir Next">Avenir Next</option><option value="Helvetica Neue">Helvetica Neue</option></select></Field>
        <Field label="Headline size"><input type="number" min="40" max="140" value={screen.text?.headline?.fontSize ?? ""} placeholder="104" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontSize", event.target.value)} /></Field>
        <Field label="Headline weight"><input type="number" min="300" max="950" step="50" value={screen.text?.headline?.fontWeight ?? ""} placeholder="760" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "fontWeight", event.target.value)} /></Field>
        <Field label="Wrap chars"><input type="number" min="8" max="28" value={screen.text?.headline?.maxCharsPerLine ?? ""} placeholder="16" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "maxCharsPerLine", event.target.value)} /></Field>
        <Field label="Headline X"><input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.x ?? ""} placeholder="0.07" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "x", event.target.value)} /></Field>
        <Field label="Headline Y"><input type="number" min="0" max="1" step="0.01" value={screen.text?.headline?.y ?? ""} placeholder="0.09" onChange={(event) => onUpdateTextLayer(screen.index, "headline", "y", event.target.value)} /></Field>
        <Field label="Align"><select value={screen.text?.headline?.align ?? ""} onChange={(event) => onUpdateTextLayer(screen.index, "headline", "align", event.target.value)}><option value="">Default</option><option value="start">Left</option><option value="middle">Center</option><option value="end">Right</option></select></Field>
        <Field label="Subheadline size"><input type="number" min="18" max="58" value={screen.text?.subheadline?.fontSize ?? ""} placeholder="34" onChange={(event) => onUpdateTextLayer(screen.index, "subheadline", "fontSize", event.target.value)} /></Field>
        <Field label="Subheadline Y"><input type="number" min="0" max="1" step="0.01" value={screen.text?.subheadline?.y ?? ""} placeholder="auto" onChange={(event) => onUpdateTextLayer(screen.index, "subheadline", "y", event.target.value)} /></Field>
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
