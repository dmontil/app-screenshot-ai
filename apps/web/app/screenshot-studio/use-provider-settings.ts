import { useEffect, useState } from "react";

import { fetchProviderSettings } from "./api-client";
import { loadProviderPreferences, mergeProviderSettings, saveProviderPreferences } from "./provider-preferences";

export function useProviderSettings() {
  const [provider, setProvider] = useState("fixture");
  const [model, setModel] = useState("fixture-v1");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [providerSettingsLoaded, setProviderSettingsLoaded] = useState(false);

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

  function changeProvider(nextProvider: string) {
    setProvider(nextProvider);
    if (nextProvider === "gemini") setModel("gemini-2.5-flash");
    else if (nextProvider === "openai") setModel("gpt-4.1");
    else setModel("fixture-v1");
  }

  return {
    provider,
    model,
    geminiApiKey,
    openaiApiKey,
    setModel,
    setGeminiApiKey,
    setOpenaiApiKey,
    changeProvider,
  };
}
