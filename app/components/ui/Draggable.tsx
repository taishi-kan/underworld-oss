'use client';

import { GripVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// 数値か (vw, vh) を受けて px を返す関数
type PosValue = number | ((vw: number, vh: number) => number);

interface Props {
  /** 識別子 (将来的に localStorage 保存に使う場合の鍵) */
  id?: string;
  /** 初期 left (px) または (vw, vh) => px の関数 */
  defaultX: PosValue;
  /** 初期 top (px) または (vw, vh) => px の関数 */
  defaultY: PosValue;
  zIndex?: number;
  /** ハンドルを置く位置 (default: top-right) */
  handleAt?: 'tl' | 'tr' | 'bl' | 'br';
  children: React.ReactNode;
}

function resolve(v: PosValue, vw: number, vh: number): number {
  return typeof v === 'function' ? v(vw, vh) : v;
}

export function Draggable({
  defaultX, defaultY, zIndex = 20, handleAt = 'tr', children,
}: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // マウント後に viewport を見て初期位置を解決 (SSR で window が無いので)
  useEffect(() => {
    const compute = () => ({
      x: resolve(defaultX, window.innerWidth, window.innerHeight),
      y: resolve(defaultY, window.innerWidth, window.innerHeight),
    });
    setPos(compute());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // window 全体で drag を捕捉 (パネル外に出ても追従させる)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPos({
        x: d.origX + e.clientX - d.startX,
        y: d.origY + e.clientY - d.startY,
      });
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // カードのどこをクリックしてもドラッグ開始。input/textarea/button/a/select は除外して通常通り動作させる
  const onPaneDown = (e: React.MouseEvent) => {
    if (!pos) return;
    if (e.button !== 0) return; // 左クリックのみ
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-drag]')) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  if (!pos) return null;

  // ハンドル配置 (視覚的指針として残す)
  const handlePos = {
    tl: 'left-1 top-1',
    tr: 'right-1 top-1',
    bl: 'left-1 bottom-1',
    br: 'right-1 bottom-1',
  }[handleAt];

  return (
    <div
      style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex }}
      className="pointer-events-none"
      onMouseDown={onPaneDown}
    >
      {children}
      {/* 視覚指針としての drag handle (カード本体もドラッグ可だが、ここを掴んでもOK) */}
      <button
        aria-label="drag panel"
        title="ドラッグで移動 (カードのどこを掴んでも可)"
        className={
          'pointer-events-auto absolute z-10 flex h-5 w-5 cursor-grab items-center justify-center rounded-md ' +
          'border border-underworld-border bg-underworld-panel text-underworld-glow ' +
          'backdrop-blur transition hover:border-underworld-glow active:cursor-grabbing ' +
          handlePos
        }
      >
        <GripVertical size={11} />
      </button>
    </div>
  );
}
