import { useState, useEffect, useCallback } from 'react';

// 8 Color Accent Presets
export const ACCENTS = {
  blurple: { name: 'Blurple', primary: '#5865F2', hover: '#4752C4', active: '#3C45A5' },
  emerald: { name: 'Emerald', primary: '#3BA55D', hover: '#2D8049', active: '#236B3B' },
  crimson: { name: 'Crimson', primary: '#ED4245', hover: '#C93B3E', active: '#A83235' },
  gold: { name: 'Gold', primary: '#F0B132', hover: '#D49E2A', active: '#B88A24' },
  violet: { name: 'Violet', primary: '#9B59B6', hover: '#8E44AD', active: '#7D3C98' },
  coral: { name: 'Coral', primary: '#E67E73', hover: '#D46A5F', active: '#C2574D' },
  cyan: { name: 'Cyan', primary: '#00ADB5', hover: '#009CA3', active: '#008B91' },
  rose: { name: 'Rosé', primary: '#EB459E', hover: '#D63D8C', active: '#C1357A' },
} as const;

// 4 Background Themes
export const BACKGROUNDS = {
  solid: {
    label: 'Solid Dark',
    class: 'bg-theme-solid',
    primary: '#1e1f22',
    secondary: '#2b2d31',
    tertiary: '#313338',
    elevated: '#383a40',
  },
  glass: {
    label: 'Glassmorphism',
    class: 'bg-theme-glass',
    primary: 'rgba(30, 31, 34, 0.9)',
    secondary: 'rgba(43, 45, 49, 0.85)',
    tertiary: 'rgba(49, 51, 56, 0.8)',
    elevated: 'rgba(56, 58, 64, 0.75)',
  },
  oled: {
    label: 'OLED Black',
    class: 'bg-theme-oled',
    primary: '#000000',
    secondary: '#0a0a0a',
    tertiary: '#121212',
    elevated: '#1a1a1a',
  },
  mesh: {
    label: 'Gradient Mesh',
    class: 'bg-theme-mesh',
    primary: '#1a1a2e',
    secondary: '#16213e',
    tertiary: '#1e3a5f',
    elevated: '#264653',
  },
} as const;

export type AccentKey = keyof typeof ACCENTS;
export type BackgroundKey = keyof typeof BACKGROUNDS;

type ThemeState = {
  accent: AccentKey;
  background: BackgroundKey;
};

const STORAGE_KEY = 'foxcli-theme';

const getStoredTheme = (): ThemeState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.accent in ACCENTS && parsed.background in BACKGROUNDS) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Theme] Failed to parse stored theme');
  }
  return { accent: 'blurple', background: 'solid' };
};

const applyThemeToDOM = (accent: AccentKey, background: BackgroundKey) => {
  const accentData = ACCENTS[accent];
  const bgData = BACKGROUNDS[background];

  const root = document.documentElement;

  // Accent colors
  root.style.setProperty('--accent-primary', accentData.primary);
  root.style.setProperty('--accent-hover', accentData.hover);
  root.style.setProperty('--accent-active', accentData.active);

  // Background colors - match the CSS variable names
  root.style.setProperty('--bg-primary', bgData.primary);
  root.style.setProperty('--bg-secondary', bgData.secondary);
  root.style.setProperty('--bg-tertiary', bgData.tertiary);
  root.style.setProperty('--bg-elevated', bgData.elevated);
};

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeState>(getStoredTheme);

  useEffect(() => {
    applyThemeToDOM(theme.accent, theme.background);
  }, [theme]);

  const setAccent = useCallback((accent: AccentKey) => {
    setThemeState((prev) => {
      const next = { ...prev, accent };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setBackground = useCallback((background: BackgroundKey) => {
    setThemeState((prev) => {
      const next = { ...prev, background };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return {
    accent: theme.accent,
    background: theme.background,
    accentData: ACCENTS[theme.accent],
    backgroundData: BACKGROUNDS[theme.background],
    setAccent,
    setBackground,
    ACCENTS,
    BACKGROUNDS,
  };
}
