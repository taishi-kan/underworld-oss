/**
 * Claude Agent SDK 経由の本物の Council ハーネス。
 * mockHarness と同じ shape のコールバック (onPhase / onExpertStatus / onMessage / onFinal)
 * を提供するので、page.tsx は import先を差し替えるだけでよい。
 *
 * 内部では /api/consult に POST し、Server-Sent Events で逐次受け取る。
 */

import type {
  CouncilMessage,
  Expert,
  ExpertStatus,
  FinalOutput,
  WorldPhase,
} from './types';

interface RunCallbacks {
  onPhase: (p: WorldPhase) => void;
  onExpertStatus: (expertId: string, status: ExpertStatus) => void;
  onMessage: (m: CouncilMessage) => void;
  onFinal: (o: FinalOutput) => void;
  onError?: (msg: string) => void;
}

let currentAbort: AbortController | null = null;

export function cancelCurrentCouncil() {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
}

export async function runCouncil(
  topic: string,
  experts: Expert[],
  cb: RunCallbacks
) {
  cancelCurrentCouncil();
  const ac = new AbortController();
  currentAbort = ac;

  let resp: Response;
  try {
    resp = await fetch('/api/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, experts }),
      signal: ac.signal,
    });
  } catch (e) {
    if (ac.signal.aborted) return; // 通常のキャンセル
    cb.onError?.(`API 呼び出し失敗: ${(e as Error).message}`);
    return;
  }

  if (!resp.ok || !resp.body) {
    cb.onError?.(`API エラー: HTTP ${resp.status}`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE: event は \n\n 区切り
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const raw of events) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const json = line.slice(5).trim();
        if (!json) continue;
        let payload: unknown;
        try { payload = JSON.parse(json); } catch { continue; }
        dispatch(payload, cb);
      }
    }
  } catch (e) {
    if (ac.signal.aborted) return;
    cb.onError?.(`ストリーム中断: ${(e as Error).message}`);
  } finally {
    if (currentAbort === ac) currentAbort = null;
  }
}

function dispatch(payload: unknown, cb: RunCallbacks) {
  if (!payload || typeof payload !== 'object') return;
  const ev = payload as { type?: string; [k: string]: unknown };
  switch (ev.type) {
    case 'phase':
      if (typeof ev.phase === 'string') cb.onPhase(ev.phase as WorldPhase);
      break;
    case 'expertStatus':
      if (typeof ev.expertId === 'string' && typeof ev.status === 'string') {
        cb.onExpertStatus(ev.expertId, ev.status as ExpertStatus);
      }
      break;
    case 'message':
      if (ev.message) cb.onMessage(ev.message as CouncilMessage);
      break;
    case 'final':
      if (ev.output) cb.onFinal(ev.output as FinalOutput);
      break;
    case 'error':
      cb.onError?.(typeof ev.message === 'string' ? ev.message : 'unknown error');
      break;
    case 'done':
      // ストリーム終了。特に何もしない (final で完了済)
      break;
  }
}
