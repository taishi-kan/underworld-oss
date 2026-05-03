/**
 * ====== Underworld 2D アセット仕様 + マニフェスト ======
 *
 * 構造: 背景は1枚絵、上にキャラ・扉スプライトを重ねる。
 * Phase A 以降はアニメ・ファンタジー路線に変更。ピクセル化はしない。
 *
 *  - 背景  /sprites/background.png  (960x540 の神殿内部)
 *  - キャラ /sprites/characters/<id>.png (高解像度1枚絵、Phaserで縮小表示)
 *  - 扉    /sprites/structures/door-<world_id>.png (Linked Worldごと) + door.png (generic fallback)
 *
 * 共通スタイルガイド (sacred_hologram テーマ):
 *  - 配色: 暗い紺 #02040a / #04081a 背景、ハイライト #7fdcff #9bdcff #cfe9ff
 *  - 半透明感 (ホログラム精霊)、輪郭は淡い水色グロー
 */

// ====== レンダリング論理解像度 ======
// FullHD で 1:1 表示できるよう 1920x1080 に。Phaser canvas もこれに合わせる
export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

// ====== 背景画 (神殿内部) ======
export const BACKGROUND_ASSET = '/sprites/background.png';

// ====== 扉 ======
// generic 扉 (linked worldテーマ別の扉が無いときの fallback)
export const DOOR_ASSET = '/sprites/structures/door.png';
// 神殿内に配置するときの表示サイズ (display) — 1920x1080 logical のスケール
export const DOOR_DISPLAY = { w: 128, h: 192 };
// linked world ごとのテーマ別扉。world.id をキーに sheet パスを引く
export const DOOR_BY_WORLD: Record<string, string> = {
  'design-underworld':    '/sprites/structures/door-design-underworld.png',
  'legal-underworld':     '/sprites/structures/door-legal-underworld.png',
  'education-underworld': '/sprites/structures/door-education-underworld.png',
};

// ====== キャラ ======
export interface CharacterAssetSpec {
  id: string;
  name: string;
  sheet: string;
  /** PNG 内のフレーム寸法 (現状は単一フレーム = 全画像サイズ) */
  frameW: number;
  frameH: number;
  frames: number;
  durationMs: number;
  /** 画面上の表示サイズ (Phaser sprite.setDisplaySize で適用) */
  displayW: number;
  displayH: number;
}

// 生成 (320x448 / 256x384) → 1920x1080 logical のスケールに合わせて display を倍に
export const CHARACTER_ASSETS: CharacterAssetSpec[] = [
  { id: 'guide-ai',           name: 'Guide AI',           sheet: '/sprites/characters/guide-ai.png',
    frameW: 320, frameH: 448, frames: 1, durationMs: 1600, displayW: 220, displayH: 308 },
  { id: 'marketing-expert',   name: 'Marketing Expert',   sheet: '/sprites/characters/marketing-expert.png',
    frameW: 256, frameH: 384, frames: 1, durationMs: 1600, displayW: 180, displayH: 270 },
  { id: 'copywriting-expert', name: 'Copywriting Expert', sheet: '/sprites/characters/copywriting-expert.png',
    frameW: 256, frameH: 384, frames: 1, durationMs: 1600, displayW: 180, displayH: 270 },
  { id: 'design-expert',      name: 'Design Expert',      sheet: '/sprites/characters/design-expert.png',
    frameW: 256, frameH: 384, frames: 1, durationMs: 1600, displayW: 180, displayH: 270 },
  { id: 'engineering-expert', name: 'Engineering Expert', sheet: '/sprites/characters/engineering-expert.png',
    frameW: 256, frameH: 384, frames: 1, durationMs: 1600, displayW: 180, displayH: 270 },
];

// ====== スクリーン配置 ======
// 背景画の祭壇を中心に、Councilを取り囲むように5体を半円配置 (footアンカー)
export interface ScreenPos { x: number; y: number; }

// 全座標は 1920x1080 logical 系
export const EXPERT_SCREEN: Record<string, ScreenPos & { isGuide?: boolean }> = {
  'guide-ai':           { x:  960, y: 1050, isGuide: true }, // 中央 最前列 (祭壇手前)
  'marketing-expert':   { x:  640, y:  980 },                 // 前列 左
  'copywriting-expert': { x:  540, y:  760 },                 // 中列 左奥
  'design-expert':      { x: 1380, y:  760 },                 // 中列 右奥
  'engineering-expert': { x: 1280, y:  980 },                 // 前列 右
};

// 祭壇 (背景画の中央光円) 上の追加グロー位置
export const COUNCIL_CORE_SCREEN: ScreenPos = { x: 960, y: 720 };

// ====== Linked World サテライト・ポータル (扉) ======
// 扉の足元を slot 座標に合わせる (1920x1080 系)
export const LINKED_WORLD_SLOTS: { x: number; y: number; labelOffsetY: number }[] = [
  { x:  960, y: 220, labelOffsetY: 24 }, // 上空 (主アーチ手前)
  { x:  200, y: 640, labelOffsetY: 24 }, // 左の壁ぎわ
  { x: 1720, y: 640, labelOffsetY: 24 }, // 右の壁ぎわ
];
