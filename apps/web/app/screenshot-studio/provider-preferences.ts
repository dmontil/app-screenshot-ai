export type ProviderPreferences = {
  provider: string;
  model: string;
  geminiApiKey: string;
  openaiApiKey: string;
};

export const PROVIDER_PREFERENCES_STORAGE_KEY = "app-screenshot-ai.provider-preferences.v1";

export function loadProviderPreferences(storage: Storage | undefined): Partial<ProviderPreferences> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(PROVIDER_PREFERENCES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<ProviderPreferences>;
    return {
      ...(typeof parsed.provider === "string" && parsed.provider ? { provider: parsed.provider } : {}),
      ...(typeof parsed.model === "string" && parsed.model ? { model: parsed.model } : {}),
      ...(typeof parsed.geminiApiKey === "string" && parsed.geminiApiKey ? { geminiApiKey: parsed.geminiApiKey } : {}),
      ...(typeof parsed.openaiApiKey === "string" && parsed.openaiApiKey ? { openaiApiKey: parsed.openaiApiKey } : {}),
    };
  } catch {
    return {};
  }
}

export function saveProviderPreferences(storage: Storage | undefined, preferences: ProviderPreferences): void {
  if (!storage) return;
  try {
    storage.setItem(PROVIDER_PREFERENCES_STORAGE_KEY, JSON.stringify({
      provider: preferences.provider,
      model: preferences.model,
      ...(isMaskedSecret(preferences.geminiApiKey) || !preferences.geminiApiKey ? {} : { geminiApiKey: preferences.geminiApiKey }),
      ...(isMaskedSecret(preferences.openaiApiKey) || !preferences.openaiApiKey ? {} : { openaiApiKey: preferences.openaiApiKey }),
    }));
  } catch {
    // Ignore storage quota/private-mode failures. The form still works for this session.
  }
}

export function mergeProviderSettings(
  serverSettings: ProviderPreferences,
  storedPreferences: Partial<ProviderPreferences>,
): ProviderPreferences {
  return {
    provider: storedPreferences.provider || serverSettings.provider,
    model: storedPreferences.model || serverSettings.model,
    geminiApiKey: storedPreferences.geminiApiKey || serverSettings.geminiApiKey,
    openaiApiKey: storedPreferences.openaiApiKey || serverSettings.openaiApiKey,
  };
}

function isMaskedSecret(value: string): boolean {
  return value.includes("•");
}
