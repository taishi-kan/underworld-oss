'use client';

import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { WorldPhase } from '@/lib/types';
import { useLang } from '@/lib/lang-context';

interface Props {
  phase: WorldPhase;
  onSubmit: (text: string) => void;
  onReset: () => void;
}

const SUGGESTIONS_BY_LANG: Record<'ja' | 'en', string[]> = {
  ja: [
    'このLPのファーストビューを改善したい',
    '新規プロダクトの一文コピーを決めたい',
    'モバイルでCTAが押されない原因を知りたい',
  ],
  en: [
    'Improve the hero section of this landing page',
    'Find a one-line copy for a new product',
    'Why is the CTA not converting on mobile?',
  ],
};

export function ConsultationInput({ phase, onSubmit, onReset }: Props) {
  const { lang, t } = useLang();
  const SUGGESTIONS = SUGGESTIONS_BY_LANG[lang];
  const [text, setText] = useState('');
  const isBusy =
    phase === 'guide_thinking' ||
    phase === 'experts_selected' ||
    phase === 'council_discussing' ||
    phase === 'synthesizing';
  const isCompleted = phase === 'completed';

  const handle = (e: FormEvent) => {
    e.preventDefault();
    const v = text.trim();
    if (!v || isBusy) return;
    onSubmit(v);
    setText('');
  };

  return (
    <div className="pointer-events-none w-[48rem] max-w-[calc(100vw-3rem)]">
      <motion.form
        onSubmit={handle}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-auto rounded-2xl border border-underworld-border bg-underworld-panel/80 px-5 py-4 shadow-glow-strong backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
          <Sparkles size={12} />
          <span>{t.consult_title}</span>
        </div>

        <div className="mt-3 flex items-end gap-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isBusy}
            placeholder={isBusy ? t.consult_placeholder_busy : t.consult_placeholder_idle}
            rows={2}
            className="min-h-[3rem] flex-1 resize-none bg-transparent text-sm text-underworld-rune placeholder-underworld-mist/50 outline-none disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handle(e);
              }
            }}
          />
          {isCompleted ? (
            <button
              type="button"
              onClick={onReset}
              className="flex h-11 items-center gap-2 rounded-lg border border-underworld-border bg-black/30 px-4 text-xs uppercase tracking-[0.25em] text-underworld-rune transition hover:bg-underworld-glow/10"
            >
              {t.consult_reset}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isBusy || !text.trim()}
              className="flex h-11 items-center gap-2 rounded-lg border border-underworld-glow/60 bg-underworld-glow/15 px-4 text-xs uppercase tracking-[0.25em] text-underworld-rune shadow-glow transition hover:bg-underworld-glow/25 disabled:opacity-40"
            >
              <Send size={14} />
              <span>{t.consult_submit}</span>
            </button>
          )}
        </div>

        {phase === 'idle' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setText(s)}
                className="rounded-full border border-underworld-border/60 bg-black/30 px-3 py-1 text-[11px] text-underworld-mist transition hover:border-underworld-glow/60 hover:text-underworld-rune"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.form>
    </div>
  );
}
