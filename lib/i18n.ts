/**
 * 言語切り替え用 i18n。
 *
 * - 既定: 'ja' (CLAUDE.md 指定)
 * - 対応: 'ja' / 'en'
 * - localStorage キー: 'underworld_lang'
 */

import type { ExpertStatus, WorldPhase } from './types';

export type Lang = 'ja' | 'en';

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
];

export interface Strings {
  // ===== Header / 全体 =====
  header_phase_label: string;
  header_active_experts: string;
  header_mcp: string;
  header_nexus: string;

  // ===== Expert list panel =====
  expert_list_title: string;
  expert_badge_sample: string;

  // ===== Council log panel =====
  council_log_title: string;
  council_log_topic_prefix: string;
  council_log_placeholder_idle: string;
  council_log_placeholder_thinking: string;
  council_log_placeholder_selected: string;
  council_log_placeholder_synthesizing: string;
  council_log_synthesizing_loading: string;

  // ===== Consultation input =====
  consult_title: string;
  consult_placeholder_busy: string;
  consult_placeholder_idle: string;
  consult_submit: string;
  consult_reset: string;
  consult_examples_label: string;

  // ===== Nexus gate panel =====
  nexus_panel_title: string;
  nexus_experts_unit: string;
  nexus_panel_subtitle: string;

  // ===== Final output panel =====
  final_title: string;
  final_summary: string;
  final_recommendations: string;
  final_close: string;
  final_participants: string;

  // ===== Status (ExpertListPanel) =====
  status_offline: string;
  status_available: string;
  status_thinking: string;
  status_selected: string;
  status_discussing: string;
  status_completed: string;

  // ===== Phase (Header表示用) =====
  phase_idle: string;
  phase_guide_thinking: string;
  phase_experts_selected: string;
  phase_council_discussing: string;
  phase_synthesizing: string;
  phase_completed: string;

  // ===== 言語切替 UI =====
  language_label: string;
}

export const STRINGS: Record<Lang, Strings> = {
  ja: {
    header_phase_label: 'フェーズ',
    header_active_experts: 'アクティブな専門家',
    header_mcp: 'MCP接続',
    header_nexus: 'Nexus 接続世界',

    expert_list_title: '専門家AI',
    expert_badge_sample: 'サンプル',

    council_log_title: 'Council Room',
    council_log_topic_prefix: 'テーマ:',
    council_log_placeholder_idle: '相談を入力すると、Council Room で専門家AIたちが議論を始めます。',
    council_log_placeholder_thinking: 'Guide AI が相談内容を解析しています…',
    council_log_placeholder_selected: '専門家AIを召喚しました。Council Room へ移動します…',
    council_log_placeholder_synthesizing: 'Synthesizer が複数の意見を統合しています…',
    council_log_synthesizing_loading: '統合中…',

    consult_title: 'Underworld に相談する',
    consult_placeholder_busy: '専門家AIたちが思考中です…',
    consult_placeholder_idle: '例: このLPのファーストビューを改善したい',
    consult_submit: '送信',
    consult_reset: 'リセット',
    consult_examples_label: '例:',

    nexus_panel_title: 'Nexus Gate',
    nexus_experts_unit: '名',
    nexus_panel_subtitle: '接続済みの他世界',

    final_title: '統合回答',
    final_summary: '要約',
    final_recommendations: '推奨アクション',
    final_close: '閉じる',
    final_participants: '参加した専門家',

    status_offline: '不在',
    status_available: '待機中',
    status_thinking: '思考中…',
    status_selected: '召喚済',
    status_discussing: '議論中',
    status_completed: '完了',

    phase_idle: 'IDLE',
    phase_guide_thinking: 'GUIDE 解析中',
    phase_experts_selected: '専門家 召喚済',
    phase_council_discussing: 'COUNCIL 議論中',
    phase_synthesizing: '統合中',
    phase_completed: '完了',

    language_label: '言語',
  },
  en: {
    header_phase_label: 'PHASE',
    header_active_experts: 'ACTIVE EXPERTS',
    header_mcp: 'MCP',
    header_nexus: 'NEXUS LINKS',

    expert_list_title: 'EXPERTS',
    expert_badge_sample: 'sample',

    council_log_title: 'COUNCIL ROOM',
    council_log_topic_prefix: 'topic:',
    council_log_placeholder_idle: 'Type a question and the experts will begin discussing in the Council Room.',
    council_log_placeholder_thinking: 'Guide AI is analyzing your request…',
    council_log_placeholder_selected: 'Experts summoned. Moving to the Council Room…',
    council_log_placeholder_synthesizing: 'The Synthesizer is integrating perspectives…',
    council_log_synthesizing_loading: 'synthesizing…',

    consult_title: 'CONSULT THE UNDERWORLD',
    consult_placeholder_busy: 'The experts are thinking…',
    consult_placeholder_idle: 'e.g. Improve the hero section of this LP',
    consult_submit: 'Send',
    consult_reset: 'Reset',
    consult_examples_label: 'examples:',

    nexus_panel_title: 'NEXUS GATE',
    nexus_experts_unit: ' experts',
    nexus_panel_subtitle: 'connected worlds',

    final_title: 'Integrated Response',
    final_summary: 'Summary',
    final_recommendations: 'Recommended Actions',
    final_close: 'Close',
    final_participants: 'Participants',

    status_offline: 'offline',
    status_available: 'available',
    status_thinking: 'thinking…',
    status_selected: 'summoned',
    status_discussing: 'discussing',
    status_completed: 'completed',

    phase_idle: 'IDLE',
    phase_guide_thinking: 'GUIDE THINKING',
    phase_experts_selected: 'EXPERTS SELECTED',
    phase_council_discussing: 'COUNCIL DISCUSSING',
    phase_synthesizing: 'SYNTHESIZING',
    phase_completed: 'COMPLETED',

    language_label: 'Language',
  },
};

// 専門家名の言語別表示 (seed の id ベース)
export const EXPERT_NAMES: Record<Lang, Record<string, string>> = {
  ja: {
    'guide-ai': 'ガイドAI',
    'marketing-expert': 'マーケティング',
    'copywriting-expert': 'コピーライティング',
    'design-expert': 'デザイン',
    'engineering-expert': 'エンジニアリング',
  },
  en: {
    'guide-ai': 'Guide AI',
    'marketing-expert': 'Marketing',
    'copywriting-expert': 'Copywriting',
    'design-expert': 'Design',
    'engineering-expert': 'Engineering',
  },
};

// 他世界 (Linked World) の言語別表示
export const WORLD_NAMES: Record<Lang, Record<string, string>> = {
  ja: {
    'design-underworld': 'デザイン世界',
    'legal-underworld': 'リーガル世界',
    'education-underworld': '教育世界',
  },
  en: {
    'design-underworld': 'Design',
    'legal-underworld': 'Legal',
    'education-underworld': 'Education',
  },
};

// helper: 1個の expert id を現在の言語で表示名に
export function localizeExpertName(id: string, lang: Lang, fallback: string): string {
  return EXPERT_NAMES[lang][id] ?? fallback;
}

export function localizeWorldName(id: string, lang: Lang, fallback: string): string {
  return WORLD_NAMES[lang][id] ?? fallback;
}

// 型保証ヘルパ
export function statusLabel(s: ExpertStatus, lang: Lang): string {
  const t = STRINGS[lang];
  return ({
    offline: t.status_offline,
    available: t.status_available,
    thinking: t.status_thinking,
    selected: t.status_selected,
    discussing: t.status_discussing,
    completed: t.status_completed,
  } as Record<ExpertStatus, string>)[s];
}

export function phaseLabel(p: WorldPhase, lang: Lang): string {
  const t = STRINGS[lang];
  return ({
    idle: t.phase_idle,
    guide_thinking: t.phase_guide_thinking,
    experts_selected: t.phase_experts_selected,
    council_discussing: t.phase_council_discussing,
    synthesizing: t.phase_synthesizing,
    completed: t.phase_completed,
  } as Record<WorldPhase, string>)[p];
}
