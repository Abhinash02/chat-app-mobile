import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { request } from '../api/client.js';
import { DEFAULT_COLORS, DEFAULT_THEME } from './default-theme.js';

const ThemeContext = createContext(null);

/** Fills in anything an older build has never heard of. */
function normalise(theme) {
  if (!theme) return DEFAULT_THEME;

  return {
    ...theme,
    colors: { ...DEFAULT_COLORS, ...(theme.colors ?? {}) },
    branding: { ...DEFAULT_THEME.branding, ...(theme.branding ?? {}) },
  };
}

/**
 * The app's colours are set by an administrator at runtime, not compiled in.
 *
 * That is why colours arrive through this context and are applied with `style`
 * rather than Tailwind classes: a Tailwind class is a build-time string, and
 * these values are not known until the server answers. Tailwind still does all
 * the layout, spacing and typography — the two coexist deliberately.
 *
 * The fetch is a query rather than hand-rolled state so caching, retries and
 * the loading flag come from one place. A socket push from the admin panel
 * takes precedence over the cached copy until the next fetch confirms it.
 */
export function ThemeProvider({ children }) {
  const [pushedTheme, setPushedTheme] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['theme', 'active'],
    queryFn: () => request({ method: 'GET', url: '/theme/active' }),
    // Offline or a server outage must not block the app: the bundled palette
    // below stands in, and the app looks like the default rather than broken.
    retry: 1,
    staleTime: 5 * 60_000,
  });

  const theme = useMemo(() => normalise(pushedTheme ?? data), [pushedTheme, data]);

  const applyTheme = useCallback((next) => setPushedTheme(next), []);

  const value = useMemo(
    () => ({
      theme,
      colors: theme.colors,
      branding: theme.branding,
      isDark: theme.isDark,
      isLoaded: !isLoading,
      radius: theme.branding?.borderRadius ?? 18,
      /** Called when an admin pushes a new theme over the socket. */
      applyTheme,
      reloadTheme: refetch,
    }),
    [theme, isLoading, applyTheme, refetch],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
