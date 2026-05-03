"""
generate-bg-replicate.py — Replicate API で背景を高解像度生成

flux-1.1-pro-ultra (~$0.06/枚, 4MP出力) を使う。pollinations の 1024 上限を回避。

事前準備:
  1. https://replicate.com/account/api-tokens でAPIトークン取得 (GitHub login)
  2. PowerShell で1セッション限り:  $env:REPLICATE_API_TOKEN = "r8_xxxx..."
     永続化したいなら setx REPLICATE_API_TOKEN "r8_xxxx..." (新ターミナルで反映)

実行:
  python scripts/generate-bg-replicate.py [--seed <int>] [--out <path>]
  python scripts/generate-bg-replicate.py --model flux-1.1-pro  # 通常版 ($0.04/枚)
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from io import BytesIO

import requests
from PIL import Image

DEFAULT_OUT = "public/sprites/background.png"
TARGET_W, TARGET_H = 1920, 1080  # canvas と一致

# 出力アスペクト比 (flux-1.1-pro-ultra は 16:9 で約 2752x1536 を返す)
ASPECT_RATIO = "16:9"
# モデル選択
MODELS = {
    "flux-1.1-pro-ultra": "black-forest-labs/flux-1.1-pro-ultra",  # 4MP, ~$0.06
    "flux-1.1-pro":       "black-forest-labs/flux-1.1-pro",        # 2MP, ~$0.04
    "flux-pro":           "black-forest-labs/flux-pro",             # ~$0.055
}

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
    "anime fantasy game background art, HD-2D pixelart-painting hybrid style, "
    "16:9 wide cinematic composition, ultra detailed, sharp 4k, "
    "no characters, no people, no text, isolated empty stage interior"
)


def predict(model_path: str, prompt: str, seed: int) -> bytes:
    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        print("ERROR: REPLICATE_API_TOKEN が未設定です", file=sys.stderr)
        print("取得: https://replicate.com/account/api-tokens", file=sys.stderr)
        print('  PowerShell: $env:REPLICATE_API_TOKEN = "r8_xxxx..."', file=sys.stderr)
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "wait",  # 同期呼び出し (通常 60s 以内に完了)
    }
    payload = {
        "input": {
            "prompt": prompt,
            "aspect_ratio": ASPECT_RATIO,
            "output_format": "png",
            "safety_tolerance": 5,
            "seed": seed,
            "raw": False,
        }
    }
    print(f"  POST replicate (model={model_path}, seed={seed})...", flush=True)
    r = requests.post(
        f"https://api.replicate.com/v1/models/{model_path}/predictions",
        headers=headers, json=payload, timeout=300,
    )
    r.raise_for_status()
    data = r.json()

    # Prefer:wait なら通常 succeeded で返るが、念のためポーリング
    while data.get("status") in ("starting", "processing"):
        time.sleep(2)
        poll = requests.get(
            data["urls"]["get"],
            headers={"Authorization": f"Bearer {token}"},
            timeout=60,
        )
        poll.raise_for_status()
        data = poll.json()

    if data.get("status") != "succeeded":
        raise RuntimeError(f"prediction failed: status={data.get('status')} error={data.get('error')}")

    out = data.get("output")
    if isinstance(out, list):
        out = out[0]
    if not out:
        raise RuntimeError(f"no output url: {data}")

    print(f"  download {out}", flush=True)
    img_resp = requests.get(out, timeout=120)
    img_resp.raise_for_status()
    return img_resp.content


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--out", default=DEFAULT_OUT)
    p.add_argument("--model", default="flux-1.1-pro-ultra", choices=list(MODELS.keys()))
    args = p.parse_args()

    model_path = MODELS[args.model]
    print(f"[bg] generating via {model_path}, seed={args.seed}, target={TARGET_W}x{TARGET_H}")
    raw = predict(model_path, PROMPT, args.seed)
    img = Image.open(BytesIO(raw)).convert("RGB")
    print(f"  got native {img.size}")
    if img.size != (TARGET_W, TARGET_H):
        # 16:9 比率で来るが寸法が違うので canvas に合わせる
        img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
        print(f"  resized to {TARGET_W}x{TARGET_H} (LANCZOS)")
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    img.save(args.out)
    print(f"  -> {args.out}")


if __name__ == "__main__":
    main()
