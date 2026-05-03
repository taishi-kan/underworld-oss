'use client';

import { motion } from 'framer-motion';
import {
  BookText,
  Code2,
  Compass,
  LucideIcon,
  PaintBucket,
  Target,
} from 'lucide-react';
import { Expert, ExpertStatus } from '@/lib/types';
import { localizeExpertName, statusLabel } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';

interface Props {
  experts: Expert[];
  statuses: Record<string, ExpertStatus>;
  selectedIds: string[];
}

const ICON: Record<string, LucideIcon> = {
  guide: Compass,
  marketing: Target,
  copywriting: BookText,
  design: PaintBucket,
  engineering: Code2,
};

export function ExpertListPanel({ experts, statuses, selectedIds }: Props) {
  const { lang, t } = useLang();
  return (
    <div className="pointer-events-none w-72">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="pointer-events-auto rounded-lg border border-underworld-border bg-underworld-panel/70 px-4 py-4 shadow-glow backdrop-blur-md"
      >
        <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
          <Compass size={12} />
          <span>{t.expert_list_title}</span>
        </div>
        <ul className="flex flex-col gap-2">
          {experts.map((e) => {
            const Icon = ICON[e.category] ?? Compass;
            const status = statuses[e.id] ?? 'available';
            const selected = selectedIds.includes(e.id);
            const dotColor =
              status === 'discussing'
                ? 'bg-cyan-200 animate-pulseGlow'
                : status === 'thinking'
                ? 'bg-cyan-300 animate-pulseGlow'
                : status === 'selected'
                ? 'bg-cyan-400 animate-pulseGlow'
                : status === 'completed'
                ? 'bg-emerald-300'
                : 'bg-underworld-mist/60';

            return (
              <li
                key={e.id}
                className={`group rounded-md border px-3 py-2 transition-all ${
                  selected
                    ? 'border-underworld-glow/70 bg-underworld-glow/10 shadow-glow'
                    : 'border-underworld-border/50 bg-black/20 hover:border-underworld-border'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full border"
                    style={{
                      borderColor: e.avatar.color,
                      boxShadow: `0 0 12px ${e.avatar.color}55`,
                      color: e.avatar.color,
                    }}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-sm text-underworld-rune">
                        {localizeExpertName(e.id, lang, e.name)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-underworld-mist">
                      {e.role}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                      <span className="text-[10px] uppercase tracking-[0.2em] text-underworld-mist">
                        {statusLabel(status, lang)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </motion.div>
    </div>
  );
}
