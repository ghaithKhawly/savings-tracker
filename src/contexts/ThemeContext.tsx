import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../theme';
import { useSettings } from './SettingsContext';

type ThemeColors = typeof COLORS;

interface ThemeContextType {
  colors: ThemeColors;
  isDarkMode: boolean;
  spacing: typeof SPACING;
  borderRadius: typeof BORDER_RADIUS;
  typography: typeof TYPOGRAPHY;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const { settings } = useSettings();

  const isDarkMode = useMemo(() => {
    if (settings.themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return settings.themeMode === 'dark';
  }, [settings.themeMode, systemColorScheme]);

  const colors = useMemo<ThemeColors>(() => {
    if (!isDarkMode) return COLORS;
    return { ...COLORS, ...DARK_COLORS } as ThemeColors;
  }, [isDarkMode]);

  const value = useMemo(
    () => ({
      colors,
      isDarkMode,
      spacing: SPACING,
      borderRadius: BORDER_RADIUS,
      typography: TYPOGRAPHY,
    }),
    [colors, isDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
