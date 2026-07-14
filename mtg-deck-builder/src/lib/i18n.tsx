import React from 'react';
import { Language, translations } from './translations';
import { safeGetItem, safeSetItem } from './safeStorage';

const LANGUAGE_KEY = 'app-language';

/** No permission prompt needed — navigator.language reflects the OS/browser
 *  locale setting, not geolocation. Used only when the user hasn't picked a
 *  language explicitly yet. */
function detectDefaultLanguage(): Language {
  const nav = typeof navigator !== 'undefined' ? navigator.language ?? '' : '';
  return nav.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

export function getLanguage(): Language {
  const stored = safeGetItem(LANGUAGE_KEY);
  return stored === 'pt' || stored === 'en' ? stored : detectDefaultLanguage();
}

export function setLanguage(lang: Language): void {
  safeSetItem(LANGUAGE_KEY, lang);
}

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Language>(() => getLanguage());

  const setLang = React.useCallback((next: Language) => {
    setLanguage(next);
    setLangState(next);
  }, []);

  return <LanguageContext.Provider value={{ lang, setLang }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

/** Returns a t(key, vars?) translator bound to the current language.
 *  Falls back to Portuguese, then to the raw key, if a key is missing —
 *  so screens not yet migrated to a given language degrade gracefully
 *  instead of rendering blank. */
export function useT() {
  const { lang } = useLanguage();
  return React.useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let text = translations[lang][key] ?? translations.pt[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          // split/join replaces every occurrence without needing replaceAll
          // (not in the current TS lib target) or regex-escaping the braces.
          text = text.split(`{{${k}}}`).join(String(v));
        }
      }
      return text;
    },
    [lang]
  );
}
