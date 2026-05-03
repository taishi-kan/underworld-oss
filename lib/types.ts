export type ExpertStatus =
  | 'offline'
  | 'available'
  | 'thinking'
  | 'selected'
  | 'discussing'
  | 'completed';

export type ExpertCategory =
  | 'guide'
  | 'marketing'
  | 'copywriting'
  | 'design'
  | 'engineering';

export interface ExpertAvatarSpec {
  type: string;
  color: string;
  symbol: string;
  glow: string;
}

export type AvatarPreset = 'default' | 'guide';
export type AvatarType = 'glb' | 'placeholder';

export interface AvatarManifest {
  preset: AvatarPreset;
  /** 'glb' のとき外部GLBモデルをロード。未指定/'placeholder' で fallback表示 */
  type?: AvatarType;
  /** 例: '/models/guide_ai.glb' */
  model?: string;
  /** fallback識別子 (例: 'sacred_hologram_placeholder') */
  fallback?: string;
  /** R3F側でemissive/回転制御するメッシュ名 (Blender側のメッシュ名と一致させる) */
  animated_parts?: string[];

  /** 素材方針 (情報用、Blender制作者向けメモ) */
  primary_material?: string;
  accent_material?: string;
  glow_color?: string;
  transparent_material?: string;

  /** 旧プレースホルダ用のカラーパレット (fallback描画で使用) */
  primary_color?: string;
  secondary_color?: string;
  core_color?: string;
  accent_color?: string;

  scale?: number;
  notes?: string;
}

export interface ExpertPersona {
  tone: string;
  style: string;
}

export interface ExpertPermissions {
  can_read_user_prompt: boolean;
  can_read_uploaded_files?: boolean;
  can_store_conversation?: boolean;
  requires_consent: boolean;
}

export interface Expert {
  id: string;
  name: string;
  role: string;
  category: ExpertCategory;
  avatar: ExpertAvatarSpec;
  avatar_manifest?: AvatarManifest;
  capabilities: string[];
  persona: ExpertPersona;
  /** 紐付くMCP接続のID。MCPを使わないExpertでは undefined */
  mcp_connection_id?: string;
  status: ExpertStatus;
  permissions: ExpertPermissions;
}

export interface World {
  id: string;
  name: string;
  description: string;
  category: string;
  visibility: string;
  owner: string;
  version: string;
}

export interface WorldTheme {
  visual_style: string;
  world_type: string;
  primary_color: string;
  mood: string;
  core_symbol: string;
}

export interface SpaceLayoutArea {
  id: string;
  name: string;
  type: string;
}

export interface SpaceLayout {
  entry_point: string;
  areas: SpaceLayoutArea[];
}

export interface MCPConnection {
  id: string;
  name: string;
  /** 'stdio' (ローカルプロセス起動) / 'http' / 'sse' / 'mock' */
  type?: 'stdio' | 'http' | 'sse' | 'mock';
  /** stdio型: 起動コマンド (例: 'npx') */
  command?: string;
  /** stdio型: 起動引数 (例: ['-y', '@modelcontextprotocol/server-github']) */
  args?: string[];
  /** プロセスに渡す環境変数の参照名。実値は .env.local から読み出す (Seedには値を書かない) */
  env_keys?: string[];
  /** ホワイトリスト。MCPサーバ名を除いたツール名のみ列挙 (例: 'list_issues')。route.ts側で 'mcp__<server>__<tool>' に組み立てる */
  allowed_tools?: string[];
  /** http/sse 型用 */
  server_url?: string;
  trust_level: string;
  notes?: string;
}

export interface WorldRules {
  allow_external_experts: boolean;
  allow_world_link: boolean;
  require_user_consent_before_external_mcp: boolean;
  store_conversation_logs: boolean;
}

export interface LinkedWorld {
  id: string;
  name: string;
  category: string;
  trust_level: string;
  available_experts: number;
  color: string;
}

export interface NexusGateSpec {
  enabled: boolean;
  linked_worlds: LinkedWorld[];
}

export interface UnderworldSeed {
  seed_version: string;
  world: World;
  theme: WorldTheme;
  space_layout: SpaceLayout;
  experts: Expert[];
  mcp_connections: MCPConnection[];
  rules: WorldRules;
  nexus_gate: NexusGateSpec;
}

export type WorldPhase =
  | 'idle'
  | 'guide_thinking'
  | 'experts_selected'
  | 'council_discussing'
  | 'synthesizing'
  | 'completed';

export interface CouncilMessage {
  id: string;
  expertId: string;
  expertName: string;
  category: ExpertCategory | 'synthesizer';
  text: string;
  timestamp: number;
}

export interface FinalOutput {
  topic: string;
  summary: string;
  recommendations: string[];
  participants: string[];
}

export interface ConsultationSession {
  id: string;
  topic: string;
  selectedExpertIds: string[];
  messages: CouncilMessage[];
  finalOutput: FinalOutput | null;
  startedAt: number;
}
