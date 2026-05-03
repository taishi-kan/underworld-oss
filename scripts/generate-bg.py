"""
generate-bg.py — pollinations.ai で Underworld の背景画 (HD-2D スタイル) を生成

実行:
    python scripts/generate-bg.py [--seed <int>] [--out <path>]

960x540 の背景イラスト1枚を public/sprites/background.png に保存。
スプライト (キャラ等) はこの背景の上に重ねて配置する。
"""

from __future__ import annotations

import argparse
import os
import urllib.parse
from io import BytesIO

import requests
from PIL import Image

DEFAULT_OUT = "public/sprites/background.png"
GEN_MODEL = "flux"
# pollinations は 1024 が上限なので native を取り、後段で upscale-bg.py が AI 4倍化する
GEN_W, GEN_H = 1920, 1080        # API リクエスト (実際は 1024x576 で返ってくる)
TARGET_W, TARGET_H = 0, 0        # 0=リサイズしない (上流は upscale-bg.py に任せる)
DEFAULT_SEED = 42

# プロンプト: 神聖な知識神殿の内部、斜め見下ろし、HD-2D 背景アート
PROMPT = (
    "sacred mystical knowledge temple interior, "
    "oblique top-down view from above and slightly behind, "
    "vast holographic blue cathedral hall with high vaulted ceiling, "
    "central glowing altar circle with magic runes inscribed on the floor, "
    "four tall stone pillars with floating blue light orbs at their tops, "
    "deep navy stone floor with luminescent ancient runes glowing soft cyan, "
    "distant ornate arched gateway at the very back of the hall, "
    "holographic blue cyan and pearl white color palette with subtle gold accents, "
    "soft mystical volumetric lighting, ethereal foggy atmosphere, "
    "painted JRPG game background art, HD-2D pixelart-painting hybrid style, "
    "16:9 wide cinematic composition, "
    "no characters, no people, no text, isolated empty stage interior, "
    "fantasy game environment art"
)


def fetch(prompt: str, w: int, h: int, seed: int) -> Image.Image:
    """429時は指数バックオフ"""
    import time
    enc = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{enc}"
        f"?width={w}&height={h}&nologo=true&seed={seed}&model={GEN_MODEL}"
    )
    print(f"  fetch w={w} h={h} seed={seed} ...", flush=True)
    delays = [0, 30, 60, 120, 240]
    last_err: Exception | None = None
    for i, wait in enumerate(delays):
        if wait:
            print(f"    rate-limited, retry in {wait}s...", flush=True)
            time.sleep(wait)
        try:
            resp = requests.get(url, timeout=240)
            if resp.status_code == 429:
                last_err = requests.exceptions.HTTPError(f"429 attempt {i+1}/{len(delays)}")
                continue
            resp.raise_for_status()
            return Image.open(BytesIO(resp.content)).convert("RGB")
        except requests.exceptions.HTTPError as e:
            last_err = e
            if e.response is not None and e.response.status_code != 429:
                raise
    raise RuntimeError(f"fetch failed after retries: {last_err}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--seed", type=int, default=DEFAULT_SEED, help="seed (再ガチャ用)")
    p.add_argument("--out", default=DEFAULT_OUT, help="出力PNG パス")
    args = p.parse_args()

    print(f"[bg] generating (req {GEN_W}x{GEN_H}, seed={args.seed})...")
    img = fetch(PROMPT, GEN_W, GEN_H, args.seed)
    print(f"  got {img.size} (pollinations cap)")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    img.save(args.out)
    print(f"  -> {args.out}")
    print(f"次: python scripts/upscale-bg.py で AI 4倍にし、1920x1080 にする")


if __name__ == "__main__":
    main()
