'use client';

import { Languages } from 'lucide-react';
import { LANGS } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';

/**
 * 言語切替 UI。Headerに置くか、独立した overlay として右上に置く想定。
 * 現在の言語ボタンをハイライト、タップで切替。
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={
        'pointer-events-auto inline-flex items-center gap-1 rounded-md border border-underworld-border bg-underworld-panel/70 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-underworld-glow/80 backdrop-blur ' +
        (className ?? '')
      }
    >
      <Languages size={12} className="opacity-60" />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={
            'rounded px-2 py-[2px] text-[10px] uppercase tracking-[0.3em] transition ' +
            (l.code === lang
              ? 'bg-underworld-glow/20 text-underworld-rune'
              : 'text-underworld-glow/60 hover:text-underworld-glow')
          }
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}
