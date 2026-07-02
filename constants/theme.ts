/**
 * Sistema de diseño de Precios al Toque.
 *
 * - Brand: paleta propia (verde ahorro/confianza + ámbar para acentos).
 * - Type: familia tipográfica Nunito (redondeada, amigable, licencia abierta).
 *   Cada peso es una font distinta — en React Native no alcanza con fontWeight
 *   cuando se usan fuentes custom.
 * - Radius / Spacing: escalas fijas para que todas las pantallas midan igual.
 *
 * Colors y Fonts (abajo) se mantienen por compatibilidad con los componentes
 * del template de Expo (themed-text, use-theme-color, tabs).
 */

import { Platform } from 'react-native';

// ---------------------------------------------------------------------
// Paleta de marca
// ---------------------------------------------------------------------

export const Brand = {
  // Verde principal (ahorro, confianza, mundo almacén/verdulería)
  primary: '#0F6E56',
  primaryLight: '#1D9E75',
  primaryFaint: '#E1F5EE',
  primaryDark: '#04342C',

  // Ámbar: estrellas de puntuación, avisos, precio de referencia
  accent: '#EF9F27',
  accentFaint: '#FAEEDA',
  accentDark: '#854F0B',

  // Naranja quemado para errores/eliminar (evitamos el rojo puro, muy duro)
  danger: '#D85A30',
  dangerFaint: '#FAECE7',
  dangerDark: '#712B13',

  // Neutros cálidos
  surface: '#FFFFFF',
  background: '#F7F6F2',
  textPrimary: '#2C2C2A',
  textSecondary: '#5F5E5A',
  textMuted: '#888780',
  border: '#D3D1C7',
} as const;

// ---------------------------------------------------------------------
// Tipografía (Nunito — se carga en app/_layout.tsx con useFonts)
// ---------------------------------------------------------------------

export const Type = {
  regular: 'Nunito_400Regular',
  medium: 'Nunito_500Medium',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
} as const;

// ---------------------------------------------------------------------
// Escalas de forma y espaciado
// ---------------------------------------------------------------------

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

// ---------------------------------------------------------------------
// Compatibilidad con el template de Expo
// ---------------------------------------------------------------------

export const Colors = {
  light: {
    text: Brand.textPrimary,
    background: Brand.surface,
    tint: Brand.primary,
    icon: Brand.textMuted,
    tabIconDefault: Brand.textMuted,
    tabIconSelected: Brand.primary,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#5DCAA5',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#5DCAA5',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Nunito_400Regular',
    serif: 'ui-serif',
    rounded: 'Nunito_400Regular',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Nunito_400Regular',
    serif: 'serif',
    rounded: 'Nunito_400Regular',
    mono: 'monospace',
  },
  web: {
    sans: "'Nunito', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Nunito', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
