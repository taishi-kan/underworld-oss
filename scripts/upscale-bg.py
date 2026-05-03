"""
upscale-bg.py — Real-ESRGAN (ncnn-vulkan) で背景を AI 4倍アップスケール

無料・オフライン。初回実行時にバイナリ (~30MB) を自動ダウンロード。
ランタイム要件: Vulkan 対応 GPU (Windows 10/11 の大半で OK)。

実行:
    python scripts/upscale-bg.py [--input <path>] [--scale 4]
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

# Windows 用 Real-ESRGAN ncnn-vulkan リリース
REALESRGAN_URL = (
    "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/"
    "realesrgan-ncnn-vulkan-20220424-windows.zip"
)
TOOL_DIR = Path("scripts/.realesrgan")
TOOL_EXE = TOOL_DIR / "realesrgan-ncnn-vulkan.exe"

DEFAULT_INPUT = Path("public/sprites/background.png")
TARGET_W, TARGET_H = 1920, 1080


def ensure_tool() -> bool:
    """Real-ESRGAN binary を用意する。成功なら True"""
    if TOOL_EXE.exists():
        return True
    print(f"初回実行: Real-ESRGAN を {TOOL_DIR} に download します (~30MB)...", flush=True)
    TOOL_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = TOOL_DIR / "realesrgan.zip"
    try:
        urllib.request.urlretrieve(REALESRGAN_URL, zip_path)
    except Exception as e:
        print(f"  download失敗: {e}", file=sys.stderr)
        return False
    try:
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(TOOL_DIR)
    finally:
        if zip_path.exists():
            zip_path.unlink()

    # Zip の中はサブフォルダ構造の可能性があるので探索
    if not TOOL_EXE.exists():
        for found in TOOL_DIR.rglob("realesrgan-ncnn-vulkan.exe"):
            for f in found.parent.iterdir():
                target = TOOL_DIR / f.name
                if not target.exists():
                    shutil.copy(f, target) if f.is_file() else shutil.copytree(f, target)
            break

    if not TOOL_EXE.exists():
        print("  zip 内に exe 見つからず", file=sys.stderr)
        return False
    print("  download complete.")
    return True


def ai_upscale(input_path: Path, output_path: Path, scale: int = 4) -> bool:
    """Real-ESRGAN で AI アップスケール。Vulkan が動かない時は False"""
    cmd = [
        str(TOOL_EXE.resolve()),
        "-i", str(input_path.resolve()),
        "-o", str(output_path.resolve()),
        "-n", "realesrgan-x4plus",
        "-s", str(scale),
    ]
    print(f"  realesrgan: {' '.join(cmd)}", flush=True)
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        if result.returncode != 0:
            print(f"  realesrgan error rc={result.returncode}\n  stderr={result.stderr}", file=sys.stderr)
            return False
        return output_path.exists()
    except Exception as e:
        print(f"  realesrgan exception: {e}", file=sys.stderr)
        return False


def fallback_sharpen(input_path: Path, output_path: Path):
    """Vulkan が動かない時の PIL フォールバック (AI ではないが無い手より)"""
    print("  fallback: PIL UnsharpMask + Sharpness", flush=True)
    img = Image.open(input_path).convert("RGB")
    img = img.resize((TARGET_W * 2, TARGET_H * 2), Image.LANCZOS)
    img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=180, threshold=3))
    img = ImageEnhance.Sharpness(img).enhance(1.4)
    img.save(output_path)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", default=str(DEFAULT_INPUT))
    p.add_argument("--scale", type=int, default=4, choices=[2, 3, 4])
    args = p.parse_args()

    bg = Path(args.input)
    if not bg.exists():
        print(f"ERROR: {bg} が見つかりません。先に generate-bg.py で生成してください", file=sys.stderr)
        sys.exit(1)

    src = Image.open(bg)
    print(f"input: {bg} ({src.size})")
    src.close()

    tmp = bg.with_suffix(".upscaled.png")

    # Step 1: AI upscale を試行
    used_ai = False
    if ensure_tool():
        used_ai = ai_upscale(bg, tmp, args.scale)

    # Step 2: 失敗時は PIL フォールバック
    if not used_ai:
        print("AI 失敗、PIL シャープニングで代替", flush=True)
        fallback_sharpen(bg, tmp)

    # Step 3: 1920x1080 に整える
    img = Image.open(tmp).convert("RGB")
    print(f"  intermediate: {img.size}")
    if img.size != (TARGET_W, TARGET_H):
        img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    img.save(bg)
    tmp.unlink()

    final = Image.open(bg)
    method = "AI upscale" if used_ai else "PIL sharpen"
    print(f"done: {bg} ({final.size}) - {method}")


if __name__ == "__main__":
    main()
