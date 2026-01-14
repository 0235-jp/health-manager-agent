import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Settings } from '../types';

const DEFAULT_TIMEZONE = 'Asia/Tokyo';

interface SettingsContextValue {
  settings: Settings | undefined;
  timezone: string;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }): ReactNode {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  const value: SettingsContextValue = {
    settings,
    timezone: settings?.timezone || DEFAULT_TIMEZONE,
    isLoading,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}

export function useTimezone(): string {
  const { timezone } = useSettings();
  return timezone;
}
