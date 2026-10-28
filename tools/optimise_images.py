#!/usr/bin/env python3
"""Generate small, browser-ready WebP display images while preserving originals.

Requires Pillow. Run: python3 tools/optimise_images.py
Source PNG/JPEG files are never modified or removed.
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "images"
TARGET = SOURCE / "optimized"

# Covers render around 450 px in the UI. Keep enough pixels for high-DPI screens.
# Backgrounds fill large displays; allow a wider source image.
GROUPS = {
    "covers": (1200, 1200),
    "backgrounds": (1920, 1440),
    "instruments": (1300, 1300),
    "ui": (640, 640),
}
EXCLUDED = {"bass-tuner-0.png", "bass-tuner-30.png", "bass-tuner-70.png", "bass-tuner-90.png"}

def convert(source: Path, dest: Path, limits: tuple[int, int]) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as raw:
        image = ImageOps.exif_transpose(raw)
        image.thumbnail(limits, Image.Resampling.LANCZOS)
        # Keep real transparency of instrument artwork.
        if image.mode not in ("RGBA", "RGB"):
            image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
        image.save(dest, format="WEBP", quality=88, method=6)
    original_size = source.stat().st_size
    new_size = dest.stat().st_size
    print(f"{source.relative_to(ROOT)} -> {dest.relative_to(ROOT)}: {original_size:,} -> {new_size:,} bytes ({100 * new_size / original_size:.1f}%)")

def main() -> None:
    for group, limit in GROUPS.items():
        for source in sorted((SOURCE / group).iterdir()):
            if source.suffix.lower() not in (".png", ".jpg", ".jpeg") or source.name in EXCLUDED:
                continue
            convert(source, TARGET / group / (source.stem + ".webp"), limit)

if __name__ == "__main__":
    main()
