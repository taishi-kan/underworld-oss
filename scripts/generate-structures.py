"""
generate-structures.py — pollinations.ai で構造物 (扉等) のアートを生成

ドット化はせず、高解像度のままアニメ・ファンタジー絵で出す。
linked_world ごとにテーマ別に出すなら --id <world_id> で個別呼び出し。

実行:
    python scripts/generate-structures.py            # 全部
    python scripts/generate-structures.py --id door  # generic 扉のみ
    python scripts/generate-structures.py --seed 9999  # seed 上書き
"""

from __future__ import annotations

import argparse
import os
import urllib.parse
from io import BytesIO

import requests
from PIL import Image

OUT_DIR = "public/sprites/structures"
GEN_MODEL = "flux"

STRUCTURES = [
    {
        "id": "door",  # generic、tint で着色する
        "size": (256, 384),
        "seed": 2101,
        "prompt": (
            "anime fantasy magical door, "
            "ornate stone gateway with arched top, "
            "intricate glowing magic runes etched on stone frame, "
            "swirling translucent magic portal inside the doorway, "
            "viewed front-on directly facing camera, "
            "holographic blue and white color palette with soft glow, "
            "sacred temple aesthetic, beautiful digital painting, "
            "single door centered, isolated on solid plain pure black background, "
            "no characters, no text"
        ),
    },
    # 各 linked world テーマ別の扉 (Phase B)。
    # 名前は world id と一致させると assets.ts で使いやすい。
    {
        "id": "door-design-underworld",
        "size": (256, 384),
        "seed": 2201,
        "prompt": (
            "anime fantasy magical door to a creative design realm, "
            ""
            "ornate violet purple stone gateway, "
            "intricate art deco ornaments and brushstroke runes, "
            "swirling violet purple translucent portal showing colorful palette inside, "
            "viewed front-on, single door centered, "
            "isolated on solid plain pure black background, no characters, no text, "
            "color palette violet purple #b39bff white"
        ),
    },
    {
        "id": "door-legal-underworld",
        "size": (256, 384),
        "seed": 2202,
        "prompt": (
            "anime fantasy magical door to a justice realm, "
            ""
            "ornate warm gold stone gateway with scales of justice motif, "
            "intricate scroll and seal runes engraved, "
            "swirling warm orange translucent portal inside, "
            "viewed front-on, single door centered, "
            "isolated on solid plain pure black background, no characters, no text, "
            "color palette warm gold orange #ffd29b white"
        ),
    },
    {
        "id": "door-education-underworld",
        "size": (256, 384),
        "seed": 2203,
        "prompt": (
            "anime fantasy magical door to a knowledge realm, "
            ""
            "ornate mint green stone gateway, "
            "intricate book spine and feather quill ornaments, "
            "swirling mint green translucent portal showing books inside, "
            "viewed front-on, single door centered, "
            "isolated on solid plain pure black background, no characters, no text, "
            "color palette mint green #9bffcb white"
        ),
    },
]


def fetch(prompt: str, w: int, h: int, seed: int) -> Image.Image:
    enc = urllib.parse.quote(prompt)
    url = (
        f"https://image.pollinations.ai/prompt/{enc}"
        f"?width={w}&height={h}&nologo=true&seed={seed}&model={GEN_MODEL}"
    )
    print(f"  fetch w={w} h={h} seed={seed} ...", flush=True)
    resp = requests.get(url, timeout=240)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGBA")


def remove_bg(img: Image.Image, threshold: int = 60) -> Image.Image:
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


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--id", help="単一だけ再生成")
    p.add_argument("--seed", type=int, help="seed上書き")
    args = p.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    targets = [s for s in STRUCTURES if not args.id or s["id"] == args.id]

    for spec in targets:
        seed = args.seed if args.seed is not None else spec["seed"]
        print(f"[{spec['id']}] generating...")
        img = fetch(spec["prompt"], spec["size"][0], spec["size"][1], seed)
        img = remove_bg(img)
        out = os.path.join(OUT_DIR, f"{spec['id']}.png")
        img.save(out)
        print(f"  -> {out}")

    print("done.")


if __name__ == "__main__":
    main()
