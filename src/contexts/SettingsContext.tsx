import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AssetType } from '../store/useAssetsStore';

export type ThemeMode = 'light' | 'dark' | 'system';
export type CurrencyDisplay = 'USD' | 'SYP';
export type PricePreference = 'live' | 'cached' | 'demo';

export type AllocationTargets = Record<AssetType, number>;

export interface AppSettings {
  themeMode: ThemeMode;
  currencyDisplay: CurrencyDisplay;
  showCents: boolean;
  onboardingCompleted: boolean;
  pricePreference: PricePreference;
  hideBalances: boolean;
  privacyScreenEnabled: boolean;
  appLockEnabled: boolean;
  allocationTargets: AllocationTargets;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  isLoading: boolean;
}

const SETTINGS_STORAGE_KEY = 'app_settings';

const defaultSettings: AppSettings = {
  themeMode: 'light',
  currencyDisplay: 'USD',
  showCents: true,
  onboardingCompleted: false,
  pricePreference: 'live',
  hideBalances: false,
  privacyScreenEnabled: true,
  appLockEnabled: false,
  allocationTargets: {
    USD: 25,
    SYP: 10,
    GOLD: 55,
    SILVER: 10,
  },
};

function normalizeAllocationTargets(raw: unknown): AllocationTargets {
  const defaults = defaultSettings.allocationTargets;
  if (!raw || typeof raw !== 'object') return defaults;

  const candidate = raw as Partial<Record<AssetType, unknown>>;
  const next: AllocationTargets = { ...defaults };
  (Object.keys(defaults) as AssetType[]).forEach((type) => {
    const value = candidate[type];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      next[type] = Math.min(100, value);
    }
  });

  return next;
}

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  return {
    ...defaultSettings,
    ...raw,
    themeMode: raw.themeMode === 'dark' || raw.themeMode === 'system' ? raw.themeMode : 'light',
    currencyDisplay: raw.currencyDisplay === 'SYP' ? 'SYP' : 'USD',
    showCents: typeof raw.showCents === 'boolean' ? raw.showCents : defaultSettings.showCents,
    onboardingCompleted: typeof raw.onboardingCompleted === 'boolean' ? raw.onboardingCompleted : false,
    pricePreference:
      raw.pricePreference === 'cached' || raw.pricePreference === 'demo' ? raw.pricePreference : 'live',
    hideBalances: typeof raw.hideBalances === 'boolean' ? raw.hideBalances : false,
    privacyScreenEnabled:
      typeof raw.privacyScreenEnabled === 'boolean' ? raw.privacyScreenEnabled : true,
    appLockEnabled: typeof raw.appLockEnabled === 'boolean' ? raw.appLockEnabled : false,
    allocationTargets: normalizeAllocationTargets(raw.allocationTargets),
  };
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppSettings>;
        setSettings(normalizeSettings(parsed));
      }
    } catch (error) {
      console.error('[Settings] Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...settings, ...updates };
      const normalizedSettings = normalizeSettings(newSettings);
      setSettings(normalizedSettings);
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
    } catch (error) {
      console.error('[Settings] Failed to save settings:', error);
      throw error;
    }
  }, [settings]);

  const value = {
    settings,
    updateSettings,
    isLoading,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
