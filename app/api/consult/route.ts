/**
 * /api/consult — Claude Agent SDK 経由で Underworld の Council を実走する。
 *
 * フロー:
 *   1. Guide AI が相談を解析、関与する専門家を選ぶ
 *   2. 選ばれた専門家が並列で回答 (Engineering Expert は GitHub MCP で repo/issue/PR/code を読みに行ける)
 *   3. Synthesizer が統合 (要約 + 推奨アクション)
 *
 * フロントへは Server-Sent Events (SSE) で進捗を逐次送る。
 * mockHarness と同じイベント形 (phase / expertStatus / message / final / done) を流す。
 *
 * 認証: ローカルの Claude Code が使っているもの (OAuth or ANTHROPIC_API_KEY) を SDK が継承。
 * MCP トークン: .env.local の値を Seed の env_keys 経由で参照。
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { NextRequest } from 'next/server';
import seedJson from '@/seed/default-underworld.seed.json';
import type {
  Expert,
  ExpertCategory,
  MCPConnection,
  UnderworldSeed,
} from '@/lib/types';

// Node ランタイム必須 (SDK は Claude Code を子プロセスで起動する)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 速度優先で haiku デフォルト。品質を上げたければ 'sonnet' / 'opus' に。
const MODEL = 'haiku';

const seed = seedJson as UnderworldSeed;

// ─── MCP 設定の組み立て ─────────────────────────────────────────────
// SDK に渡す mcpServers のサブセット型 (stdio型のみ対応)
type StdioMcpServer = { command: string; args?: string[]; env?: Record<string, string> };

interface ExpertMcpConfig {
  mcpServers?: Record<string, StdioMcpServer>;
  allowedTools?: string[];
}

/**
 * Expert に紐づく MCP 設定を Seed + .env.local から組み立てる。
 * - mcp_connection_id が無い / 未対応 type → 空オブジェクト
 * - 必須 env_keys が未設定 → 警告ログを出して空オブジェクトを返す (ツールなしで起動)
 */
function buildMcpConfigForExpert(expert: Expert): ExpertMcpConfig {
  if (!expert.mcp_connection_id) return {};

  const conn = seed.mcp_connections.find(
    (c) => c.id === expert.mcp_connection_id
  ) as MCPConnection | undefined;
  if (!conn) {
    console.warn(`[mcp] expert=${expert.id}: 接続定義 "${expert.mcp_connection_id}" がSeedに無い`);
    return {};
  }
  if (conn.type !== 'stdio' || !conn.command) {
    // mock / http / sse は現状未対応 (将来拡張)
    return {};
  }

  // 必須 env を resolve
  const env: Record<string, string> = {};
  const missing: string[] = [];
  for (const k of conn.env_keys ?? []) {
    const v = process.env[k];
    if (v) env[k] = v;
    else missing.push(k);
  }
  if (missing.length > 0) {
    console.warn(
      `[mcp] expert=${expert.id} conn=${conn.id}: 環境変数未設定 (${missing.join(', ')}) → ツールなしで起動`
    );
    return {};
  }

  // SDK 上のサーバ名は接続ID末尾の "-mcp" を落とす ("github-mcp" → "github")
  const serverName = conn.id.replace(/-mcp$/, '');

  // ホワイトリスト: "mcp__<server>__<tool>" 形式に組み立て
  const allowedTools = (conn.allowed_tools ?? []).map(
    (t) => `mcp__${serverName}__${t}`
  );

  return {
    mcpServers: {
      [serverName]: {
        command: conn.command,
        args: conn.args ?? [],
        env,
      },
    },
    allowedTools,
  };
}

// SSE 1イベント書き込み
function sseEvent(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

// Claude を1回呼んでテキストだけ取り出す
async function askClaude(
  systemPrompt: string,
  userPrompt: string,
  mcp: ExpertMcpConfig = {},
  signal?: AbortSignal
): Promise<string> {
  const ac = new AbortController();
  if (signal) signal.addEventListener('abort', () => ac.abort());
  let finalText = '';
  // MCP がある時だけ allowedTools / mcpServers を渡す。無い時は素のテキスト応答。
  const hasMcp = !!mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0;
  for await (const m of query({
    prompt: userPrompt,
    options: {
      systemPrompt,
      model: MODEL,
      ...(hasMcp ? { mcpServers: mcp.mcpServers } : {}),
      // ホワイトリストで縛る。MCP無しの時は空配列で全ツール無効化
      allowedTools: hasMcp ? mcp.allowedTools ?? [] : [],
      settingSources: [],         // ローカルの CLAUDE.md など読まない
      permissionMode: 'bypassPermissions', // サーバ側で人間プロンプトを受けられないため
      abortController: ac,
    },
  })) {
    if (m.type === 'result' && m.subtype === 'success') {
      finalText = m.result;
    }
  }
  return finalText.trim();
}

interface ConsultRequest {
  topic: string;
  experts: Expert[];
}

export async function POST(req: NextRequest) {
  let body: ConsultRequest;
  try {
    body = (await req.json()) as ConsultRequest;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 });
  }
  const { topic, experts } = body;
  if (!topic || !Array.isArray(experts)) {
    return new Response(JSON.stringify({ error: 'topic and experts required' }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (payload: unknown) => sseEvent(controller, encoder, payload);
      try {
        const guide = experts.find((e) => e.id === 'guide-ai');
        const others = experts.filter((e) => e.id !== 'guide-ai');
        if (!guide) throw new Error('guide-ai が experts に居ません');

        // ===== Phase 1: Guide が解析・選定 =====
        emit({ type: 'phase', phase: 'guide_thinking' });
        emit({ type: 'expertStatus', expertId: guide.id, status: 'thinking' });

        const guideSystem = [
          `あなたは "${guide.name}"。Underworld (知識神殿) の案内人です。`,
          `性格: ${guide.persona.tone}`,
          `話し方: ${guide.persona.style}`,
          `あなたの役割は、ユーザの相談を解析し、関与すべき専門家AIを選ぶことです。`,
          `回答は2行構成で、以下の順で出力してください:`,
          `1行目: 相談内容を1〜2文で要約 + 関与すべき専門家を呼ぶことの案内 (穏やかなトーンで)`,
          `2行目: SELECTED: <expert_id1>,<expert_id2>,... の形式で、関与する専門家のIDだけを列挙`,
          ``,
          `利用可能な専門家:`,
          ...others.map((e) => `- ${e.id} (${e.name}): ${e.role}`),
        ].join('\n');

        // Guide は MCP を使わない (純粋に選定のみ)
        const guideText = await askClaude(guideSystem, topic, {}, req.signal);

        // SELECTED: 行を抽出
        const sel = guideText.match(/SELECTED:\s*([\w\-,\s]+)/i);
        let selectedIds = sel
          ? sel[1].split(',').map((s) => s.trim()).filter((id) => others.some((e) => e.id === id))
          : others.map((e) => e.id);
        if (selectedIds.length === 0) selectedIds = others.map((e) => e.id);
        const selected = others.filter((e) => selectedIds.includes(e.id));

        // Guide のメッセージは SELECTED: 行を除いた本文
        const guideMessage = guideText.replace(/SELECTED:.*$/im, '').trim();
        emit({
          type: 'message',
          message: makeMsg(guide.id, guide.name, guide.category, guideMessage),
        });
        emit({ type: 'expertStatus', expertId: guide.id, status: 'completed' });

        // ===== Phase 2: 専門家を召喚 =====
        emit({ type: 'phase', phase: 'experts_selected' });
        for (const e of selected) {
          emit({ type: 'expertStatus', expertId: e.id, status: 'selected' });
        }

        // ===== Phase 3: Council 議論 (並列で各専門家を呼ぶ) =====
        emit({ type: 'phase', phase: 'council_discussing' });
        for (const e of selected) {
          emit({ type: 'expertStatus', expertId: e.id, status: 'discussing' });
        }

        const expertResponses: { expert: Expert; text: string }[] = [];
        await Promise.all(
          selected.map(async (e) => {
            const mcp = buildMcpConfigForExpert(e);
            const hasMcp = !!mcp.mcpServers && Object.keys(mcp.mcpServers).length > 0;

            const sys = [
              `あなたは "${e.name}"。${e.role} の専門家AIです。`,
              `性格: ${e.persona.tone}`,
              `話し方: ${e.persona.style}`,
              `得意分野: ${e.capabilities.join(', ')}`,
              ...(hasMcp
                ? [
                    ``,
                    `あなたは GitHub MCP に接続されており、read-only でリポジトリ・Issue・PR・コードを参照できます。`,
                    `ユーザの相談に repo/issue/PR/code の具体名や URL が含まれる場合は、関連する情報を取得してから意見を述べてください。`,
                    `URL や repo 名が無く、調査が不要な相談 (一般的な設計議論など) では、ツールを呼ばず通常の意見だけで答えてください。`,
                  ]
                : []),
              ``,
              `ユーザの相談に対し、あなたの専門観点から具体的な意見を 2〜4文で述べてください。`,
              `他の専門家もいるので、自分の専門範囲に集中して被りを避けてください。`,
            ].join('\n');

            const text = await askClaude(sys, topic, mcp, req.signal);
            expertResponses.push({ expert: e, text });
            emit({ type: 'message', message: makeMsg(e.id, e.name, e.category, text) });
            emit({ type: 'expertStatus', expertId: e.id, status: 'completed' });
          })
        );

        // ===== Phase 4: Synthesizer 統合 =====
        emit({ type: 'phase', phase: 'synthesizing' });

        const synthSys = [
          `あなたは Underworld の Synthesizer (統合者) です。`,
          `複数の専門家の意見を、ユーザに役立つ形に統合する役割です。`,
          ``,
          `以下の形式で出力してください:`,
          `SUMMARY: <2〜3文の統合された要約>`,
          `RECOMMENDATIONS: <JSON配列で具体的アクション3つ。例: ["A をする", "B をする", "C をする"]>`,
        ].join('\n');

        const synthUser = [
          `ユーザの相談: ${topic}`,
          ``,
          `専門家の意見:`,
          ...expertResponses.map((r) => `- ${r.expert.name}: ${r.text}`),
        ].join('\n');

        // Synthesizer も MCP は使わない (統合のみ)
        const synthText = await askClaude(synthSys, synthUser, {}, req.signal);

        const summaryMatch = synthText.match(/SUMMARY:\s*([\s\S]*?)(?=\n\s*RECOMMENDATIONS:|$)/i);
        const recsMatch = synthText.match(/RECOMMENDATIONS:\s*(\[[\s\S]*?\])/i);
        const summary = (summaryMatch ? summaryMatch[1] : synthText).trim();
        let recommendations: string[] = [];
        if (recsMatch) {
          try {
            const parsed = JSON.parse(recsMatch[1]);
            if (Array.isArray(parsed)) recommendations = parsed.map((r) => String(r));
          } catch {
            // 失敗時: 文中の "- " 行を拾う簡易フォールバック
            recommendations = synthText
              .split('\n')
              .map((l) => l.replace(/^[-・*]\s*/, '').trim())
              .filter((l) => l.length > 6 && l.length < 200);
          }
        }
        if (recommendations.length === 0) recommendations = ['(推奨アクションを抽出できませんでした)'];

        emit({
          type: 'message',
          message: {
            id: `synth-${Date.now()}`,
            expertId: 'synthesizer',
            expertName: 'Synthesizer',
            category: 'synthesizer' as const,
            text: summary,
            timestamp: Date.now(),
          },
        });

        // ===== Phase 5: 完了 =====
        emit({ type: 'phase', phase: 'completed' });
        emit({
          type: 'final',
          output: {
            topic,
            summary,
            recommendations,
            participants: selected.map((e) => e.name),
          },
        });
        emit({ type: 'done' });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        emit({ type: 'error', message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function makeMsg(expertId: string, expertName: string, category: ExpertCategory, text: string) {
  return {
    id: `${expertId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expertId,
    expertName,
    category,
    text,
    timestamp: Date.now(),
  };
}
