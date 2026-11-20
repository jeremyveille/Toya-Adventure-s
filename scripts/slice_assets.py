"""
scripts/slice_assets.py
Milestone 1: Automated Asset Ingestion, Slicing & Transparency Pipeline.

Extracts discrete, transparent PNG assets from collection.webp, planche_2.webp,
and existing spritesheets, adhering to 2.5D RPG contracts and 32-bit RGBA formats.
"""

import os
import sys
import shutil
import hashlib
import subprocess

# Auto-detect local site-packages containing Pillow if needed
for p in [
    os.path.expanduser(r"~/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Lib/site-packages"),
    r"C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\Lib\site-packages",
]:
    if os.path.exists(p) and p not in sys.path:
        sys.path.insert(0, p)

def _load_pillow():
    try:
        from PIL import Image, ImageDraw
        return Image, ImageDraw
    except Exception:
        return None, None

Image, ImageDraw = _load_pillow()

if Image is None:
    # Attempt to locate and delegate to a compatible Python runtime on the host
    candidates = [
        r"C:\Users\jerem\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
        r"C:\Users\jerem\AppData\Local\Programs\Python\Python312\python.exe",
        os.path.expanduser(r"~/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"),
    ]
    cur_exe = os.path.normcase(os.path.abspath(sys.executable))
    for candidate in candidates:
        if os.path.exists(candidate) and os.path.normcase(os.path.abspath(candidate)) != cur_exe:
            print(f"[Runtime] Current Python ({sys.executable}) lacks Pillow; delegating to {candidate}")
            res = subprocess.run([candidate, os.path.abspath(__file__)] + sys.argv[1:])
            sys.exit(res.returncode)

    print("FATAL: Pillow (PIL) is not installed in the active environment and no compatible runtime was found.", file=sys.stderr)
    sys.exit(1)

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ASSETS_DIR = os.path.join(WORKSPACE_DIR, "assets")
DOWNLOADS_SOURCE = r"c:\Users\jerem\Downloads\Collection de ressources pixel-art pour RPG fantastique-1.webp"

TARGET_DIRS = [
    os.path.join(ASSETS_DIR, "items"),
    os.path.join(ASSETS_DIR, "props"),
    os.path.join(ASSETS_DIR, "monsters"),
    os.path.join(ASSETS_DIR, "ui"),
    os.path.join(ASSETS_DIR, "characters"),
]

def ensure_asset_ingestion():
    """Ensure assets/collection.webp exists idempotently."""
    dst = os.path.join(ASSETS_DIR, "collection.webp")
    if os.path.exists(dst) and os.path.getsize(dst) > 100000:
        print(f"[Ingestion] assets/collection.webp already present ({os.path.getsize(dst)} bytes).")
        return dst

    if os.path.exists(DOWNLOADS_SOURCE):
        print(f"[Ingestion] Copying collection from {DOWNLOADS_SOURCE} -> {dst}")
        tmp_dst = dst + ".tmp"
        shutil.copy2(DOWNLOADS_SOURCE, tmp_dst)
        os.replace(tmp_dst, dst)
        print(f"[Ingestion] Successfully copied collection.webp ({os.path.getsize(dst)} bytes).")
        return dst

    raise FileNotFoundError(f"Source WebP not found at {DOWNLOADS_SOURCE} and not in {dst}")


def ensure_directories():
    """Ensure all target asset subdirectories exist."""
    for d in TARGET_DIRS:
        os.makedirs(d, exist_ok=True)
        print(f"[Directory] Ensured {d}")


def atomic_save_png(img, dest_path):
    """Save PIL Image as 32-bit RGBA PNG atomically."""
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    rgba_img = img.convert("RGBA")
    tmp_path = dest_path + ".tmp"
    rgba_img.save(tmp_path, "PNG")
    os.replace(tmp_path, dest_path)
    print(f"[Saved] {dest_path} -> {rgba_img.size} ({rgba_img.mode})")


def slice_and_save(src_path, crop_box, dest_path, target_size=None, alpha_threshold=30, custom_filter=None):
    """
    Slices a region from src_path, cleans alpha noise, auto-trims margins,
    applies optional sizing/filtering, and saves to dest_path atomically.
    """
    full_src = os.path.join(WORKSPACE_DIR, src_path) if not os.path.isabs(src_path) else src_path
    if not os.path.exists(full_src):
        raise FileNotFoundError(f"Source image not found: {full_src}")

    src_img = Image.open(full_src).convert("RGBA")
    w_src, h_src = src_img.size

    x1, y1, x2, y2 = crop_box
    if not (0 <= x1 < x2 <= w_src and 0 <= y1 < y2 <= h_src):
        raise ValueError(f"Invalid crop bounds {crop_box} for image {src_path} of size {w_src}x{h_src}")

    crop = src_img.crop(crop_box)

    # Cut off lossy WebP ringing (pure PIL, zero numpy dependency)
    r, g, b, a = crop.split()
    a = a.point(lambda p: 0 if p < alpha_threshold else p)
    clean = Image.merge("RGBA", (r, g, b, a))

    # Trim outer transparent boundaries
    bbox = clean.getbbox()
    if bbox:
        clean = clean.crop(bbox)

    if custom_filter:
        clean = custom_filter(clean)

    if target_size:
        clean = clean.resize(target_size, Image.Resampling.NEAREST)

    atomic_save_png(clean, dest_path)


# ==========================================
# PROCEDURAL PIXEL-ART GENERATORS
# ==========================================

def generate_potion(dest_path):
    """Generate 32x32 clean pixel-art red health potion icon."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Wooden cork
    d.rectangle([13, 3, 18, 7], fill=(140, 90, 45, 255))
    d.rectangle([14, 4, 17, 6], fill=(185, 125, 65, 255))
    # Glass neck
    d.rectangle([12, 7, 19, 10], fill=(180, 215, 245, 190))
    # Flask body
    d.ellipse([5, 9, 26, 29], fill=(215, 30, 50, 245))  # Crimson potion liquid
    d.arc([5, 9, 26, 29], 0, 360, fill=(230, 240, 255, 220), width=1)  # Glass reflection rim
    # Inner meniscus and bubbles
    d.ellipse([7, 13, 24, 27], fill=(235, 45, 65, 255))
    d.point([(10, 16), (20, 21), (12, 23)], fill=(255, 160, 160, 255))
    # Highlight shine
    d.line([8, 14, 10, 24], fill=(255, 255, 255, 210), width=1)
    d.point([(9, 13), (11, 25)], fill=(255, 255, 255, 240))
    atomic_save_png(img, dest_path)


def generate_bridge(dest_path):
    """Generate 32x32 clean pixel-art wooden bridge item icon."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Lateral support beams
    d.rectangle([2, 6, 29, 9], fill=(78, 52, 46, 255))
    d.rectangle([2, 22, 29, 25], fill=(78, 52, 46, 255))
    # Vertical wood planks
    for px in [4, 10, 16, 22]:
        d.rectangle([px, 4, px + 4, 27], fill=(138, 98, 53, 255))
        d.rectangle([px + 1, 5, px + 3, 26], fill=(170, 125, 75, 255))
        d.point([(px + 1, 6), (px + 1, 24)], fill=(40, 25, 15, 255))  # Nails
    # Rope bindings
    d.line([(3, 6), (3, 25)], fill=(215, 185, 125, 255), width=2)
    d.line([(28, 6), (28, 25)], fill=(215, 185, 125, 255), width=2)
    atomic_save_png(img, dest_path)


def generate_wood(dest_path):
    """Generate 32x32 clean pixel-art wood log item icon with transparent corners."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Dark bark outline / silhouette
    d.rectangle([8, 9, 27, 23], fill=(62, 39, 25, 255))
    d.ellipse([23, 9, 29, 23], fill=(62, 39, 25, 255))

    # Bark body fill
    d.rectangle([8, 10, 26, 22], fill=(110, 68, 38, 255))
    d.ellipse([22, 10, 28, 22], fill=(95, 58, 32, 255))

    # Top highlight on bark
    d.line([(8, 11), (25, 11)], fill=(160, 108, 65, 255), width=1)
    d.line([(10, 12), (24, 12)], fill=(138, 90, 52, 255), width=1)

    # Bottom shadow on bark
    d.line([(8, 21), (25, 21)], fill=(75, 45, 25, 255), width=1)
    d.line([(8, 22), (26, 22)], fill=(50, 30, 18, 255), width=1)

    # Wood grain lines along trunk
    d.line([(11, 14), (16, 14)], fill=(78, 48, 24, 255), width=1)
    d.line([(20, 14), (25, 14)], fill=(78, 48, 24, 255), width=1)
    d.line([(9, 17), (14, 17)], fill=(78, 48, 24, 255), width=1)
    d.line([(18, 17), (24, 17)], fill=(78, 48, 24, 255), width=1)
    d.line([(12, 19), (22, 19)], fill=(85, 52, 28, 255), width=1)

    # Tree knot on bark
    d.rectangle([17, 13, 19, 15], fill=(55, 32, 18, 255))
    d.point([(18, 14)], fill=(35, 20, 10, 255))
    d.point([(16, 14), (20, 14), (18, 12), (18, 16)], fill=(138, 90, 52, 255))

    # Left cut cross-section (end cap showing tree rings)
    d.ellipse([3, 9, 13, 23], fill=(62, 39, 25, 255))
    d.ellipse([4, 10, 12, 22], fill=(218, 175, 120, 255))
    d.ellipse([5, 11, 11, 21], outline=(175, 130, 80, 255), width=1)
    d.ellipse([6, 13, 10, 19], outline=(190, 145, 95, 255), width=1)
    d.ellipse([7, 15, 9, 17], fill=(130, 85, 45, 255))
    d.point([(8, 16)], fill=(95, 58, 30, 255))

    # Cut branch knot stub on top
    d.rectangle([13, 7, 16, 9], fill=(62, 39, 25, 255))
    d.rectangle([14, 8, 15, 9], fill=(110, 68, 38, 255))
    d.point([(14, 7), (15, 7)], fill=(200, 160, 110, 255))

    atomic_save_png(img, dest_path)


def generate_coins(dest_path):
    """Generate 32x32 clean pixel-art gold coins item icon."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Bottom coin
    d.ellipse([6, 17, 25, 27], fill=(185, 130, 20, 255), outline=(130, 90, 10, 255))
    d.ellipse([7, 18, 24, 25], fill=(245, 195, 35, 255))
    # Middle coin
    d.ellipse([10, 11, 28, 21], fill=(195, 140, 25, 255), outline=(140, 95, 12, 255))
    d.ellipse([11, 12, 27, 19], fill=(255, 215, 50, 255))
    # Top front coin
    d.ellipse([4, 6, 22, 18], fill=(215, 160, 30, 255), outline=(150, 105, 15, 255))
    d.ellipse([5, 7, 21, 16], fill=(255, 225, 75, 255))
    d.ellipse([7, 9, 19, 14], fill=(255, 245, 140, 255))
    # Coin sparkle
    d.point([(10, 8), (11, 7), (12, 8), (11, 9)], fill=(255, 255, 255, 255))
    d.point([(23, 14), (24, 13), (25, 14)], fill=(255, 255, 255, 230))
    atomic_save_png(img, dest_path)


def generate_sword_upgrade(dest_path):
    """Generate 32x32 clean pixel-art whetstone / sword upgrade icon."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Whetstone base / short sword
    # Diagonal blade from bottom-left to top-right
    for i in range(16):
        bx = 8 + i
        by = 23 - i
        d.line([(bx, by), (bx + 2, by - 2)], fill=(200, 210, 225, 255), width=2)
        d.line([(bx + 1, by + 1), (bx + 3, by - 1)], fill=(240, 245, 255, 255), width=1)
    # Blade tip
    d.point([(24, 7), (25, 6), (25, 7)], fill=(255, 255, 255, 255))
    # Crossguard
    d.line([(6, 21), (11, 26)], fill=(215, 170, 35, 255), width=2)
    # Leather hilt
    d.line([(4, 25), (7, 28)], fill=(110, 65, 30, 255), width=2)
    # Pommel
    d.ellipse([2, 28, 5, 31], fill=(240, 190, 45, 255))
    # Sparkle glint on blade
    d.point([(17, 13), (18, 12), (19, 13), (18, 14)], fill=(255, 255, 255, 255))
    atomic_save_png(img, dest_path)


def generate_trophy(dest_path):
    """Generate 32x32 clean pixel-art golden ancient trophy icon."""
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Base stand
    d.rectangle([9, 25, 22, 28], fill=(130, 85, 15, 255))
    d.rectangle([10, 26, 21, 27], fill=(215, 165, 30, 255))
    d.rectangle([11, 23, 20, 25], fill=(160, 110, 20, 255))
    d.rectangle([12, 24, 19, 25], fill=(245, 200, 45, 255))

    # Stem
    d.rectangle([14, 18, 17, 23], fill=(160, 110, 20, 255))
    d.rectangle([15, 18, 16, 22], fill=(255, 215, 60, 255))

    # Handles (left and right)
    d.ellipse([5, 8, 11, 17], outline=(140, 95, 15, 255), width=2)
    d.ellipse([6, 9, 10, 16], fill=(0, 0, 0, 0))
    d.ellipse([20, 8, 26, 17], outline=(140, 95, 15, 255), width=2)
    d.ellipse([21, 9, 25, 16], fill=(0, 0, 0, 0))

    # Outer cup silhouette
    d.rectangle([8, 6, 23, 16], fill=(140, 95, 15, 255))
    d.polygon([(8, 16), (23, 16), (18, 20), (13, 20)], fill=(140, 95, 15, 255))

    # Inner cup fill
    d.rectangle([9, 7, 22, 15], fill=(240, 185, 35, 255))
    d.polygon([(9, 15), (22, 15), (17, 19), (14, 19)], fill=(215, 160, 25, 255))

    # Rim at the top
    d.ellipse([8, 5, 23, 8], fill=(255, 225, 75, 255), outline=(150, 105, 15, 255))
    d.ellipse([10, 6, 21, 7], fill=(185, 130, 20, 255))

    # Highlights and shading on cup
    d.line([(10, 8), (10, 15)], fill=(255, 245, 150, 255), width=1)
    d.line([(11, 8), (11, 15)], fill=(255, 230, 90, 255), width=1)
    d.line([(21, 8), (21, 15)], fill=(180, 120, 15, 255), width=1)

    # Inset blue gem in center of cup
    d.rectangle([14, 11, 17, 14], fill=(30, 80, 200, 255))
    d.point([(15, 12)], fill=(150, 210, 255, 255))

    # Sparkle glint on rim
    d.point([(9, 5), (10, 4), (11, 5), (10, 6)], fill=(255, 255, 255, 255))

    atomic_save_png(img, dest_path)


def generate_chest(dest_path, opened=False):
    """Generate 64x64 pixel-art treasure chest (closed or opened)."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not opened:
        # Body
        d.rectangle([14, 20, 50, 48], fill=(93, 64, 55, 255))
        d.rectangle([16, 22, 48, 46], fill=(141, 110, 99, 255))
        # Golden banding
        d.rectangle([14, 30, 50, 34], fill=(255, 179, 0, 255))
        d.rectangle([30, 30, 36, 40], fill=(255, 179, 0, 255))
        # Lock keyhole
        d.rectangle([32, 34, 34, 38], fill=(17, 17, 17, 255))
    else:
        # Base
        d.rectangle([14, 26, 50, 50], fill=(93, 64, 55, 255))
        # Dark open interior
        d.rectangle([18, 28, 46, 40], fill=(33, 16, 5, 255))
        # Raised lid in perspective
        d.rectangle([14, 12, 50, 24], fill=(141, 110, 99, 255))
        d.rectangle([14, 16, 50, 19], fill=(255, 179, 0, 255))
        d.rectangle([30, 16, 36, 22], fill=(255, 179, 0, 255))
    atomic_save_png(img, dest_path)


def generate_house(dest_path):
    """Generate 192x240 pixel-art timber-frame cottage matching WorldScene."""
    hw = 192
    hh = 240
    img = Image.new("RGBA", (hw, hh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Stone chimney on right
    d.rectangle([hw - 36, 16, hw - 14, 86], fill=(96, 125, 139, 255))
    for cy in [28, 46, 64]:
        d.rectangle([hw - 36, cy, hw - 14, cy + 3], fill=(55, 71, 79, 255))
    d.rectangle([hw - 40, 12, hw - 10, 18], fill=(38, 50, 56, 255))

    # Gable roof (terracotta tiles)
    d.rectangle([12, 30, hw - 12, 106], fill=(192, 57, 43, 255))
    d.rectangle([16, 44, hw - 16, 54], fill=(211, 84, 0, 255))
    d.rectangle([14, 64, hw - 14, 74], fill=(211, 84, 0, 255))
    d.rectangle([12, 84, hw - 12, 94], fill=(211, 84, 0, 255))
    for sy in [54, 74, 94]:
        d.rectangle([12, sy, hw - 12, sy + 3], fill=(186, 74, 0, 255))
    # Ridge beam
    d.rectangle([8, 26, hw - 8, 32], fill=(243, 156, 18, 255))

    # Eaves shadow
    d.rectangle([6, 102, hw - 6, 108], fill=(74, 46, 27, 255))
    d.rectangle([8, 108, hw - 8, 116], fill=(26, 15, 10, 255))

    # Façade (cream plaster)
    d.rectangle([12, 114, hw - 12, 220], fill=(254, 249, 231, 255))

    # Timber framework (dark oak beams)
    d.rectangle([12, 114, 20, 220], fill=(78, 52, 46, 255))
    d.rectangle([hw - 20, 114, hw - 12, 220], fill=(78, 52, 46, 255))
    d.rectangle([12, 160, hw - 12, 168], fill=(78, 52, 46, 255))
    d.rectangle([40, 114, 48, 160], fill=(78, 52, 46, 255))
    d.rectangle([hw - 48, 114, hw - 40, 160], fill=(78, 52, 46, 255))

    # Left glowing window
    d.rectangle([24, 126, 28, 150], fill=(93, 64, 55, 255))
    d.rectangle([46, 126, 50, 150], fill=(93, 64, 55, 255))
    d.rectangle([28, 126, 46, 150], fill=(255, 202, 40, 255))
    d.rectangle([30, 128, 36, 136], fill=(255, 249, 196, 255))
    d.rectangle([36, 126, 38, 150], fill=(62, 39, 35, 255))
    d.rectangle([28, 137, 46, 139], fill=(62, 39, 35, 255))

    # Right glowing window
    d.rectangle([hw - 50, 126, hw - 46, 150], fill=(93, 64, 55, 255))
    d.rectangle([hw - 28, 126, hw - 24, 150], fill=(93, 64, 55, 255))
    d.rectangle([hw - 46, 126, hw - 28, 150], fill=(255, 202, 40, 255))
    d.rectangle([hw - 44, 128, hw - 38, 136], fill=(255, 249, 196, 255))
    d.rectangle([hw - 38, 126, hw - 36, 150], fill=(62, 39, 35, 255))
    d.rectangle([hw - 46, 137, hw - 28, 139], fill=(62, 39, 35, 255))

    # Wooden door
    d.rectangle([hw // 2 - 16, 168, hw // 2 + 16, 220], fill=(109, 76, 65, 255))
    d.rectangle([hw // 2 - 6, 168, hw // 2 - 4, 220], fill=(78, 52, 46, 255))
    d.rectangle([hw // 2 + 6, 168, hw // 2 + 8, 220], fill=(78, 52, 46, 255))
    d.rectangle([hw // 2 + 8, 192, hw // 2 + 12, 198], fill=(17, 17, 17, 255))

    # Ashlar stone foundation
    d.rectangle([10, 220, hw - 10, 236], fill=(120, 144, 156, 255))
    d.rectangle([10, 226, hw - 10, 228], fill=(69, 90, 100, 255))
    d.rectangle([40, 220, 42, 236], fill=(69, 90, 100, 255))
    d.rectangle([90, 220, 92, 236], fill=(69, 90, 100, 255))
    d.rectangle([140, 220, 142, 236], fill=(69, 90, 100, 255))

    atomic_save_png(img, dest_path)


def generate_ruin(dest_path):
    """Generate 64x80 pixel-art ancient stone ruin column."""
    img = Image.new("RGBA", (64, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([12, 16, 52, 76], fill=(66, 66, 66, 255))
    d.rectangle([16, 16, 48, 76], fill=(117, 117, 117, 255))
    # Fluting
    d.rectangle([20, 22, 24, 70], fill=(158, 158, 158, 255))
    d.rectangle([28, 22, 32, 70], fill=(158, 158, 158, 255))
    d.rectangle([36, 22, 40, 70], fill=(158, 158, 158, 255))
    # Capital
    d.rectangle([10, 12, 54, 20], fill=(189, 189, 189, 255))
    # Cracks
    d.rectangle([24, 34, 36, 38], fill=(33, 33, 33, 255))
    d.rectangle([32, 38, 36, 48], fill=(33, 33, 33, 255))
    # Ivy
    d.rectangle([14, 42, 20, 48], fill=(46, 125, 50, 255))
    d.rectangle([16, 54, 24, 60], fill=(46, 125, 50, 255))
    d.rectangle([38, 58, 44, 64], fill=(46, 125, 50, 255))
    atomic_save_png(img, dest_path)


def generate_cliff(dest_path):
    """Generate 64x64 pixel-art cliff terrain tile."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Grass top
    d.rectangle([0, 0, 64, 18], fill=(92, 158, 43, 255))
    d.rectangle([0, 14, 64, 18], fill=(70, 130, 26, 255))
    # Rock face
    d.rectangle([0, 18, 64, 64], fill=(84, 110, 122, 255))
    d.rectangle([0, 24, 64, 28], fill=(69, 90, 100, 255))
    d.rectangle([0, 42, 64, 46], fill=(55, 71, 79, 255))
    # Rock strata highlights
    d.rectangle([8, 20, 28, 23], fill=(144, 164, 174, 255))
    d.rectangle([36, 34, 56, 37], fill=(144, 164, 174, 255))
    atomic_save_png(img, dest_path)


def generate_sign(dest_path):
    """Generate 64x64 pixel-art wooden signpost with arrow."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Post
    d.rectangle([28, 28, 36, 60], fill=(74, 46, 27, 255))
    # Board
    d.rectangle([14, 14, 50, 30], fill=(138, 98, 53, 255))
    d.rectangle([16, 16, 48, 28], fill=(160, 115, 65, 255))
    # Direction arrow
    d.line([(22, 22), (38, 22)], fill=(58, 37, 18, 255), width=2)
    d.line([(34, 18), (38, 22)], fill=(58, 37, 18, 255), width=2)
    d.line([(34, 26), (38, 22)], fill=(58, 37, 18, 255), width=2)
    atomic_save_png(img, dest_path)


def generate_fence(dest_path):
    """Generate 64x64 pixel-art wooden fence."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Vertical posts
    d.rectangle([8, 16, 16, 60], fill=(78, 52, 46, 255))
    d.rectangle([48, 16, 56, 60], fill=(78, 52, 46, 255))
    # Rails
    d.rectangle([4, 24, 60, 30], fill=(138, 98, 53, 255))
    d.rectangle([4, 40, 60, 46], fill=(138, 98, 53, 255))
    atomic_save_png(img, dest_path)


def generate_wall(dest_path):
    """Generate 64x64 pixel-art timber wall."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 64, 64], fill=(78, 52, 46, 255))
    d.rectangle([0, 56, 64, 64], fill=(62, 39, 35, 255))
    d.rectangle([0, 16, 64, 18], fill=(109, 76, 65, 255))
    d.rectangle([0, 36, 64, 38], fill=(109, 76, 65, 255))
    atomic_save_png(img, dest_path)


def generate_leaf(dest_path):
    """Generate 6x6 pixel-art leaf particle."""
    img = Image.new("RGBA", (6, 6), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rectangle([1, 1, 4, 4], fill=(124, 179, 66, 230))
    d.point([(2, 0), (0, 2), (5, 3), (3, 5)], fill=(104, 159, 56, 240))
    atomic_save_png(img, dest_path)


def generate_npc_elder(dest_path):
    """Generate 64x64 Toriyama-style elder NPC."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Robe body
    d.rectangle([20, 24, 44, 56], fill=(67, 160, 71, 255))  # Green sage robe
    d.rectangle([24, 26, 40, 54], fill=(102, 187, 106, 255))
    # Long white beard
    d.rectangle([26, 18, 38, 36], fill=(245, 245, 245, 255))
    d.rectangle([28, 36, 36, 42], fill=(230, 230, 230, 255))
    # Head / face
    d.rectangle([24, 10, 40, 22], fill=(255, 204, 153, 255))
    # Eyes
    d.rectangle([27, 14, 29, 16], fill=(30, 30, 30, 255))
    d.rectangle([35, 14, 37, 16], fill=(30, 30, 30, 255))
    # Eyebrows
    d.rectangle([26, 12, 30, 13], fill=(255, 255, 255, 255))
    d.rectangle([34, 12, 38, 13], fill=(255, 255, 255, 255))
    # Sage hat / cap
    d.rectangle([22, 6, 42, 11], fill=(46, 125, 50, 255))
    # Walking staff
    d.line([(46, 8), (48, 58)], fill=(121, 85, 72, 255), width=2)
    d.ellipse([44, 6, 50, 12], fill=(255, 215, 0, 255))  # Staff golden orb
    atomic_save_png(img, dest_path)


def generate_battle_bg(dest_path):
    """Generate 800x600 Toriyama anime arena background fixing BattleScene."""
    w, h = 800, 600
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    d = ImageDraw.Draw(bg)

    # 1. Sky gradient
    for y in range(250):
        t = y / 250.0
        r = int(95 + (165 - 95) * t)
        g = int(175 + (225 - 175) * t)
        b = int(235 + (255 - 235) * t)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # 2. Toriyama rolling hills
    for cx, cy, rad, color in [
        (120, 270, 190, (76, 145, 65, 255)),
        (420, 290, 230, (88, 160, 72, 255)),
        (720, 260, 170, (68, 135, 58, 255)),
    ]:
        d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=color)

    # 3. Ground plain
    for y in range(240, h):
        t = (y - 240) / (h - 240)
        r = int(92 + 25 * t)
        g = int(158 - 30 * t)
        b = int(43 - 15 * t)
        d.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # 4. Battle combat arena ellipse
    d.ellipse([80, 310, 720, 530], fill=(196, 154, 98, 255), outline=(163, 123, 74, 255), width=5)
    d.ellipse([110, 330, 690, 510], fill=(212, 172, 116, 255))
    # Subtle arena markings
    d.ellipse([260, 380, 540, 470], outline=(180, 140, 90, 255), width=2)

    atomic_save_png(bg, dest_path)


# ==========================================
# MASTER SLICING & GENERATION EXECUTION
# ==========================================

def run_pipeline():
    print("=" * 60)
    print("TOYA ADVENTURE'S 2.5D RPG: Milestone 1 Asset Slicing Pipeline")
    print("=" * 60)

    # 1. Ingestion & Directories
    ensure_asset_ingestion()
    ensure_directories()

    col_webp = "assets/collection.webp"
    p2_webp = "assets/planche_2.webp"
    enemy_png = "assets/enemy.png"

    # 2. Props & Environmental Sprites from collection.webp
    print("\n--- Slicing Environmental Props from collection.webp ---")
    slice_and_save(col_webp, (48, 394, 336, 667), "assets/props/tree_large.png", target_size=(128, 160))
    slice_and_save(col_webp, (609, 470, 778, 648), "assets/props/tree_small.png", target_size=(64, 96))
    slice_and_save(col_webp, (821, 135, 1003, 246), "assets/props/bush.png", target_size=(64, 64))
    slice_and_save(col_webp, (49, 807, 303, 950), "assets/props/rock_large.png", target_size=(96, 80))
    slice_and_save(col_webp, (913, 830, 1477, 968), "assets/props/canopy_wall.png", target_size=(564, 138))
    slice_and_save(col_webp, (1095, 480, 1435, 597), "assets/props/shadow.png", target_size=(64, 32))
    slice_and_save(col_webp, (22, 23, 296, 107), "assets/ui/badge_banner.png")

    # 3. Props, Characters & UI from planche_2.webp
    print("\n--- Slicing Assets from planche_2.webp ---")
    slice_and_save(p2_webp, (1035, 665, 1125, 749), "assets/props/rock_small.png", target_size=(64, 64))
    slice_and_save(p2_webp, (1035, 665, 1125, 749), "assets/props/rock.png", target_size=(64, 48))
    slice_and_save(p2_webp, (923, 110, 1040, 216), "assets/props/flower_patch.png", target_size=(64, 64))
    slice_and_save(p2_webp, (881, 867, 1166, 960), "assets/ui/ui_panel.png")
    slice_and_save(p2_webp, (881, 867, 1166, 960), "assets/ui/panel_frame.png", target_size=(128, 128))
    slice_and_save(p2_webp, (1209, 842, 1508, 997), "assets/ui/ui_frame.png")

    # NPC Guide
    slice_and_save(p2_webp, (473, 851, 546, 971), "assets/props/npc_guide.png", target_size=(48, 64))
    slice_and_save(p2_webp, (473, 851, 546, 971), "assets/characters/npc_guide.png", target_size=(48, 64))

    # 4. Item Icons
    print("\n--- Slicing & Generating Item Icons ---")
    generate_wood("assets/items/wood.png")
    slice_and_save(p2_webp, (1035, 665, 1125, 749), "assets/items/stone.png", target_size=(32, 32))
    generate_potion("assets/items/potion.png")
    generate_bridge("assets/items/bridge.png")
    generate_coins("assets/items/coins.png")
    generate_sword_upgrade("assets/items/sword_upgrade.png")
    generate_trophy("assets/items/trophy.png")

    # 5. Monsters & Variants
    print("\n--- Slicing Monsters & Boss Variants ---")
    slice_and_save(enemy_png, (20, 20, 1004, 1004), "assets/monsters/slime_charger.png", target_size=(64, 64))

    # Goblin Shooter: Green/yellow tint filter (pure PIL byte manipulation)
    def goblin_filter(img):
        img = img.convert("RGBA")
        w, h = img.size
        raw = bytearray(img.tobytes())
        for i in range(0, len(raw), 4):
            g = raw[i + 1]
            b = raw[i + 2]
            raw[i] = min(255, g + 30)      # new_r
            raw[i + 1] = min(255, g + 20)  # new_g
            raw[i + 2] = b // 3            # new_b
            # raw[i + 3] (alpha) is unchanged
        return Image.frombytes("RGBA", (w, h), bytes(raw))

    slice_and_save(enemy_png, (20, 20, 1004, 1004), "assets/monsters/goblin_shooter.png", target_size=(64, 64), custom_filter=goblin_filter)

    # Boss Guardian: Deep crimson/purple boss shading (pure PIL byte manipulation)
    def boss_filter(img):
        img = img.convert("RGBA")
        w, h = img.size
        raw = bytearray(img.tobytes())
        for i in range(0, len(raw), 4):
            r = raw[i]
            g = raw[i + 1]
            b = raw[i + 2]
            raw[i] = min(255, r + 80)      # new_r
            raw[i + 1] = g // 2            # new_g
            raw[i + 2] = min(255, b + 60)  # new_b
            # raw[i + 3] (alpha) is unchanged
        return Image.frombytes("RGBA", (w, h), bytes(raw))

    slice_and_save(enemy_png, (20, 20, 1004, 1004), "assets/monsters/boss_guardian.png", target_size=(128, 128), custom_filter=boss_filter)

    # 6. Procedural Environmental Props & UI
    print("\n--- Generating Procedural Props & Battle Background ---")
    generate_chest("assets/props/chest_closed.png", opened=False)
    generate_chest("assets/props/chest_opened.png", opened=True)
    generate_house("assets/props/house.png")
    generate_ruin("assets/props/ruin.png")
    generate_cliff("assets/props/cliff.png")
    generate_sign("assets/props/sign.png")
    generate_fence("assets/props/fence.png")
    generate_wall("assets/props/wall.png")
    generate_leaf("assets/props/leaf.png")
    generate_npc_elder("assets/props/npc_elder.png")
    generate_npc_elder("assets/characters/npc_elder.png")
    generate_battle_bg("assets/ui/battle_bg.png")

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE: All sliced assets generated successfully!")
    print("=" * 60)


if __name__ == "__main__":
    run_pipeline()
