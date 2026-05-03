'use client';

import { Activity, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import { World, WorldPhase } from '@/lib/types';
import { phaseLabel } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';
import { LanguageSwitcher } from './LanguageSwitcher';

interface Props {
  world: World;
  phase: WorldPhase;
  activeExperts: number;
  connectedMcp: number;
  nexusLinks: number;
}

const PHASE_DOT: Record<WorldPhase, string> = {
  idle: 'bg-underworld-mist',
  guide_thinking: 'bg-cyan-300 animate-pulseGlow',
  experts_selected: 'bg-cyan-200 animate-pulseGlow',
  council_discussing: 'bg-cyan-100 animate-pulseGlow',
  synthesizing: 'bg-violet-200 animate-pulseGlow',
  completed: 'bg-emerald-200',
};

export function Header({ world, phase, activeExperts, connectedMcp, nexusLinks }: Props) {
  const { lang, t } = useLang();
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-30 px-6 py-4">
      <div className="pointer-events-auto flex items-start justify-between gap-4">
        {/* 左: World Identity */}
        <div className="rounded-lg border border-underworld-border bg-underworld-panel/70 px-5 py-3 shadow-glow backdrop-blur-md">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
            <Sparkles size={12} />
            <span>underworld</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold text-underworld-rune">
            {world.name}
          </h1>
          <p className="mt-1 text-xs text-underworld-mist">{world.description}</p>
        </div>

        {/* 右: World Status + 言語切替 */}
        <div className="flex flex-col items-end gap-2">
          <LanguageSwitcher />
          <div className="rounded-lg border border-underworld-border bg-underworld-panel/70 px-5 py-3 shadow-glow backdrop-blur-md">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-underworld-glow/80">
              <Activity size={12} />
              <span>{t.header_phase_label}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full shadow-glow ${PHASE_DOT[phase]}`}
              />
              <span className="font-display text-sm tracking-[0.25em] text-underworld-rune">
                {phaseLabel(phase, lang)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1 text-[11px] text-underworld-mist">
              <div className="flex items-center gap-1">
                <Sparkles size={11} className="text-underworld-glow" />
                <span>{t.header_active_experts}</span>
                <span className="ml-auto text-underworld-rune">{activeExperts}</span>
              </div>
              <div className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-underworld-glow" />
                <span>{t.header_mcp}</span>
                <span className="ml-auto text-underworld-rune">{connectedMcp}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe2 size={11} className="text-underworld-glow" />
                <span>{t.header_nexus}</span>
                <span className="ml-auto text-underworld-rune">{nexusLinks}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
