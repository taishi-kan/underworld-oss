'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Expert, ExpertStatus, LinkedWorld, WorldPhase } from '@/lib/types';
import { EXPERT_NAMES, WORLD_NAMES, type Lang } from '@/lib/i18n';

interface Props {
  experts: Expert[];
  expertStatuses: Record<string, ExpertStatus>;
  phase: WorldPhase;
  linkedWorlds: LinkedWorld[];
  lang: Lang;
}

export function PhaserWorld({ experts, expertStatuses, phase, linkedWorlds, lang }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // gameRef は any に近い型 (Phaser を動的importする都合)
  const gameRef = useRef<unknown>(null);
  const readyRef = useRef(false);

  // 言語別の表示名マップ (i18n 由来)
  const localizedExpertNames = useMemo(() => EXPERT_NAMES[lang], [lang]);
  const localizedWorldNames = useMemo(() => WORLD_NAMES[lang], [lang]);

  // 初期化前に届いた最新propsを保持
  const initialDataRef = useRef({ experts, expertStatuses, phase, linkedWorlds, localizedExpertNames, localizedWorldNames });
  initialDataRef.current = { experts, expertStatuses, phase, linkedWorlds, localizedExpertNames, localizedWorldNames };

  // Phaser ゲームのライフサイクル管理
  useEffect(() => {
    let canceled = false;

    (async () => {
      const Phaser = (await import('phaser')).default;
      const { UnderworldScene, LOGICAL_W, LOGICAL_H } = await import('./scenes/UnderworldScene');

      // text を canvas 描画する前にフォントが落ちてくるのを待つ (落ちてないとシステムフォントで描かれる)
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        try { await document.fonts.ready; } catch { /* 失敗してもPhaser起動は続行 */ }
      }

      if (canceled || !containerRef.current) return;

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: LOGICAL_W,
        height: LOGICAL_H,
        backgroundColor: '#02040a',
        // pixelArt: true は text もNEAREST化してボヤけるので使わない。
        // sprite/tile 側で個別に NEAREST 設定し、text は smoothで読みやすく。
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [UnderworldScene],
      });

      // シーン作成より前にデータを registry に流し込む
      game.registry.set('experts', initialDataRef.current.experts);
      game.registry.set('statuses', initialDataRef.current.expertStatuses);
      game.registry.set('phase', initialDataRef.current.phase);
      game.registry.set('linkedWorlds', initialDataRef.current.linkedWorlds);
      game.registry.set('localizedExpertNames', initialDataRef.current.localizedExpertNames);
      game.registry.set('localizedWorldNames', initialDataRef.current.localizedWorldNames);

      gameRef.current = game;
      readyRef.current = true;
    })();

    return () => {
      canceled = true;
      const game = gameRef.current as { destroy?: (removeCanvas: boolean) => void } | null;
      if (game?.destroy) game.destroy(true);
      gameRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // status / phase の変化を registry 経由で Phaser に伝える
  useEffect(() => {
    if (!readyRef.current) return;
    const game = gameRef.current as { registry?: { set: (k: string, v: unknown) => void } } | null;
    game?.registry?.set('statuses', expertStatuses);
    game?.registry?.set('phase', phase);
  }, [expertStatuses, phase]);

  // 言語切替を Phaser に伝える (シーン側でラベルを再生成する)
  useEffect(() => {
    if (!readyRef.current) return;
    const game = gameRef.current as { registry?: { set: (k: string, v: unknown) => void } } | null;
    game?.registry?.set('localizedExpertNames', localizedExpertNames);
    game?.registry?.set('localizedWorldNames', localizedWorldNames);
  }, [localizedExpertNames, localizedWorldNames]);

  const issueCmd = (type: 'zoom_in' | 'zoom_out' | 'reset') => {
    const game = gameRef.current as { registry?: { set: (k: string, v: unknown) => void } } | null;
    // ts を変えて registry の更新イベントを必ず発火させる
    game?.registry?.set('camera_command', { type, ts: Date.now() });
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {/* ズーム/リセット コントロール (右下) */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1">
        <CtlButton onClick={() => issueCmd('zoom_in')} aria-label="zoom in">+</CtlButton>
        <CtlButton onClick={() => issueCmd('zoom_out')} aria-label="zoom out">−</CtlButton>
        <CtlButton onClick={() => issueCmd('reset')} aria-label="reset view" title="reset (R)">⊙</CtlButton>
      </div>
    </div>
  );
}

function CtlButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={
        'flex h-9 w-9 items-center justify-center rounded-md ' +
        'border border-underworld-border bg-underworld-panel ' +
        'text-base text-underworld-glow backdrop-blur ' +
        'transition hover:border-underworld-glow hover:text-underworld-rune ' +
        'active:scale-95 ' +
        (className ?? '')
      }
    />
  );
}
