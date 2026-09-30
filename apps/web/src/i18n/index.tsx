import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { zh } from './zh';
import { storage } from '../lib/storage';

export type Lang = 'en' | 'zh';

const LANG_KEY = 'take6.lang';

function detect(): Lang {
  if (typeof window === 'undefined') return 'en';
  if (window.location.pathname.startsWith('/zh-tw')) return 'zh';
  const saved = storage.get<Lang | ''>(LANG_KEY, '');
  if (saved === 'en' || saved === 'zh') return saved;
  const nav = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  return /^zh-(tw|hk|mo|hant)/.test(nav) || nav === 'zh-hant' ? 'zh' : 'en';
}

type Vars = Record<string, string | number>;
type T = (text: string, vars?: Vars) => string;

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: T;
}

const LangContext = createContext<LangContextValue | null>(null);

const fill = (text: string, vars?: Vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : text;

/**
 * Strings are keyed by their English text, so untranslated strings fall back to
 * English and components stay readable. Placeholders use {name}.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    storage.set(LANG_KEY, next);
    setLangState(next);
  }, []);

  const t = useCallback<T>((text, vars) => fill(lang === 'zh' ? zh[text] ?? text : text, vars), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}

export const useT = () => useLang().t;
