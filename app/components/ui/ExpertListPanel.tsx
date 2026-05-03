'use client';

import { motion } from 'framer-motion';
import {
  BookText,
  Code2,
  Compass,
  LucideIcon,
  PaintBucket,
  Plug,
  Target,
  TestTube2,
} from 'lucide-react';
import { Expert, ExpertStatus, MCPConnection } from '@/lib/types';
import { localizeExpertName, statusLabel } from '@/lib/i18n';
import { useLang } from '@/lib/lang-context';

interface Props {
  experts: Expert[];
  statuses: Record<string, ExpertStatus>;
  selectedIds: string[];
  /** Seedの mcp_connections。Expert カードに繋がっているMCPバッジを描くのに使う */
  mcpConnections: MCPConnection[];
}

const ICON: Record<string, LucideIcon> = {
  guide: Compass,
  marketing: Target,
  copywriting: BookText,
  design: PaintBucket,
  engineering: Code2,
};

/** Expert.mcp_connection_ids (新) と mcp_connection_id (旧, 単数) を統合して返す */
function resolveExpertMcpIds(e: Expert): string[] {
  if (e.mcp_connection_ids && e.mcp_connection_ids.length > 0) return e.mcp_connection_ids;
  if (e.mcp_connection_id) return [e.mcp_connection_id];
  return [];
}

export function ExpertListPanel({ experts, statuses, selectedIds, mcpConnections }: Props) {
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

            // 接続中の MCP を解決
            const ids = resolveExpertMcpIds(e);
            const connectedConns = ids
              .map((id) => mcpConnections.find((c) => c.id === id))
              .filter((c): c is MCPConnection => !!c);
            const isSampleOnly = connectedConns.length === 0;
            // Guide AI は "Expert選定の役" なので MCP 不要、サンプル扱いから除外
            const showSampleBadge = isSampleOnly && e.category !== 'guide';

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
                    {/* MCP 接続バッジ (or サンプル印) */}
                    {(connectedConns.length > 0 || showSampleBadge) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {connectedConns.map((c) => (
                          <span
                            key={c.id}
                            title={c.name}
                            className="inline-flex items-center gap-1 rounded border border-cyan-300/40 bg-cyan-400/10 px-1.5 py-[2px] text-[9px] uppercase tracking-wider text-cyan-200"
                          >
                            <Plug size={9} className="opacity-80" />
                            {c.id.replace(/-mcp$/, '')}
                          </span>
                        ))}
                        {showSampleBadge && (
                          <span
                            title="MCP 未接続のサンプル / sample without MCP"
                            className="inline-flex items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-1.5 py-[2px] text-[9px] uppercase tracking-wider text-amber-300/90"
                          >
                            <TestTube2 size={9} className="opacity-80" />
                            {t.expert_badge_sample}
                          </span>
                        )}
                      </div>
                    )}
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
