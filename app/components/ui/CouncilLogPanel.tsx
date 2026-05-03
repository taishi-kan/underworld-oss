'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageSquareText, Sparkles } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CouncilMessage, Expert, WorldPhase } from '@/lib/types';
import { localizeExpertName } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';

interface Props {
  messages: CouncilMessage[];
  experts: Expert[];
  phase: WorldPhase;
  topic: string | null;
}

export function CouncilLogPanel({ messages, experts, phase, topic }: Props) {
  const { lang, t } = useLang();
  const expertById = Object.fromEntries(experts.map((e) => [e.id, e]));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const placeholder =
    phase === 'idle' ? t.council_log_placeholder_idle :
    phase === 'guide_thinking' ? t.council_log_placeholder_thinking :
    phase === 'experts_selected' ? t.council_log_placeholder_selected :
    phase === 'synthesizing' ? t.council_log_placeholder_synthesizing :
    '';

  return (
    <div className="pointer-events-none w-[26rem] max-h-[calc(100vh-22rem)]">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-auto flex max-h-[calc(100vh-22rem)] flex-col rounded-lg border border-underworld-border bg-underworld-panel/70 shadow-glow backdrop-blur-md"
      >
        <div className="flex items-center gap-2 border-b border-underworld-border/40 px-4 py-3 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
          <MessageSquareText size={12} />
          <span>{t.council_log_title}</span>
          {topic && (
            <span className="ml-auto truncate text-[10px] normal-case tracking-normal text-underworld-mist">
              {t.council_log_topic_prefix} {topic.length > 20 ? topic.slice(0, 20) + '…' : topic}
            </span>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && placeholder && (
            <p className="text-xs text-underworld-mist">{placeholder}</p>
          )}

          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const isSynth = m.category === 'synthesizer';
                const expert = expertById[m.expertId];
                const color = isSynth ? '#cfe9ff' : expert?.avatar.color ?? '#9bdcff';
                return (
                  <motion.li
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="rounded-md border border-underworld-border/40 bg-black/30 p-3"
                    style={{ boxShadow: `inset 0 0 18px ${color}18` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: color, boxShadow: `0 0 10px ${color}` }}
                      />
                      <span
                        className="font-display text-xs uppercase tracking-[0.3em]"
                        style={{ color }}
                      >
                        {isSynth ? m.expertName : localizeExpertName(m.expertId, lang, m.expertName)}
                      </span>
                      {isSynth && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-underworld-border/60 bg-black/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-underworld-mist">
                          <Sparkles size={9} />
                          synthesis
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-underworld-rune/95">
                      {m.text}
                    </p>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {phase === 'synthesizing' && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-underworld-glow">
              <span className="inline-block h-1.5 w-1.5 animate-pulseGlow rounded-full bg-underworld-glow" />
              {t.council_log_synthesizing_loading}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
