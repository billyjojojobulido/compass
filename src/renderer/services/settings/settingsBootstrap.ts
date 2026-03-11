import { UserConfig } from '@/domain/types';

let cachedSettings: UserConfig | null = null;

export async function loadUserSettings(): Promise<UserConfig> {
  const raw = await window.compass.setting.read();

  const today = new Date();
  const defaultDate = today.toISOString().slice(0, 10);

  const settings: UserConfig = {
    startDate: raw?.startDate ?? defaultDate,
    language: raw?.language ?? detectSystemLanguage(),
    timezone: raw?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    theme: raw?.theme ?? 'system',
  };

  cachedSettings = settings;

  return settings;
}

export function getUserSettings(): UserConfig {
  if (!cachedSettings) {
    throw new Error('Settings not initialized');
  }
  return cachedSettings;
}

function detectSystemLanguage(): 'en' | 'zh' {
  const lang = navigator.language.toLowerCase();

  if (lang.startsWith('zh')) return 'zh';

  return 'en';
}
