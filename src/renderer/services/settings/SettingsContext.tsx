import React, { createContext, useContext, useMemo, useState } from 'react';
import { UserConfig } from '@/domain/types';

type SettingsContextValue = {
  settings: UserConfig;
  setSettings: React.Dispatch<React.SetStateAction<UserConfig>>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider(props: {
  initialSettings: UserConfig;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(props.initialSettings);

  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return (
    <SettingsContext.Provider value={value}>
      {props.children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
