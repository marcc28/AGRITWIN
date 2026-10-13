/**
 * AgriTwin theme
 * Palette inspired by:
 * https://colorhunt.co/palette/bc9f8bb5cfb7cadabfe7e8d8
 */

import '@/global.css';
import { Platform } from 'react-native';

export const Colors = {
  light: {
    primary: '#5F8068',
    primaryDark: '#46614F',
    secondary: '#BC9F8B',

    background: '#E7E8D8',
    surface: '#FFFFFF',
    surfaceSecondary: '#CADABF',

    text: '#29332C',
    textSecondary: '#69736C',
    textMuted: '#8A928C',

    border: '#D5D9D0',

    shadow: '#BC9F8B',
    inputShadow: '#CADABF',

    social: '#29332C',

    dangerBackground: '#F4DEDE',
    dangerBorder: '#D9A4A4',
    dangerText: '#8F4141',

    successBackground: '#E2EEE4',
    successBorder: '#B5CFB7',
    successText: '#46614F',

    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  dark: {
    primary: '#8FB59A',
    primaryDark: '#B5CFB7',
    secondary: '#BC9F8B',

    background: '#1E2822',
    surface: '#29332C',
    surfaceSecondary: '#354238',

    text: '#F5F5F0',
    textSecondary: '#C5CDC7',
    textMuted: '#929C95',

    border: '#46534A',

    shadow: '#121812',
    inputShadow: '#354238',

    social: '#F5F5F0',

    dangerBackground: '#472B2B',
    dangerBorder: '#704343',
    dangerText: '#F0B5B5',

    successBackground: '#294132',
    successBorder: '#46614F',
    successText: '#B5CFB7',

    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Gradients = {
  primary: [Colors.light.primary, Colors.light.primaryDark],
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
