/**
 * capture-screenshot.mjs — Underworld のスクリーンショットを自動撮影する
 *
 * 用途:
 *   - README のヒーロー画像 (docs/screenshot.png) を更新するとき
 *   - 仕様変更後にビジュアルを確認したいとき
 *
 * 使い方:
 *   1. 別ターミナルで `npm run dev` を起動 (もしくは npm run screenshot:full で自動)
 *   2. このスクリプトを実行: `node scripts/capture-screenshot.mjs`
 *   3. docs/screenshot.png が更新される
 *
 * オプション環境変数:
 *   SCREENSHOT_URL  撮影先 (default: http://localhost:3000)
 *   SCREENSHOT_OUT  出力パス (default: docs/screenshot.png)
 *   SCREENSHOT_WAIT 撮影前に待つ追加ms (default: 4500、Phaser/アニメーション用)
 */

import { chromium } from 'playwright';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const URL = process.env.SCREENSHOT_URL || 'http://localhost:3000';
const OUT = process.env.SCREENSHOT_OUT || 'docs/screenshot.png';
const WAIT_MS = Number(process.env.SCREENSHOT_WAIT ?? 4500);

console.log(`[capture] Underworld のスクリーンショットを撮影します`);
console.log(`  URL  : ${URL}`);
console.log(`  out  : ${OUT}`);
console.log(`  wait : ${WAIT_MS} ms (Phaser シーン描画 + アニメ用)`);

await mkdir(dirname(OUT), { recursive: true });

// WebGL を確実にハードウェア相当で動かすためフラグ追加 (Phaser の bloom/glow 対策)
const browser = await chromium.launch({
  args: [
    '--use-gl=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-accelerated-2d-canvas',
  ],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

// devサーバ起動直後だと初回コンパイルで時間が掛かるので長めの timeout
console.log(`[capture] open ${URL} ...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });

// Phaser canvas が DOM に挿入されるまで待つ
console.log(`[capture] wait for canvas...`);
await page.waitForSelector('canvas', { timeout: 30000 });

// 「materializing underworld…」のローディングが消えるのを待つ
await page
  .waitForFunction(
    () => !document.body.textContent?.includes('materializing underworld'),
    { timeout: 15000 }
  )
  .catch(() => {
    console.warn('[capture] loading text 消失待ち timeout (続行)');
  });

// Phaser シーンの初期化 + 発光エフェクトのフェードイン
console.log(`[capture] settle for ${WAIT_MS}ms...`);
await sleep(WAIT_MS);

console.log(`[capture] screenshot → ${OUT}`);
await page.screenshot({ path: OUT, fullPage: false });

await browser.close();
console.log(`[capture] done.`);
