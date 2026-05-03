'use client';

import { motion } from 'framer-motion';
import { Globe2 } from 'lucide-react';
import { LinkedWorld } from '@/lib/types';
import { localizeWorldName } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';

interface Props {
  linkedWorlds: LinkedWorld[];
}

export function NexusGatePanel({ linkedWorlds }: Props) {
  const { lang, t } = useLang();
  return (
    <div className="pointer-events-none w-72">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="pointer-events-auto rounded-lg border border-underworld-border bg-underworld-panel/70 px-4 py-3 shadow-glow backdrop-blur-md"
      >
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
          <Globe2 size={12} />
          <span>{t.nexus_panel_title}</span>
          <span className="ml-auto text-[10px] normal-case tracking-normal text-underworld-mist">
            v0.2
          </span>
        </div>
        <p className="mb-2 text-[10px] text-underworld-mist">{t.nexus_panel_subtitle}</p>
        <ul className="flex flex-col gap-1.5">
          {linkedWorlds.map((w) => (
            <li
              key={w.id}
              className="flex items-center gap-2 rounded-md border border-underworld-border/40 bg-black/20 px-2.5 py-1.5"
            >
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: w.color, boxShadow: `0 0 10px ${w.color}` }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-underworld-rune">
                  {localizeWorldName(w.id, lang, w.name)}
                </div>
                <div className="text-[10px] text-underworld-mist">
                  {w.available_experts}{t.nexus_experts_unit} · {w.trust_level}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
