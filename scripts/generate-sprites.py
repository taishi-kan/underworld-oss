"""
generate-sprites.py — pollinations.ai 経由で Underworld の キャラスプライトを生成

アニメ・ファンタジー系で、ドット化はしない。
高解像度のまま保存し、Phaser側は LINEAR で滑らかに縮小して表示する。

実行:
    python scripts/generate-sprites.py [--id <character_id>] [--seed <int>]
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.parse
from io import BytesIO

import requests
from PIL import Image

OUT_DIR = "public/sprites/characters"
GEN_MODEL = "flux"

# 生成解像度。frame_size は assets.ts 側の frameW/frameH と一致させる
CHARACTERS = [
    {
        "id": "guide-ai",
        "size": (320, 448),
        "seed": 1101,
        "prompt": (
            "anime fantasy character art, ethereal hooded mystic guide spirit, "
            ""
            "flowing pearl white robes with soft gold trim, "
            "holographic blue inner glow, hood casting gentle shadow, "
            "slight floating posture, sacred temple aesthetic, "
            "full body, single character centered, "
            "high detail, beautiful digital painting, high quality studio anime style, "
            "isolated on solid plain pure black background, "
            "limited color palette: deep navy #04081a, holographic blue #7fdcff, "
            "pearl white #cfe9ff, soft gold accent #e8d6a3"
        ),
    },
    {
        "id": "marketing-expert",
        "size": (256, 384),
        "seed": 1102,
        "prompt": (
            "anime fantasy character art, holographic strategist spirit, "
            ""
            "translucent holographic blue robes (#7fdcff), "
            "floating glowing tactical compass disc symbol, "
            "sharp confident floating posture, sacred temple aesthetic, "
            "full body, single character centered, "
            "high detail, beautiful digital painting, "
            "isolated on solid plain pure black background, "
            "limited color palette: deep navy #04081a, holographic blue #7fdcff, pearl white"
        ),
    },
    {
        "id": "copywriting-expert",
        "size": (256, 384),
        "seed": 1103,
        "prompt": (
            "anime fantasy character art, holographic scribe spirit, "
            ""
            "soft cyan flowing translucent robes (#a5e8ff), "
            "holding glowing light pen quill, poised writing posture, "
            "sacred temple aesthetic, full body, single character centered, "
            "high detail, beautiful digital painting, "
            "isolated on solid plain pure black background, "
            "limited color palette: deep navy, soft cyan #a5e8ff, pearl white"
        ),
    },
    {
        "id": "design-expert",
        "size": (256, 384),
        "seed": 1104,
        "prompt": (
            "anime fantasy character art, holographic designer spirit, "
            ""
            "violet white robes (#bfd4ff) with gradient layers, "
            "rotating color ring halo around hands, "
            "graceful balanced floating posture, sacred temple aesthetic, "
            "full body, single character centered, "
            "high detail, beautiful digital painting, "
            "isolated on solid plain pure black background, "
            "limited color palette: deep navy, violet white #bfd4ff, soft purple"
        ),
    },
    {
        "id": "engineering-expert",
        "size": (256, 384),
        "seed": 1105,
        "prompt": (
            "anime fantasy character art, holographic engineer spirit, "
            ""
            "cyan green robes (#9affd6) with circuit pattern accents, "
            "geometric code lattice symbol around hands, "
            "focused analytical floating posture, sacred temple aesthetic, "
            "full body, single character centered, "
            "high detail, beautiful digital painting, "
            "isolated on solid plain pure black background, "
            "limited color palette: deep navy, cyan green #9affd6, pearl white"
        ),
    },
]


def fetch(prompt: str, w: int, h: int, seed: int) -> Image.Image:
    """pollinations は 429 (rate limit) を返すことがあるので指数バックオフで再試行"""
    import time
    enc = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{enc}"
        f"?width={w}&height={h}&nologo=true&seed={seed}&model={GEN_MODEL}"
    )
    print(f"  fetch w={w} h={h} seed={seed} ...", flush=True)
    delays = [0, 30, 60, 120, 240]  # 試行間隔 (秒)
    last_err: Exception | None = None
    for i, wait in enumerate(delays):
        if wait:
            print(f"    rate-limited、{wait}s 待機して再試行...", flush=True)
            time.sleep(wait)
        try:
            resp = requests.get(url, timeout=240)
            if resp.status_code == 429:
                last_err = requests.exceptions.HTTPError(f"429 attempt {i+1}/{len(delays)}")
                continue
            resp.raise_for_status()
            return Image.open(BytesIO(resp.content)).convert("RGBA")
        except requests.exceptions.HTTPError as e:
            last_err = e
            if e.response is not None and e.response.status_code != 429:
                raise
    raise RuntimeError(f"fetch failed after retries: {last_err}")


def remove_bg(img: Image.Image, threshold: int = 60) -> Image.Image:
    """四隅平均色 ≒ 背景色 として近い画素を透過に"""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    avg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            d = abs(r - avg[0]) + abs(g - avg[1]) + abs(b - avg[2])
            if d < threshold:
                px[x, y] = (0, 0, 0, 0)
    return img


def generate_one(spec: dict, seed_override: int | None = None) -> str:
    seed = seed_override if seed_override is not None else spec["seed"]
    print(f"[{spec['id']}] generating ({spec['size'][0]}x{spec['size'][1]}, seed={seed})...")
    img = fetch(spec["prompt"], spec["size"][0], spec["size"][1], seed)
    img = remove_bg(img)
    out = os.path.join(OUT_DIR, f"{spec['id']}.png")
    os.makedirs(OUT_DIR, exist_ok=True)
    img.save(out)
    print(f"  -> {out}")
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--id", help="単一キャラだけ再生成")
    p.add_argument("--seed", type=int, help="seed上書き (再ガチャ)")
    args = p.parse_args()

    targets = [c for c in CHARACTERS if not args.id or c["id"] == args.id]
    if not targets:
        print(f"unknown id: {args.id}", file=sys.stderr)
        sys.exit(1)
    for spec in targets:
        generate_one(spec, args.seed)
    print("done.")


if __name__ == "__main__":
    main()
