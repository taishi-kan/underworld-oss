'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { FinalOutput } from '@/lib/types';
import { useLang } from '@/lib/lang-context';

interface Props {
  output: FinalOutput | null;
  onClose: () => void;
}

export function FinalOutputPanel({ output, onClose }: Props) {
  const { t } = useLang();
  return (
    <AnimatePresence>
      {output && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.5 }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-underworld-glow/40 bg-underworld-panel/90 p-7 shadow-glow-strong backdrop-blur-xl"
            style={{
              backgroundImage:
                'radial-gradient(ellipse at top, rgba(127,220,255,0.18), transparent 60%)',
            }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-underworld-glow to-transparent" />

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/90">
              <Sparkles size={12} />
              <span>{t.final_title}</span>
              <span className="ml-auto text-[10px] normal-case tracking-normal text-underworld-mist">
                {output.participants.length}{t.nexus_experts_unit}
              </span>
            </div>

            <h2 className="mt-3 font-display text-2xl text-underworld-rune">
              {output.topic}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-underworld-rune/95">
              {output.summary}
            </p>

            <div className="mt-5">
              <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-underworld-glow/80">
                {t.final_recommendations}
              </div>
              <ul className="flex flex-col gap-2">
                {output.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-md border border-underworld-border/50 bg-black/30 px-3 py-2"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 flex-none text-underworld-glow"
                    />
                    <span className="text-sm text-underworld-rune/95">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-underworld-border/40 pt-4">
              <span className="text-[10px] uppercase tracking-[0.3em] text-underworld-mist">
                {t.final_participants}
              </span>
              {output.participants.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-underworld-border/60 bg-black/30 px-2.5 py-0.5 text-[11px] text-underworld-rune"
                >
                  {p}
                </span>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-md border border-underworld-glow/60 bg-underworld-glow/15 px-5 py-2 text-xs uppercase tracking-[0.25em] text-underworld-rune transition hover:bg-underworld-glow/25"
              >
                {t.final_close}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
