import { createRoot } from 'react-dom/client';
import App from './App';
import i18n from '@/services/i18n/i18n';
import { loadUserSettings } from './services/settings/settingsBootstrap';

async function bootstrap() {
  // 1) load user settings first
  const settings = await loadUserSettings();

  // 2) init language before first render
  await i18n.changeLanguage(settings.language);

  // 3) render app
  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);
  root.render(<App initialSettings={settings} />);
}

bootstrap().catch((err) => {
  console.error('[bootstrap] failed', err);

  // fallback: still render app so user is not blocked
  const container = document.getElementById('root') as HTMLElement;
  const root = createRoot(container);
  root.render(<App />);
});
