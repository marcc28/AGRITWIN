/**
 * AgriTwin theme
 * Palette based on a natural green, sand, and terracotta color scheme.
 */
export const Colors = {
  light: {
    primary: '#24573A',
    primaryDark: '#173824',
    secondary: '#3D7650',

    background: '#F5F7F1',
    backgroundElement: '#173824',
    surface: '#FFFFFF',
    surfaceSecondary: '#E7EEE0',

    text: '#173824',
    textSecondary: '#6B786E',
    textMuted: '#929C95',

    border: '#E2E8DD',

    shadow: '#173824',

    social: '#173824',

    dangerBackground: '#F4DEDE',
    dangerBorder: '#D9A4A4',
    dangerText: '#8F4141',

    successBackground: '#E7EEE0',
    successBorder: '#84A06C',
    successText: '#24573A',

    overlay: 'rgba(0, 0, 0, 0.5)',
  },

  dark: {
    primary: '#84A06C',
    primaryDark: '#3D7650',
    secondary: '#C17A40',

    background: '#173824',
    backgroundElement: '#24573A',
    surface: '#1F4230',
    surfaceSecondary: '#294B37',

    text: '#F5F7F1',
    textSecondary: '#C5D1C2',
    textMuted: '#929C95',

    border: '#3D5945',

    shadow: '#101F16',

    social: '#F5F7F1',

    dangerBackground: '#472B2B',
    dangerBorder: '#704343',
    dangerText: '#F0B5B5',

    successBackground: '#294B37',
    successBorder: '#84A06C',
    successText: '#E7EEE0',

    overlay: 'rgba(0, 0, 0, 0.7)',
  },
} as const;

export const Gradients = {
  primary: ['#24573A', '#173824'],
} as const;
