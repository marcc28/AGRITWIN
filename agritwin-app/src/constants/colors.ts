/**
 * AgriTwin theme
 * Palette inspired by:
 * https://colorhunt.co/palette/bc9f8bb5cfb7cadabfe7e8d8
 */
export const Colors = {
  light: {
    primary: '#5F8068',
    primaryDark: '#46614F',
    secondary: '#BC9F8B',
    
    background: '#E7E8D8',
    backgroundElement: "#46614F",
    surface: '#FFFFFF',
    surfaceSecondary: '#CADABF',

    text: '#29332C',
    textSecondary: '#69736C',
    textMuted: '#8A928C',

    border: '#D5D9D0',

    shadow: '#BC9F8B',

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

export const Gradients = {
  primary: ['#5F8068', '#46614F'],
} as const;