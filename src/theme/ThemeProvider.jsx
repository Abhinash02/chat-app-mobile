import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { request } from '../api/client.js';
import { storage } from '../lib/storage.js';
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
export function ThemeProvider({ children, fontsLoaded = false }) {
  const [pushedTheme, setPushedTheme] = useState(null);

  /*
   * The colours this device last saw the server serving.
   *
   * `/theme/active` is a network round trip, and until it answers there is
   * nothing to paint but the palette compiled into the build. On every reload
   * that produced a visible flash of the bundled default before the live theme
   * replaced it. Starting from the cached copy means a reload opens on the
   * colours the app already had; the fetch then confirms them, and only a real
   * change repaints anything.
   */
  const [cachedTheme, setCachedTheme] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    storage.getCachedTheme().then((stored) => {
      if (!isCancelled && stored) setCachedTheme(stored);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['theme', 'active'],
    queryFn: () => request({ method: 'GET', url: '/theme/active' }),
    // Offline or a server outage must not block the app: the cached copy, then
    // the bundled palette, stand in — so the app looks like itself, not broken.
    retry: 1,
    staleTime: 5 * 60_000,
  });

  // Written on every successful fetch, so the next launch starts from here.
  useEffect(() => {
    if (data) storage.setCachedTheme(data).catch(() => undefined);
  }, [data]);

  /*
   * Order matters: an admin's live socket push wins, then whatever the server
   * just returned, then the last known good copy, and only then the bundle.
   */
  const theme = useMemo(
    () => normalise(pushedTheme ?? data ?? cachedTheme),
    [pushedTheme, data, cachedTheme],
  );

  const applyTheme = useCallback((next) => setPushedTheme(next), []);

  const value = useMemo(
    () => ({
      theme,
      colors: theme.colors,
      branding: theme.branding,
      isDark: theme.isDark,
      isLoaded: !isLoading,
      radius: theme.branding?.borderRadius ?? 18,
      /*
       * Display faces, for headings and brand text.
       *
       * Undefined until the files finish loading, and undefined is exactly
       * what a `fontFamily` needs to fall back to the system face — spelling
       * out a family name that is not registered yet renders nothing at all on
       * Android.
       */
      fonts: {
        display: fontsLoaded ? 'Cause-Bold' : undefined,
        displaySemi: fontsLoaded ? 'Cause-SemiBold' : undefined,
        displayRegular: fontsLoaded ? 'Cause-Regular' : undefined,
      },
      /** Called when an admin pushes a new theme over the socket. */
      applyTheme,
      reloadTheme: refetch,
    }),
    [theme, isLoading, applyTheme, refetch, fontsLoaded],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}
