#!/usr/bin/env python3
"""
Prepare iPhone screenshots for App Store Connect upload.

Fixes the two things App Store Connect rejects:
  1. Alpha channel / transparency  -> flattened onto an opaque background (RGB).
  2. Wrong dimensions               -> resized to an accepted iPhone size.

App Store Connect accepts 1290x2796 for the 6.9"/6.7" iPhone slot, which is the
one required size; native iPhone Pro Max screenshots are already this size, so
usually only the alpha strip happens. Screenshots whose aspect ratio matches
(every modern iPhone) are scaled to the exact target; anything off-ratio is
letterboxed onto a background so nothing is distorted or cropped.

Usage:
  python3 scripts/prep_appstore_screenshots.py INPUT [INPUT ...] [-o OUTDIR]
                                                [--size WxH] [--bg '#0D0F14']
                                                [--jpeg]

  INPUT   one or more image files, or a directory of them
  -o      output directory (default: ./appstore-ready)
  --size  target WxH (default: 1290x2796)
  --bg    background color for flatten/letterbox (default: #0D0F14, the app bg)
  --jpeg  write JPEG instead of PNG (JPEG can never carry alpha)

Requires Pillow (`pip install Pillow`).
"""
import argparse
import os
import sys
from PIL import Image

EXTS = {".png", ".jpg", ".jpeg", ".heic", ".webp"}


def parse_size(s: str) -> tuple[int, int]:
    w, h = s.lower().split("x")
    return int(w), int(h)


def hex_to_rgb(s: str) -> tuple[int, int, int]:
    s = s.lstrip("#")
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore


def gather(inputs: list[str]) -> list[str]:
    files: list[str] = []
    for p in inputs:
        if os.path.isdir(p):
            for name in sorted(os.listdir(p)):
                if os.path.splitext(name)[1].lower() in EXTS:
                    files.append(os.path.join(p, name))
        elif os.path.isfile(p):
            files.append(p)
        else:
            print(f"  ! skip (not found): {p}")
    return files


def prep(path: str, outdir: str, size: tuple[int, int], bg: tuple[int, int, int], jpeg: bool) -> None:
    tw, th = size
    img = Image.open(path)

    # Flatten any transparency onto an opaque background -> guaranteed no alpha.
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        flat = Image.new("RGB", img.size, bg)
        flat.paste(img, mask=img.split()[-1])
        img = flat
    else:
        img = img.convert("RGB")

    w, h = img.size
    src_ratio, tgt_ratio = w / h, tw / th

    if (w, h) == (tw, th):
        out = img
        note = "exact size, alpha stripped"
    elif abs(src_ratio - tgt_ratio) < 0.01:
        out = img.resize((tw, th), Image.LANCZOS)
        note = f"scaled {w}x{h} -> {tw}x{th}"
    else:
        # Off aspect ratio: fit inside the target and letterbox, never crop/distort.
        scale = min(tw / w, th / h)
        nw, nh = round(w * scale), round(h * scale)
        canvas = Image.new("RGB", (tw, th), bg)
        canvas.paste(img.resize((nw, nh), Image.LANCZOS), ((tw - nw) // 2, (th - nh) // 2))
        out = canvas
        note = f"letterboxed {w}x{h} -> {tw}x{th} (aspect differs)"

    os.makedirs(outdir, exist_ok=True)
    stem = os.path.splitext(os.path.basename(path))[0]
    ext = ".jpg" if jpeg else ".png"
    dest = os.path.join(outdir, f"{stem}_appstore{ext}")
    if jpeg:
        out.save(dest, "JPEG", quality=95)
    else:
        out.save(dest, "PNG")
    print(f"  ok  {os.path.basename(path)} -> {os.path.basename(dest)}  ({note})")


def main() -> int:
    ap = argparse.ArgumentParser(description="Prep iPhone screenshots for App Store Connect.")
    ap.add_argument("inputs", nargs="+", help="image files or a directory")
    ap.add_argument("-o", "--outdir", default="appstore-ready")
    ap.add_argument("--size", default="1290x2796")
    ap.add_argument("--bg", default="#0D0F14")
    ap.add_argument("--jpeg", action="store_true")
    args = ap.parse_args()

    files = gather(args.inputs)
    if not files:
        print("No images found.")
        return 1
    size, bg = parse_size(args.size), hex_to_rgb(args.bg)
    print(f"Target {args.size}, background {args.bg}, output -> {args.outdir}/")
    for f in files:
        try:
            prep(f, args.outdir, size, bg, args.jpeg)
        except Exception as e:  # noqa: BLE001 - report and continue the batch
            print(f"  !! {os.path.basename(f)}: {e}")
    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
