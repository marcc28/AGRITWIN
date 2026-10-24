/**
 * AgriTwin theme
 * Palette based on the AgriTwin brand colors.
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Brand
    primary: '#24573A',
    primaryDark: '#173824',
    secondary: '#3D7650',

    // Backgrounds
    background: '#F5F7F1',
    surface: '#FFFFFF',
    surfaceSecondary: '#E7EEE0',

    // Text
    text: '#173824',
    textSecondary: '#6B786E',
    textMuted: '#8A928C',

    // Borders and shadows
    border: '#E2E8DD',
    shadow: '#173824',
    inputShadow: '#E7EEE0',

    social: '#173824',

    // Error states
    dangerBackground: '#F3EADF',
    dangerBorder: '#C17A40',
    dangerText: '#8F4E26',

    // Success states
    successBackground: '#E7EEE0',
    successBorder: '#84A06C',
    successText: '#24573A',

    overlay: 'rgba(23, 56, 36, 0.5)',
  },

  dark: {
    // Brand
    primary: '#84A06C',
    primaryDark: '#3D7650',
    secondary: '#C17A40',

    // Backgrounds
    background: '#173824',
    surface: '#24573A',
    surfaceSecondary: '#294832',

    // Text
    text: '#F5F7F1',
    textSecondary: '#D0DCCB',
    textMuted: '#A7B5A5',

    // Borders and shadows
    border: '#3D7650',
    shadow: '#0D2115',
    inputShadow: '#294832',

    social: '#F5F7F1',

    // Error states
    dangerBackground: '#4A3025',
    dangerBorder: '#C17A40',
    dangerText: '#F3C7A6',

    // Success states
    successBackground: '#294832',
    successBorder: '#84A06C',
    successText: '#D0E2C4',

    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light &
  keyof typeof Colors.dark;

export const Gradients = {
  primary: [Colors.light.primary, Colors.light.secondary],
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },

  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },

  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset =
  Platform.select({
    ios: 50,
    android: 80,
  }) ?? 0;

export const MaxContentWidth = 800;
