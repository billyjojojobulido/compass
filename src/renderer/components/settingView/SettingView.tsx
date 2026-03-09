import { UserConfig } from '@/domain/types';
import './settingsView.css';
import React, { useEffect, useMemo, useState } from 'react';

function getTodayLocalDayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserConfig>({
    startDate: getTodayLocalDayKey(),
    language: 'en',
    timezone: 'Australia/Sydney',
    theme: 'system',
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await window.compass.setting.read();
        if (raw) {
          setSettings({
            startDate: raw.startDate ?? getTodayLocalDayKey(),
            language: raw.language ?? 'en',
            timezone: raw.timezone ?? 'Australia/Sydney',
            theme: raw.theme ?? 'system',
          });
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const dirtyHint = useMemo(() => {
    return `The week containing ${settings.startDate} will be treated as Week 1.`;
  }, [settings.startDate]);

  const onSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError(null);

      await window.compass.setting.write(settings);

      // future:
      // await i18n.changeLanguage(settings.language);

      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const onReset = async () => {
    const next: UserConfig = {
      startDate: getTodayLocalDayKey(),
      language: 'en',
      timezone: 'Australia/Sydney',
      theme: 'system',
    };
    setSettings(next);
  };

  if (loading) {
    return <div style={{ padding: 12, opacity: 0.75 }}>Loading settings…</div>;
  }

  return (
    <div className="settingsRoot">
      <div className="contentHeader">
        <div>
          <div className="contentTitle">设置</div>
          <div className="contentHint">
            User preferences and application defaults
          </div>
        </div>

        <div className="contentActions">
          <button className="btnGhost" onClick={onReset} disabled={saving}>
            Reset
          </button>

          <button
            className={`btnPrimary ${saving ? 'saving' : ''} ${saved ? 'done' : ''}`}
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      </div>

      <div className="settingsGrid">
        <section className="settingsCard">
          <div className="settingsCardTitle">Work Timeline</div>

          <div className="settingsField">
            <label className="settingsLabel" htmlFor="weekStartDate">
              Start date
            </label>
            <input
              id="weekStartDate"
              className="settingsInput"
              type="date"
              value={settings.startDate}
              onChange={(e) =>
                setSettings((s) => ({ ...s, weekStartDate: e.target.value }))
              }
            />
            <div className="settingsHint">{dirtyHint}</div>
          </div>

          <div className="settingsField">
            <label className="settingsLabel" htmlFor="weekStartsOn">
              Week starts on
            </label>
            <select
              id="weekStartsOn"
              className="settingsSelect"
              value={settings.startDate}
              disabled
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  weekStartsOn: e.target.value as 'monday',
                }))
              }
            >
              <option value="monday">Monday</option>
            </select>
            <div className="settingsHint">
              Currently fixed to Monday for MVP.
            </div>
          </div>
        </section>

        <section className="settingsCard">
          <div className="settingsCardTitle">Localization</div>

          <div className="settingsField">
            <label className="settingsLabel" htmlFor="language">
              Language
            </label>
            <select
              id="language"
              className="settingsSelect"
              value={settings.language}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  language: e.target.value as 'en' | 'zh',
                }))
              }
            >
              <option value="en">English</option>
              <option value="zh">简体中文</option>
            </select>
          </div>

          <div className="settingsField">
            <label className="settingsLabel" htmlFor="timezone">
              Timezone
            </label>
            <select
              id="timezone"
              className="settingsSelect"
              value={settings.timezone}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  timezone: e.target.value,
                }))
              }
            >
              <option value="Australia/Sydney">Australia/Sydney</option>
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="UTC">UTC</option>
            </select>
            <div className="settingsHint">
              Used for week boundary and future daily / weekly calculations.
            </div>
          </div>
        </section>

        <section className="settingsCard settingsCardDisabled">
          <div className="settingsCardTitle">Appearance</div>

          <div className="settingsField">
            <label className="settingsLabel" htmlFor="theme">
              Theme
            </label>
            <select
              id="theme"
              className="settingsSelect"
              value={settings.theme}
              disabled
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  theme: e.target.value as 'system' | 'light' | 'dark',
                }))
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            <div className="settingsHint">Coming soon.</div>
          </div>
        </section>
      </div>

      {error ? <div className="settingsError">{error}</div> : null}
    </div>
  );
}
