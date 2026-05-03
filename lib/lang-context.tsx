'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang, Strings } from './i18n';
import { STRINGS } from './i18n';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Strings;
}

const Ctx = createContext<LangCtx>({
  lang: 'ja',
  setLang: () => {},
  t: STRINGS.ja,
});

const STORAGE_KEY = 'underworld_lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ja');

  // マウント時に localStorage から復元
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'ja' || stored === 'en') {
      setLangState(stored);
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l);
    }
  };

  const value = useMemo<LangCtx>(() => ({
    lang,
    setLang,
    t: STRINGS[lang],
  }), [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  return useContext(Ctx);
}
