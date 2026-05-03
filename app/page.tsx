'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';
import seedJson from '@/seed/default-underworld.seed.json';
import {
  cancelCurrentCouncil,
  runCouncil,
} from '@/lib/claudeHarness';
import {
  CouncilMessage,
  Expert,
  ExpertStatus,
  FinalOutput,
  UnderworldSeed,
  WorldPhase,
} from '@/lib/types';
import { Header } from './components/ui/Header';
import { ExpertListPanel } from './components/ui/ExpertListPanel';
import { CouncilLogPanel } from './components/ui/CouncilLogPanel';
import { ConsultationInput } from './components/ui/ConsultationInput';
import { FinalOutputPanel } from './components/ui/FinalOutputPanel';
import { NexusGatePanel } from './components/ui/NexusGatePanel';
import { Draggable } from './components/ui/Draggable';
import { useLang } from '@/lib/lang-context';

// Phaser は SSR できないので動的インポート (PR1で 3D R3F → 2Dドット絵 Phaser にピボット)
const PhaserWorld = dynamic(
  () => import('./components/world2d/PhaserWorld').then((m) => m.PhaserWorld),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.4em] text-underworld-glow/70">
        materializing underworld…
      </div>
    ),
  }
);

const seed = seedJson as UnderworldSeed;

export default function Page() {
  const { lang } = useLang();
  const experts: Expert[] = seed.experts;

  const initialStatuses = useMemo<Record<string, ExpertStatus>>(() => {
    const m: Record<string, ExpertStatus> = {};
    experts.forEach((e) => {
      m[e.id] = 'available';
    });
    return m;
  }, [experts]);

  const [phase, setPhase] = useState<WorldPhase>('idle');
  const [statuses, setStatuses] =
    useState<Record<string, ExpertStatus>>(initialStatuses);
  const [topic, setTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [finalOutput, setFinalOutput] = useState<FinalOutput | null>(null);

  const guideId = 'guide-ai';
  const specialists = experts.filter((e) => e.id !== guideId);
  const selectedIds =
    phase === 'idle'
      ? []
      : phase === 'guide_thinking'
      ? [guideId]
      : specialists.map((e) => e.id);

  const handleSubmit = useCallback(
    (text: string) => {
      // reset
      cancelCurrentCouncil();
      setMessages([]);
      setFinalOutput(null);
      setTopic(text);

      // Guide AI を thinking に
      setStatuses({
        ...initialStatuses,
        [guideId]: 'thinking',
      });

      runCouncil(text, experts, {
        onPhase: (p) => {
          setPhase(p);
          if (p === 'experts_selected') {
            setStatuses((prev) => {
              const next: Record<string, ExpertStatus> = { ...prev };
              next[guideId] = 'completed';
              specialists.forEach((e) => {
                next[e.id] = 'selected';
              });
              return next;
            });
          }
        },
        onExpertStatus: (expertId, status) => {
          setStatuses((prev) => ({ ...prev, [expertId]: status }));
        },
        onMessage: (m) => {
          setMessages((prev) => [...prev, m]);
        },
        onFinal: (o) => {
          setFinalOutput(o);
        },
      });
    },
    [experts, specialists, initialStatuses]
  );

  const handleReset = useCallback(() => {
    cancelCurrentCouncil();
    setPhase('idle');
    setStatuses(initialStatuses);
    setTopic(null);
    setMessages([]);
    setFinalOutput(null);
  }, [initialStatuses]);

  const activeExperts = Object.values(statuses).filter(
    (s) => s !== 'offline' && s !== 'available'
  ).length;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-underworld-bg">
      {/* 2Dドット絵 World View (背景) */}
      <div className="absolute inset-0 z-0">
        <PhaserWorld
          experts={experts}
          expertStatuses={statuses}
          phase={phase}
          linkedWorlds={seed.nexus_gate.linked_worlds}
          lang={lang}
        />
      </div>

      {/* グラデーションオーバーレイ */}
      <div className="vignette" />
      <div className="top-fade" />
      <div className="bottom-fade" />

      {/* UI Overlay */}
      <Header
        world={seed.world}
        phase={phase}
        activeExperts={activeExperts}
        connectedMcp={seed.mcp_connections.length}
        nexusLinks={seed.nexus_gate.linked_worlds.length}
      />

      {/* 配置: 左上=ExpertList, 左下=NexusGate, 右上=CouncilLog, 下中央=Consult。重ならないように初期分散 */}
      <Draggable defaultX={24} defaultY={130} zIndex={20}>
        <ExpertListPanel
          experts={experts}
          statuses={statuses}
          selectedIds={selectedIds}
          mcpConnections={seed.mcp_connections}
        />
      </Draggable>

      <Draggable defaultX={(vw) => vw - 440} defaultY={130} zIndex={20}>
        <CouncilLogPanel
          messages={messages}
          experts={experts}
          phase={phase}
          topic={topic}
        />
      </Draggable>

      <Draggable defaultX={24} defaultY={(_vw, vh) => Math.max(540, vh - 320)} zIndex={20}>
        <NexusGatePanel linkedWorlds={seed.nexus_gate.linked_worlds} />
      </Draggable>

      <Draggable defaultX={(vw) => vw / 2 - 384} defaultY={(_vw, vh) => vh - 130} zIndex={30} handleAt="tl">
        <ConsultationInput
          phase={phase}
          onSubmit={handleSubmit}
          onReset={handleReset}
        />
      </Draggable>

      <FinalOutputPanel
        output={finalOutput}
        onClose={() => setFinalOutput(null)}
      />
    </main>
  );
}
