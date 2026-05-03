import {
  CouncilMessage,
  Expert,
  ExpertCategory,
  FinalOutput,
  WorldPhase,
} from './types';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────
// Intent Router (簡易ルールベース)
// ─────────────────────────────────────────────
type Intent = {
  weights: Record<ExpertCategory, number>;
  topicKind: 'lp' | 'product' | 'code' | 'design' | 'general';
};

const KEYWORDS: Record<ExpertCategory, RegExp[]> = {
  guide: [/.*/],
  marketing: [/マーケ|広告|集客|訴求|cv|ファネル|戦略|オファー|ターゲット/i],
  copywriting: [/コピー|見出し|キャッチ|cta|文章|ライティング|文言|lp|ランディング/i],
  design: [/デザイン|ui|ux|配色|レイアウト|視線|画像|ビジュアル|フォント/i],
  engineering: [/実装|コード|api|システム|パフォーマンス|表示速度|バグ|モバイル|next|react/i],
};

const TOPIC_KIND_PATTERNS: Array<{ kind: Intent['topicKind']; re: RegExp }> = [
  { kind: 'lp', re: /lp|ランディング|ファーストビュー|fv/i },
  { kind: 'code', re: /実装|コード|api|システム|バグ|next|react/i },
  { kind: 'design', re: /デザイン|ui|ux|配色|レイアウト/i },
  { kind: 'product', re: /プロダクト|機能|サービス|アプリ|事業/i },
];

export function routeIntent(input: string): Intent {
  const weights: Record<ExpertCategory, number> = {
    guide: 0,
    marketing: 0.5,
    copywriting: 0.5,
    design: 0.5,
    engineering: 0.5,
  };

  (Object.keys(KEYWORDS) as ExpertCategory[]).forEach((cat) => {
    if (cat === 'guide') return;
    for (const re of KEYWORDS[cat]) {
      if (re.test(input)) weights[cat] += 1;
    }
  });

  let topicKind: Intent['topicKind'] = 'general';
  for (const p of TOPIC_KIND_PATTERNS) {
    if (p.re.test(input)) {
      topicKind = p.kind;
      break;
    }
  }

  return { weights, topicKind };
}

// ─────────────────────────────────────────────
// Expert Selector
// MVPでは「全員参加 + 重みで発言順を変える」方針
// ─────────────────────────────────────────────
export function selectExperts(
  experts: Expert[],
  intent: Intent
): Expert[] {
  const specialists = experts.filter((e) => e.category !== 'guide');
  return [...specialists].sort(
    (a, b) =>
      (intent.weights[b.category] ?? 0) - (intent.weights[a.category] ?? 0)
  );
}

// ─────────────────────────────────────────────
// Council Engine: 各Expertの発言テンプレ
// ─────────────────────────────────────────────
type Speech = (topic: string, kind: Intent['topicKind']) => string;

const SPEECHES: Record<ExpertCategory, Speech> = {
  guide: () => '',
  marketing: (topic, kind) => {
    if (kind === 'lp')
      return `「${topic}」について、まずターゲットと訴求のズレを確認する必要があります。誰に何を約束するページなのかを言語化し、訴求軸を1つに絞り込みましょう。`;
    if (kind === 'code')
      return `「${topic}」を実装する前に、誰のどの行動を変えるための機能なのかを定義したいです。指標 (KPI) と離脱ポイントを先に置きましょう。`;
    if (kind === 'design')
      return `「${topic}」のビジュアル判断は、その先のユーザー行動から逆算すべきです。最初に「見た人にどう動いてほしいか」を合意しましょう。`;
    if (kind === 'product')
      return `「${topic}」では、解くべき痛みと、誰がいま我慢しているかを最初に定義します。市場の中でのポジションも併せて考えましょう。`;
    return `「${topic}」の核は、誰のどの行動を変えるかです。対象と目的を明確にしてから施策を組みましょう。`;
  },
  copywriting: (topic, kind) => {
    if (kind === 'lp')
      return `ファーストビューの見出しに「読者が得られる変化」が不足している可能性が高いです。動詞 + 数字 + 期間で言い切る形にし、サブコピーで証拠を一行添えましょう。`;
    if (kind === 'code')
      return `「${topic}」をユーザーが触るときの一行目の言葉を決めると、画面の説明量がぐっと減ります。エラーや空状態の文言も併せて書き起こしておきたいです。`;
    if (kind === 'design')
      return `デザインに先行して、見出し・サブコピー・CTAの3つの言葉を確定させたいです。言葉が決まれば、配置と余白が自然に決まります。`;
    if (kind === 'product')
      return `「${topic}」を一文で説明する1stコピーを作りましょう。「これは ___ のための ___ です」のフォーマットで言い切れることが目標です。`;
    return `「${topic}」を読者の言葉で言い直すところから始めましょう。一文で価値を言い切れるかを基準にします。`;
  },
  design: (topic, kind) => {
    if (kind === 'lp')
      return `視線誘導とCTAの位置を見直すと効きます。重要コピー → 実績 → CTAが縦に一直線で繋がるよう再配置し、CTA周辺は十分な余白で囲みましょう。`;
    if (kind === 'code')
      return `「${topic}」の操作面では、状態 (idle / loading / error / success) ごとに見え方を最初に決めておくと、後の手戻りが消えます。`;
    if (kind === 'design')
      return `「${topic}」の決定軸は、色数 ≤ 3、コントラスト比、視線の流れ (Z型 / F型) の3つに絞るのが良いです。装飾は最後に足します。`;
    if (kind === 'product')
      return `「${topic}」の世界観を支える1枚 (ヒーロー / プロダクトショット) を最初に決めると、以降の判断が早くなります。`;
    return `「${topic}」では、最重要メッセージに視線を集めるための「余白」と「対比」を意識して再配置しましょう。`;
  },
  engineering: (topic, kind) => {
    if (kind === 'lp')
      return `実装面では、表示速度 (LCP)、レイアウトずれ (CLS)、モバイルでのCTA固定表示を確認すべきです。画像は次世代フォーマット + 遅延読み込みで整えましょう。`;
    if (kind === 'code')
      return `「${topic}」については、責務分離とエラー境界、外部 I/O のリトライ方針を最初に決めます。観測 (ログ / メトリクス) も最初から仕込みたいです。`;
    if (kind === 'design')
      return `デザインを実装に落とすときは、デザイントークン (色 / 余白 / 角丸) を先に固めておくと、ズレが防げます。`;
    if (kind === 'product')
      return `「${topic}」のMVPでは、捨てられる前提のコードと、長く残すコアを分けて作りましょう。計測ポイントも最初から入れます。`;
    return `「${topic}」を計測可能にすることが先です。何が改善したと言えるかの指標を最初に置きましょう。`;
  },
};

const SYNTHESIS_TEMPLATES: Record<Intent['topicKind'], (topic: string) => FinalOutput> = {
  lp: (topic) => ({
    topic,
    summary:
      '4専門家の意見を統合すると、最優先は「訴求の明確化」「FV構成の再設計」「CTA導線の改善」「計測可能な実装」です。',
    recommendations: [
      'FV見出しを「動詞 + 数字 + 期間」の具体ベネフィットに書き換える',
      'ターゲットと訴求軸を1つに絞り、サブコピーで証拠を一行添える',
      'CTAをFV内とページ下部に配置し、視線の縦線上に揃える',
      'LCP / CLS / モバイルCTAの可視性を計測し、改善前後で比較する',
    ],
    participants: [],
  }),
  code: (topic) => ({
    topic,
    summary:
      '実装課題としては、目的と指標の定義、責務分離、状態の網羅、観測の同梱が論点として揃いました。',
    recommendations: [
      '解決したいユーザー行動とKPIをコードより先に定義する',
      '画面の状態 (idle / loading / error / success) を一覧化する',
      '責務分離とエラー境界を最初に設計し、リトライ方針を決める',
      'ログ / メトリクス / トレースをMVPから同梱する',
    ],
    participants: [],
  }),
  design: (topic) => ({
    topic,
    summary:
      '世界観とユーザー行動の両面から判断軸を揃え、装飾より構造を優先する方針で一致しました。',
    recommendations: [
      'デザイン判断の前に「見た人にどう動いてほしいか」を合意する',
      '色数 ≤ 3、コントラスト比、視線の流れを基準として置く',
      'デザイントークン (色 / 余白 / 角丸) を先に固める',
      '装飾は最後に足し、最重要メッセージへの視線集中を最優先する',
    ],
    participants: [],
  }),
  product: (topic) => ({
    topic,
    summary:
      'プロダクトとしては、解くべき痛み / 一文で言える価値 / 世界観を支える1枚 / 残すコアと捨てるコードの分離 が論点として残りました。',
    recommendations: [
      'いま我慢している人と痛みを言語化する',
      '「これは ___ のための ___ です」を一文で言い切る',
      '世界観の中心になる1枚 (ヒーロー画像) を最初に決める',
      'MVPは捨てる前提のコードとコアを分け、計測を最初から入れる',
    ],
    participants: [],
  }),
  general: (topic) => ({
    topic,
    summary:
      '4専門家の視点を統合すると、対象の明確化 → 価値の言語化 → 構造の整え → 計測可能化、の順で進めるのが最も効果的です。',
    recommendations: [
      '誰のどの行動を変えるかを最初に定義する',
      '一文で価値を言い切るコピーを作る',
      '余白と対比で最重要メッセージへ視線を集める',
      '何が改善したと言えるかの指標を最初に置く',
    ],
    participants: [],
  }),
};

// ─────────────────────────────────────────────
// Council Engine 実行
// ─────────────────────────────────────────────
export interface RunCouncilHandlers {
  onPhase: (phase: WorldPhase) => void;
  onExpertStatus: (expertId: string, status: 'thinking' | 'discussing' | 'completed') => void;
  onMessage: (msg: CouncilMessage) => void;
  onFinal: (out: FinalOutput) => void;
}

let cancelToken = 0;

export function cancelCurrentCouncil() {
  cancelToken += 1;
}

export async function runCouncil(
  topic: string,
  experts: Expert[],
  handlers: RunCouncilHandlers
): Promise<void> {
  const myToken = ++cancelToken;
  const isCancelled = () => myToken !== cancelToken;

  const intent = routeIntent(topic);
  const ordered = selectExperts(experts, intent);

  // Phase 1: Guide AI thinking
  handlers.onPhase('guide_thinking');
  await sleep(1500);
  if (isCancelled()) return;

  // Phase 2: Experts selected
  handlers.onPhase('experts_selected');
  for (const e of ordered) handlers.onExpertStatus(e.id, 'thinking');
  await sleep(1100);
  if (isCancelled()) return;

  // Phase 3: Council discussing — 各専門家が時間差で発言
  handlers.onPhase('council_discussing');
  for (let i = 0; i < ordered.length; i++) {
    const e = ordered[i];
    handlers.onExpertStatus(e.id, 'discussing');
    await sleep(1200);
    if (isCancelled()) return;
    const text = SPEECHES[e.category](topic, intent.topicKind);
    handlers.onMessage({
      id: `${Date.now()}-${i}`,
      expertId: e.id,
      expertName: e.name,
      category: e.category,
      text,
      timestamp: Date.now(),
    });
    handlers.onExpertStatus(e.id, 'completed');
  }

  // Phase 4: Synthesizing
  handlers.onPhase('synthesizing');
  await sleep(1400);
  if (isCancelled()) return;

  const final = SYNTHESIS_TEMPLATES[intent.topicKind](topic);
  final.participants = ordered.map((e) => e.name);

  handlers.onMessage({
    id: `${Date.now()}-synth`,
    expertId: 'synthesizer',
    expertName: 'Synthesizer',
    category: 'synthesizer',
    text: final.summary,
    timestamp: Date.now(),
  });

  handlers.onFinal(final);
  handlers.onPhase('completed');
}
