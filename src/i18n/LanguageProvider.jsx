import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { storage } from '../lib/storage.js';
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguageMeta } from './languages.js';
import { TRANSLATIONS } from './translations.js';

const LanguageContext = createContext(null);

/**
 * Resolves a dotted path in an object (e.g. 'home.filters.online').
 */
function resolveKey(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [isReady, setIsReady] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await storage.getLanguage();
        if (saved && TRANSLATIONS[saved] && mounted) {
          setLanguageState(saved);
        }
      } catch {
        // Fallback to default
      } finally {
        if (mounted) setIsReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (code) => {
    if (!code || !TRANSLATIONS[code]) return;
    setLanguageState(code);
    try {
      await storage.setLanguage(code);
    } catch {
      // Ignore storage write error
    }
  }, []);

  /**
   * Main translation function: t('profile.title')
   */
  const t = useCallback(
    (path, params = {}) => {
      if (!path) return '';

      // 1. Check in current active language
      let text = resolveKey(TRANSLATIONS[language], path);

      // 2. Fallback to English if missing
      if (text === undefined && language !== 'en') {
        text = resolveKey(TRANSLATIONS.en, path);
      }

      // 3. Fallback to raw path if not found in any
      if (text === undefined) {
        return path;
      }

      // 4. Handle string replacement if params passed
      if (typeof text === 'string' && params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }

      return text;
    },
    [language],
  );

  const currentLanguageMeta = useMemo(() => getLanguageMeta(language), [language]);

  const value = useMemo(
    () => ({
      language,
      currentLanguage: currentLanguageMeta,
      availableLanguages: LANGUAGES,
      setLanguage,
      t,
      isReady,
    }),
    [language, currentLanguageMeta, setLanguage, t, isReady],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
