import Phaser from 'phaser';
import type { Expert, ExpertStatus, LinkedWorld, WorldPhase } from '@/lib/types';
import {
  BACKGROUND_ASSET, CHARACTER_ASSETS, COUNCIL_CORE_SCREEN, DOOR_ASSET, DOOR_BY_WORLD, DOOR_DISPLAY,
  EXPERT_SCREEN, LINKED_WORLD_SLOTS, LOGICAL_H, LOGICAL_W,
  type CharacterAssetSpec,
} from '../assets';

export { LOGICAL_W, LOGICAL_H };

const STATUS_VISUALS: Record<ExpertStatus, { alpha: number; scale: number }> = {
  offline:    { alpha: 0.30, scale: 0.95 },
  available:  { alpha: 0.95, scale: 1.0 },
  thinking:   { alpha: 1.0,  scale: 1.08 },
  selected:   { alpha: 1.0,  scale: 1.04 },
  discussing: { alpha: 1.0,  scale: 1.04 },
  completed:  { alpha: 0.85, scale: 1.0 },
};

const usedRealAsset = new Map<string, boolean>();

const TEXT_FONT_JP = '"Noto Sans JP", system-ui, sans-serif';
const TEXT_FONT_DISPLAY = '"Cinzel", "Noto Serif JP", serif';

export class UnderworldScene extends Phaser.Scene {
  private expertContainers = new Map<string, Phaser.GameObjects.Container>();
  // 言語切替時に再生成するためのラベル参照
  private expertNameLabels = new Map<string, Phaser.GameObjects.Container>();
  private worldNameLabels = new Map<string, Phaser.GameObjects.Container>();
  private worldSubLabels = new Map<string, Phaser.GameObjects.Container>();
  private currentStatuses: Record<string, ExpertStatus> = {};
  private currentPhase: WorldPhase = 'idle';

  constructor() {
    super('underworld');
  }

  preload() {
    this.load.on('loaderror', (file: { key: string }) => { usedRealAsset.set(file.key, false); });
    this.load.on('filecomplete', (key: string) => { usedRealAsset.set(key, true); });

    this.load.image('bg', BACKGROUND_ASSET);
    this.load.image('door', DOOR_ASSET);
    for (const [worldId, src] of Object.entries(DOOR_BY_WORLD)) {
      this.load.image(`door_${worldId}`, src);
    }
    for (const c of CHARACTER_ASSETS) {
      this.load.spritesheet(`char_${c.id}`, c.sheet, {
        frameWidth: c.frameW,
        frameHeight: c.frameH,
      });
    }
  }

  create() {
    this.ensureProceduralFallbacks();
    this.applyNearestToPixelTextures();

    this.drawBackground();              // 背景画 1枚 (depth: -100)
    this.drawConnectionBeams();         // サテライト → 祭壇 (depth: 50)
    this.drawConnectionParticles();     // 接続光に流れる粒子 (depth: 55)
    this.drawCouncilGlow();             // 祭壇上の追加グロー (depth: 100)
    this.drawLinkedWorldPortals();      // サテライト + ラベル (depth: 70-80)

    const experts: Expert[] = this.registry.get('experts') ?? [];
    this.currentStatuses = this.registry.get('statuses') ?? {};
    this.currentPhase = this.registry.get('phase') ?? 'idle';

    experts.forEach((e) => this.createExpertSprite(e));

    this.registry.events.on('changedata-statuses', (_p: unknown, value: Record<string, ExpertStatus>) => {
      this.currentStatuses = value ?? {};
      this.applyExpertVisuals();
    });
    this.registry.events.on('changedata-phase', (_p: unknown, value: WorldPhase) => {
      this.currentPhase = value ?? 'idle';
      this.applyExpertVisuals();
    });
    // 言語切替時にラベル文字を更新
    this.registry.events.on('changedata-localizedExpertNames', () => this.refreshExpertLabels());
    this.registry.events.on('changedata-localizedWorldNames', () => this.refreshWorldLabels());

    this.setupCameraControls();      // ホイールズーム + ドラッグパン
    this.applyPostFx();
    this.applyExpertVisuals();
  }

  // ====== カメラ操作 (ズーム + パン) ======
  private setupCameraControls() {
    const cam = this.cameras.main;
    // setBounds は使わない (zoom<1 で挙動が崩れるため、自前 clamp する)

    const MIN_ZOOM = 0.5;   // 縮小時は letterbox (中央固定で背景外側が黒地)
    const MAX_ZOOM = 3.0;

    // 視点 (camera が見ている world の中心点) を bg内に clamp。
    // scrollX 直書きは Phaser の zoom anchor 規約と噛み合わずズレるので、
    // midPoint で読み、centerOn で書く。
    const clampCamera = () => {
      const halfVW = cam.width / (2 * cam.zoom);
      const halfVH = cam.height / (2 * cam.zoom);
      let cx = cam.midPoint.x;
      let cy = cam.midPoint.y;
      if (halfVW * 2 >= LOGICAL_W) {
        cx = LOGICAL_W / 2; // viewport が bg より広い → 中央固定
      } else {
        cx = Phaser.Math.Clamp(cx, halfVW, LOGICAL_W - halfVW);
      }
      if (halfVH * 2 >= LOGICAL_H) {
        cy = LOGICAL_H / 2;
      } else {
        cy = Phaser.Math.Clamp(cy, halfVH, LOGICAL_H - halfVH);
      }
      cam.centerOn(cx, cy);
    };

    const setZoomAt = (newZoom: number, focusX?: number, focusY?: number) => {
      const clamped = Phaser.Math.Clamp(newZoom, MIN_ZOOM, MAX_ZOOM);
      if (Math.abs(clamped - cam.zoom) < 0.0001) return;
      // ズームイン/アウト両方で focus 座標下のworld pointを保持
      let before: Phaser.Math.Vector2 | null = null;
      if (focusX != null && focusY != null) before = cam.getWorldPoint(focusX, focusY);
      cam.setZoom(clamped);
      if (before && focusX != null && focusY != null) {
        const after = cam.getWorldPoint(focusX, focusY);
        cam.scrollX += before.x - after.x;
        cam.scrollY += before.y - after.y;
      }
      clampCamera();
    };

    // ホイールズーム (画面中央起点)
    this.input.on('wheel', (
      _pointer: Phaser.Input.Pointer,
      _objs: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number
    ) => {
      const factor = dy < 0 ? 1.10 : 1 / 1.10;
      setZoomAt(cam.zoom * factor, cam.width / 2, cam.height / 2);
    });

    // ドラッグパン (左クリック押下中)。zoom=1 では bounds に阻まれて何も起きない
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const canvas = this.game.canvas as HTMLCanvasElement | undefined;
    if (canvas) canvas.style.cursor = 'grab';

    this.input.on('pointerdown', (
      p: Phaser.Input.Pointer,
      hitObjects: Phaser.GameObjects.GameObject[]
    ) => {
      // クリック先が interactive な GameObject (キャラ等) ならカメラ drag を起動しない
      if (hitObjects && hitObjects.length > 0) return;
      dragging = true;
      lastX = p.x;
      lastY = p.y;
      if (canvas) canvas.style.cursor = 'grabbing';
    });
    const stopDrag = () => {
      dragging = false;
      if (canvas) canvas.style.cursor = 'grab';
    };
    this.input.on('pointerup', stopDrag);
    this.input.on('pointerupoutside', stopDrag);
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      if (cam.zoom <= 1) return; // 縮小〜等倍はパン不可 (中央固定)
      cam.scrollX -= (p.x - lastX) / cam.zoom;
      cam.scrollY -= (p.y - lastY) / cam.zoom;
      lastX = p.x;
      lastY = p.y;
      clampCamera();
    });

    // React 側 (overlayボタン) からのコマンド
    this.registry.events.on('changedata-camera_command', (_p: unknown, cmd: { type: string } | null) => {
      if (!cmd) return;
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      if (cmd.type === 'zoom_in')  setZoomAt(cam.zoom * 1.25, cx, cy);
      if (cmd.type === 'zoom_out') setZoomAt(cam.zoom / 1.25, cx, cy);
      if (cmd.type === 'reset') {
        cam.setZoom(1);
        clampCamera();
      }
    });

    // R キーでリセット
    this.input.keyboard?.on('keydown-R', () => {
      cam.setZoom(1);
      clampCamera();
    });

    // 初期 clamp (デフォルトzoom=1で全体表示の整合)
    clampCamera();
  }

  // ====== fallback texture (背景が無い場合は黒塗り、キャラ無い場合は placeholder) ======
  private ensureProceduralFallbacks() {
    if (!this.textures.exists('bg')) {
      // 背景PNGが無い時の最終 fallback (真っ黒で強制起動)
      const g = this.add.graphics();
      g.fillStyle(0x02040a, 1);
      g.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      g.generateTexture('bg', LOGICAL_W, LOGICAL_H);
      g.destroy();
    }
    for (const c of CHARACTER_ASSETS) {
      const key = `char_${c.id}`;
      if (this.textures.exists(key)) continue;
      this.makeCharacterPlaceholder(c);
    }
    this.makeSatelliteGateTexture();
    if (!this.textures.exists('particle_dot')) this.makeParticleTexture();
  }

  // 粒子用の光球テクスチャ (柔らかいガウシアン風円)
  private makeParticleTexture() {
    const size = 16;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(size / 2, size / 2, 3);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(size / 2, size / 2, 5);
    g.fillStyle(0xffffff, 0.2);
    g.fillCircle(size / 2, size / 2, 7);
    g.generateTexture('particle_dot', size, size);
    g.destroy();
  }

  private applyNearestToPixelTextures() {
    // アニメ・ファンタジー路線に変更したので、NEAREST フィルタは外し、
    // 全テクスチャ Phaser デフォルトの LINEAR (滑らか縮小) で表示する。
    // 後で pixel art のサテライトに戻したいテクスチャがあれば、ここで個別に NEAREST にする。
  }

  private makeSatelliteGateTexture() {
    const w = 36, h = 56;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(0, 14, w, h - 14, { tl: 18, tr: 18, bl: 0, br: 0 });
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(5, 22, w - 10, h - 22, { tl: 13, tr: 13, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2, 6, 3);
    g.generateTexture('satellite_gate', w, h);
    g.destroy();
  }

  private makeCharacterPlaceholder(c: CharacterAssetSpec) {
    const g = this.add.graphics();
    const w = c.frameW, h = c.frameH;
    g.fillStyle(0xcfe9ff, 0.18);
    g.fillRoundedRect(4, h - 76, w - 8, 70, 8);
    g.fillStyle(0xcfe9ff, 0.7);
    g.fillRoundedRect(8, h - 70, w - 16, 58, 6);
    g.lineStyle(1, 0xcfe9ff, 0.9);
    g.strokeRoundedRect(8, h - 70, w - 16, 58, 6);
    g.fillStyle(0x9bdcff, 0.5);
    g.fillCircle(w / 2, 14, 14);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(w / 2, 14, 8);
    g.generateTexture(`char_${c.id}`, w, h);
    g.destroy();
  }

  // ====== 描画 ======
  private drawBackground() {
    const bg = this.add.image(0, 0, 'bg').setOrigin(0, 0);
    bg.setDisplaySize(LOGICAL_W, LOGICAL_H);
    bg.setDepth(-100);
  }

  private drawCouncilGlow() {
    // 背景画の中央祭壇の上にうっすら追加で光球を重ねる (生きてる感)
    const c = COUNCIL_CORE_SCREEN;
    const glow = this.add.graphics();
    glow.fillStyle(0xcfe9ff, 0.20);
    glow.fillCircle(c.x, c.y, 72);
    glow.fillStyle(0xffffff, 0.40);
    glow.fillCircle(c.x, c.y, 24);
    glow.setDepth(c.y - 0.1);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.65, to: 1.0 },
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // ====== Linked Worlds ======
  private getLinkedWorldEntries(): { world: LinkedWorld; slot: { x: number; y: number; labelOffsetY: number } }[] {
    const linkedWorlds: LinkedWorld[] = this.registry.get('linkedWorlds') ?? [];
    return linkedWorlds.slice(0, LINKED_WORLD_SLOTS.length).map((world, i) => ({
      world,
      slot: LINKED_WORLD_SLOTS[i],
    }));
  }

  private drawConnectionBeams() {
    const entries = this.getLinkedWorldEntries();
    const beams = this.add.graphics();
    beams.setDepth(50);
    beams.setBlendMode(Phaser.BlendModes.ADD);
    for (const { world, slot } of entries) {
      const color = parseHexColor(world.color, 0x9bdcff);
      // 太い外グロー
      beams.lineStyle(6, color, 0.10);
      beams.beginPath();
      beams.moveTo(slot.x, slot.y);
      beams.lineTo(COUNCIL_CORE_SCREEN.x, COUNCIL_CORE_SCREEN.y);
      beams.strokePath();
      // 細い芯
      beams.lineStyle(1.5, color, 0.7);
      beams.beginPath();
      beams.moveTo(slot.x, slot.y);
      beams.lineTo(COUNCIL_CORE_SCREEN.x, COUNCIL_CORE_SCREEN.y);
      beams.strokePath();
    }
    this.tweens.add({
      targets: beams,
      alpha: { from: 0.55, to: 1.0 },
      duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // 各接続光に「他世界 → 祭壇」へ流れる粒子を出す。Seed Network の "繋がってる感" 強化
  private drawConnectionParticles() {
    const entries = this.getLinkedWorldEntries();
    for (const { world, slot } of entries) {
      const color = parseHexColor(world.color, 0x9bdcff);
      const dx = COUNCIL_CORE_SCREEN.x - slot.x;
      const dy = COUNCIL_CORE_SCREEN.y - slot.y;
      const dist = Math.hypot(dx, dy);
      const angleDeg = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
      const speed = 180; // px / sec (1920x1080 logical)
      const lifespan = (dist / speed) * 1000;

      const emitter = this.add.particles(slot.x, slot.y, 'particle_dot', {
        speed,
        angle: { min: angleDeg - 1.2, max: angleDeg + 1.2 },
        lifespan,
        frequency: 200,
        quantity: 1,
        scale: { start: 1.7, end: 0.5 },
        alpha: { start: 0.95, end: 0 },
        tint: color,
        blendMode: Phaser.BlendModes.ADD,
      });
      emitter.setDepth(55);
    }
  }

  private drawLinkedWorldPortals() {
    const entries = this.getLinkedWorldEntries();

    for (const { world, slot } of entries) {
      const color = parseHexColor(world.color, 0x9bdcff);

      // テーマ別扉を優先、無ければ generic door、それも無ければ procedural satellite_gate
      const themedKey = `door_${world.id}`;
      const hasThemed = usedRealAsset.get(themedKey) === true;
      const hasGeneric = usedRealAsset.get('door') === true;
      const texKey = hasThemed ? themedKey : (hasGeneric ? 'door' : 'satellite_gate');

      // 後光 (扉中央のあたりに発光)
      const haloY = slot.y - DOOR_DISPLAY.h / 2;
      const halo = this.add.graphics();
      halo.fillStyle(color, 0.32);
      halo.fillCircle(slot.x, haloY, DOOR_DISPLAY.w * 0.7);
      halo.setDepth(70);
      halo.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: halo,
        alpha: { from: 0.55, to: 1.0 },
        duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      // 扉本体 (足元を slot に置く)
      const gate = this.add.image(slot.x, slot.y, texKey).setOrigin(0.5, 1);
      gate.setDisplaySize(DOOR_DISPLAY.w, DOOR_DISPLAY.h);
      if (hasThemed) {
        // テーマ別扉はそのままの色で出す (色加工しない)
      } else if (hasGeneric) {
        gate.setTint(blendColor(color, 0xffffff, 0.55));
      } else {
        gate.setTint(color);
      }
      gate.setDepth(71);

      // 浮遊しない (扉が地に着いてる感)
      const labelY = slot.y + slot.labelOffsetY;
      const main = this.placeLabel(
        slot.x, labelY, this.localizeWorld(world),
        { font: TEXT_FONT_DISPLAY, size: 28, color: '#ffffff', letterSpacing: 3, bold: true, withPill: true }
      );
      main.setDepth(72);
      this.worldNameLabels.set(world.id, main);

      const sub = this.placeLabel(
        slot.x, labelY + 36, this.localizeWorldSub(world),
        { font: TEXT_FONT_JP, size: 20, color: '#bfeaff' }
      );
      sub.setDepth(72);
      this.worldSubLabels.set(world.id, sub);
    }
  }

  // 言語切替時に他世界ラベルだけ作り直す
  private refreshWorldLabels() {
    const entries = this.getLinkedWorldEntries();
    for (const { world, slot } of entries) {
      const labelY = slot.y + slot.labelOffsetY;
      const oldMain = this.worldNameLabels.get(world.id);
      if (oldMain) oldMain.destroy();
      const main = this.placeLabel(
        slot.x, labelY, this.localizeWorld(world),
        { font: TEXT_FONT_DISPLAY, size: 28, color: '#ffffff', letterSpacing: 3, bold: true, withPill: true }
      );
      main.setDepth(72);
      this.worldNameLabels.set(world.id, main);

      const oldSub = this.worldSubLabels.get(world.id);
      if (oldSub) oldSub.destroy();
      const sub = this.placeLabel(
        slot.x, labelY + 36, this.localizeWorldSub(world),
        { font: TEXT_FONT_JP, size: 20, color: '#bfeaff' }
      );
      sub.setDepth(72);
      this.worldSubLabels.set(world.id, sub);
    }
  }

  private localizeWorld(world: LinkedWorld): string {
    const map = (this.registry.get('localizedWorldNames') ?? {}) as Record<string, string>;
    if (map[world.id]) return map[world.id];
    // fallback: seed の name から "Underworld" 接尾を外す
    return world.name.replace(/\s+Underworld$/i, '').trim() || world.name;
  }

  private localizeWorldSub(world: LinkedWorld): string {
    // "X experts" / "X 名" — ja/en で語尾切替
    // 簡易: localizedWorldNames がある場合は "X 名" (ja相当)、なければ "X experts" (en相当)
    // より厳密にするには別のキー (ex: localizedExpertsUnit) を渡せばよい
    const map = this.registry.get('localizedWorldNames') as Record<string, string> | undefined;
    const isJa = map && Object.values(map).some((v) => /[ぁ-んァ-ン一-龥]/.test(v));
    return isJa ? `${world.available_experts} 名` : `${world.available_experts} experts`;
  }

  // ====== 専門家スプライト ======
  private createExpertSprite(expert: Expert) {
    const pos = EXPERT_SCREEN[expert.id];
    if (!pos) return;
    const spec = CHARACTER_ASSETS.find((c) => c.id === expert.id);
    if (!spec) return;

    const container = this.add.container(pos.x, pos.y);
    container.setDepth(pos.y);

    // 接地影 (1920x1080 logical のサイズ感)
    container.add(this.add.ellipse(0, 4, 76, 20, 0x000000, 0.55));

    // キャラ本体 (足元アンカー)。高解像度PNG → displayW/H に縮小して滑らかに表示
    const sprite = this.add.sprite(0, 0, `char_${spec.id}`, 0).setOrigin(0.5, 1);
    sprite.setDisplaySize(spec.displayW, spec.displayH);
    container.add(sprite);

    if (usedRealAsset.get(`char_${spec.id}`) && spec.frames > 1) {
      const animKey = `idle_${spec.id}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(`char_${spec.id}`, { start: 0, end: spec.frames - 1 }),
          frameRate: (spec.frames * 1000) / spec.durationMs,
          repeat: -1,
        });
      }
      sprite.play(animKey);
    }

    // 名前ラベル (現在の言語で localize、後で言語切替時に再生成可能なように Map に保持)
    const nameLabel = this.placeLabel(
      0, 22, this.localizeExpert(expert),
      { font: TEXT_FONT_JP, size: 24, color: '#ffffff', bold: true, withPill: true }
    );
    container.add(nameLabel);
    this.expertNameLabels.set(expert.id, nameLabel);

    // 浮遊 tween — y を直接いじるので、drag開始で止め、drag終了で**新しい y を基準に**再生成する
    // (resume だと旧 base に戻ろうとして y がスナップする = 「y軸動かない」バグの原因)
    let floatTween: Phaser.Tweens.Tween | null = null;
    const startFloat = (baseY: number) => {
      if (floatTween) { floatTween.stop(); floatTween = null; }
      container.y = baseY;
      floatTween = this.tweens.add({
        targets: container,
        y: baseY - 10,
        duration: 2400 + Math.floor(Math.random() * 800),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    };
    startFloat(pos.y);

    // ドラッグ可能化 (display サイズに合わせた hitArea)
    const sw = spec.displayW;
    const sh = spec.displayH;
    container.setInteractive(
      new Phaser.Geom.Rectangle(-sw / 2, -sh, sw, sh + 20),
      Phaser.Geom.Rectangle.Contains
    );
    this.input.setDraggable(container);

    container.on('dragstart', () => {
      if (floatTween) { floatTween.stop(); floatTween = null; }
      this.game.canvas.style.cursor = 'grabbing';
    });
    container.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      container.x = dx;
      container.y = dy;
      container.setDepth(dy);
    });
    container.on('dragend', () => {
      // 新しい位置を基準に浮遊 tween を作り直す (y がドラッグ後の位置で安定)
      startFloat(container.y);
      this.game.canvas.style.cursor = 'grab';
    });
    container.on('pointerover', () => { this.game.canvas.style.cursor = 'grab'; });
    container.on('pointerout',  () => { if (this.game.canvas.style.cursor !== 'grabbing') this.game.canvas.style.cursor = 'grab'; });

    this.expertContainers.set(expert.id, container);
  }

  // 言語切替時に専門家名ラベルだけ作り直す (drag後の位置を保つため、tween/sprite はそのまま)
  private refreshExpertLabels() {
    const experts: Expert[] = this.registry.get('experts') ?? [];
    for (const expert of experts) {
      const container = this.expertContainers.get(expert.id);
      if (!container) continue;
      const oldLabel = this.expertNameLabels.get(expert.id);
      if (oldLabel) {
        container.remove(oldLabel, true); // destroy した上で container から外す
      }
      const newLabel = this.placeLabel(
        0, 12, this.localizeExpert(expert),
        { font: TEXT_FONT_JP, size: 24, color: '#ffffff', bold: true, withPill: true }
      );
      container.add(newLabel);
      this.expertNameLabels.set(expert.id, newLabel);
    }
  }

  private localizeExpert(expert: Expert): string {
    const map = (this.registry.get('localizedExpertNames') ?? {}) as Record<string, string>;
    if (map[expert.id]) return map[expert.id];
    // fallback: seed name の "Expert" 接尾を外す
    return expert.id === 'guide-ai'
      ? expert.name
      : expert.name.replace(/\s+Expert$/i, '').trim() || expert.name;
  }

  private applyExpertVisuals() {
    this.expertContainers.forEach((container, id) => {
      const status = this.currentStatuses[id] ?? 'available';
      const v = STATUS_VISUALS[status];
      this.tweens.add({
        targets: container,
        alpha: v.alpha,
        scale: v.scale,
        duration: 280, ease: 'Sine.easeOut',
      });
    });
  }

  private applyPostFx() {
    if (this.renderer.type !== Phaser.WEBGL) return;
    try {
      const filters = this.cameras.main.filters.internal;
      // 背景がもう絵として完成しているので、ポストFXは弱め
      filters.addVignette(0.5, 0.5, 0.85, 0.35);
    } catch {
      // PR5でちゃんと作る
    }
  }

  // ====== ヘルパ: テキスト + ピル背景 ======
  // 文字は Phaser Text を超高解像度ラスタ化 (resolution=DPRx4) でクリアに描画する。
  // pixelArt 系のフィルタをかけないので、背景画 (bg) と同じく滑らかに。
  private placeLabel(
    x: number, y: number, text: string,
    opts: {
      font: string;
      size: number;
      color: string;
      letterSpacing?: number;
      bold?: boolean;
      withPill?: boolean;
    }
  ): Phaser.GameObjects.Container {
    const c = this.add.container(x, y);
    // 文字色は純白寄りで最大コントラスト、影も濃くする
    const textColor = opts.color === '#cfe9ff' ? '#ffffff' : opts.color;
    const t = this.add.text(0, 0, text, {
      fontFamily: opts.font,
      fontSize: `${opts.size}px`,
      color: textColor,
      fontStyle: opts.bold ? 'bold' : 'normal',
      letterSpacing: opts.letterSpacing ?? 0,
      // 強い黒影で背景画に対する可読性を確保
      shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 4, fill: true, stroke: true },
    } as Phaser.Types.GameObjects.Text.TextStyle).setOrigin(0.5, 0);
    // ★ ラスタ解像度をさらに上げる (DPR x 4)。画像scaleで粗くならない
    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    t.setResolution(Math.max(3, dpr * 4));

    if (opts.withPill) {
      const padX = 16, padY = 6;
      const w = Math.ceil(t.width) + padX * 2;
      const h = Math.ceil(t.height) + padY * 2;
      const bg = this.add.graphics();
      // よりはっきり読める濃い黒の半透明 + 水色のグロウ枠
      bg.fillStyle(0x000000, 0.88);
      bg.fillRoundedRect(-w / 2, -padY, w, h, h / 2);
      bg.lineStyle(2, 0x7fdcff, 0.55);
      bg.strokeRoundedRect(-w / 2, -padY, w, h, h / 2);
      c.add(bg);
    }
    c.add(t);
    return c;
  }
}

function parseHexColor(hex: string, fallback: number): number {
  if (!hex) return fallback;
  const m = hex.match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return fallback;
  return parseInt(m[1], 16);
}

// 2色を t (0..1) で線形補間 (0=base, 1=mix)
function blendColor(base: number, mix: number, t: number): number {
  const br = (base >> 16) & 0xff, bg = (base >> 8) & 0xff, bb = base & 0xff;
  const mr = (mix  >> 16) & 0xff, mg = (mix  >> 8) & 0xff, mb = mix  & 0xff;
  const r = Math.round(br + (mr - br) * t);
  const g = Math.round(bg + (mg - bg) * t);
  const b = Math.round(bb + (mb - bb) * t);
  return (r << 16) | (g << 8) | b;
}
