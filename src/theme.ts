/**
 * Theme configuration for Savings Tracker
 * Provides consistent colors, spacing, and typography throughout the app
 */

export const COLORS = {
  // Primary
  primary: '#007AFF',
  primaryLight: '#E3F2FD',
  primaryDark: '#0056B3',

  // Semantic
  success: '#34C759',
  successLight: '#D1FAE5',
  warning: '#FF9500',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#991b1b',
  overlay: 'rgba(0, 0, 0, 0.5)',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: 'rgba(255, 255, 255, 0.78)',
  onPrimarySubtle: 'rgba(255, 255, 255, 0.68)',
  transparent: 'transparent',

  // Neutral
  white: '#FFFFFF',
  black: '#000000',
  shadow: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Asset colors
  assetUSD: '#3B82F6',
  assetSYP: '#EF4444',
  assetGOLD: '#F59E0B',
  assetSILVER: '#A0AEC0',

  // Backgrounds
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8F9FA',
};

/** Dark mode color overrides */
export const DARK_COLORS: Partial<typeof COLORS> = {
  bgPrimary: '#1F2937',
  bgSecondary: '#111827',
  gray50: '#374151',
  gray100: '#4B5563',
  gray200: '#6B7280',
  gray700: '#E5E7EB',
  gray800: '#F3F4F6',
  gray900: '#F9FAFB',
};

/**
 * Get theme colors based on dark mode preference
 */
export function getColors(isDarkMode: boolean = false): typeof COLORS {
  if (!isDarkMode) return COLORS;
  return { ...COLORS, ...DARK_COLORS };
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const BORDER_RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  h4: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
};
