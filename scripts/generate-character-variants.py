#!/usr/bin/env python3
"""Create consistent expression variants from the individually isolated character masters.

The script intentionally preserves identity, costume, pose and silhouette. Expression changes
are local, small deformations around brows, eyes and mouth plus restrained colour grading.
It does not use contact-sheet crops at runtime: each output is a separate transparent WebP.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Dict, Iterable, Tuple

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "site" / "assets" / "characters"
OUTPUT_DIR = SOURCE_DIR / "expressions"
DOCS_DIR = ROOT / "docs"
TESTS_DIR = ROOT / "tests"

CHARACTERS = ["sumi", "claire", "marta", "marc", "leon", "andre"]
DISPLAY_NAMES = {
    "sumi": "水瀬 澄",
    "claire": "クレール・ベルナール",
    "marta": "マルタ・デ・フリース",
    "marc": "マルク・デュラン",
    "leon": "レオン・ヴァスール",
    "andre": "アンドレ・ヴァスール",
}

# Detected on the individual 720x960 masters, then fixed to guarantee reproducibility.
FACE_BOXES: Dict[str, Tuple[int, int, int, int]] = {
    "andre": (211, 123, 234, 234),
    "claire": (283, 139, 212, 212),
    "leon": (210, 124, 217, 217),
    "marc": (241, 87, 273, 273),
    "marta": (268, 153, 194, 194),
    "sumi": (282, 152, 200, 200),
}

# dx/dy values are fractions of face width/height. Values remain deliberately subtle.
MOODS = {
    "neutral": dict(sat=1.00, con=1.00, bri=1.00, warm=0.00),
    "quiet": dict(eye_y=.92, brow_y=.006, mouth_c=.003, sat=.96, con=.99, bri=.99, warm=-.01),
    "soft": dict(eye_y=.94, mouth_l=-.025, mouth_r=-.025, mouth_c=.008, sat=1.04, con=.98, bri=1.025, warm=.025),
    "focused": dict(eye_y=.89, brow_il=.028, brow_ir=.028, brow_ol=-.006, brow_or=-.006, mouth_c=-.004, sat=.96, con=1.055, bri=.985, warm=-.01),
    "working": dict(eye_y=.91, brow_il=.020, brow_ir=.020, mouth_l=-.006, mouth_r=-.006, sat=.985, con=1.035, bri=1.00, warm=.005, lean_x=.002),
    "guarded": dict(eye_y=.88, brow_il=.026, brow_ir=.014, brow_ol=-.005, brow_or=.004, mouth_l=.012, mouth_r=.002, sat=.90, con=1.055, bri=.965, warm=-.018, lean_x=-.002),
    "wary": dict(eye_y=.90, brow_il=.010, brow_ir=-.016, brow_ol=.008, brow_or=-.016, mouth_l=.016, mouth_r=-.004, sat=.88, con=1.07, bri=.955, warm=-.024),
    "resolved": dict(eye_y=.90, brow_il=.030, brow_ir=.030, brow_ol=-.008, brow_or=-.008, mouth_l=-.008, mouth_r=-.008, mouth_c=-.005, sat=1.03, con=1.055, bri=1.015, warm=.008, lean_y=-.003),
    "down": dict(eye_y=.78, brow_il=-.015, brow_ir=-.015, brow_ol=.012, brow_or=.012, mouth_l=.025, mouth_r=.025, mouth_c=-.006, sat=.72, con=1.00, bri=.92, warm=-.025, lean_y=.004),
    "shaken": dict(eye_x=1.04, eye_y=1.055, brow_il=-.025, brow_ir=-.030, brow_ol=-.020, brow_or=-.024, mouth_l=.015, mouth_r=.022, mouth_c=.016, sat=.76, con=1.055, bri=.94, warm=-.018, part=.70, lean_y=.003),
    "alarm": dict(eye_x=1.07, eye_y=1.09, brow_il=-.045, brow_ir=-.045, brow_ol=-.036, brow_or=-.036, mouth_l=.020, mouth_r=.020, mouth_c=.028, sat=.68, con=1.10, bri=.925, warm=-.012, part=1.20, lean_y=.002),
    "tense": dict(eye_y=.83, brow_il=.045, brow_ir=.045, brow_ol=-.010, brow_or=-.010, mouth_l=.020, mouth_r=.020, mouth_c=-.008, sat=.84, con=1.10, bri=.95, warm=-.02),
    "breathless": dict(eye_y=.88, brow_il=-.012, brow_ir=-.012, mouth_l=.012, mouth_r=.012, mouth_c=.030, sat=.61, con=1.045, bri=.89, warm=-.015, part=1.50, lean_y=.006),
}


def extract_subject(arr: np.ndarray) -> np.ndarray:
    """Create a true transparent cutout from the vignetted individual master.

    Final Candidate 2.2 stored a rectangular alpha vignette around each person. This pass
    uses GrabCut on the single-person master, retains only the largest connected subject,
    feathers the silhouette, and decontaminates edge colours against the local background.
    """
    rgb = arr[..., :3].copy()
    h, w = rgb.shape[:2]
    # Segment at half resolution; the final feathering is performed at source resolution.
    scale = .5
    small = cv2.resize(rgb, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    sh, sw = small.shape[:2]
    bgr = cv2.cvtColor(small, cv2.COLOR_RGB2BGR)
    mask = np.zeros((sh, sw), np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    rect = (27, 9, sw - 54, sh - 18)
    cv2.grabCut(bgr, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    binary = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    binary = cv2.resize(binary, (w, h), interpolation=cv2.INTER_NEAREST)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=1)

    # Keep the primary connected silhouette and discard isolated background specks.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count > 1:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        binary = (labels == largest).astype(np.uint8)

    # Fill small holes inside clothing and hair without swallowing the outer background.
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=1)
    dist_in = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    dist_out = cv2.distanceTransform(1 - binary, cv2.DIST_L2, 5)
    signed = dist_in - dist_out
    alpha = np.clip((signed + 1.35) / 2.7, 0, 1)
    alpha = cv2.GaussianBlur(alpha.astype(np.float32), (0, 0), .55)

    # Estimate the local matte and remove its colour from semi-transparent edge pixels.
    local_bg = cv2.GaussianBlur(rgb.astype(np.float32), (0, 0), 24)
    a = alpha[..., None]
    safe = np.maximum(a, .08)
    foreground = (rgb.astype(np.float32) - (1 - a) * local_bg) / safe
    edge = (a > .02) & (a < .98)
    out_rgb = rgb.astype(np.float32)
    edge3 = np.repeat(edge, 3, axis=2)
    out_rgb[edge3] = np.clip(foreground, 0, 255)[edge3]
    out_rgb[a[..., 0] <= .01] = 0
    return np.dstack([np.clip(out_rgb, 0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)])

def gaussian_shift(map_x: np.ndarray, map_y: np.ndarray, xx: np.ndarray, yy: np.ndarray,
                   cx: float, cy: float, dx: float, dy: float, sx: float, sy: float) -> None:
    weight = np.exp(-(((xx - cx) ** 2) / (2 * sx * sx) + ((yy - cy) ** 2) / (2 * sy * sy)))
    map_x -= dx * weight
    map_y -= dy * weight


def gaussian_scale(map_x: np.ndarray, map_y: np.ndarray, xx: np.ndarray, yy: np.ndarray,
                   cx: float, cy: float, scale_x: float, scale_y: float, sx: float, sy: float) -> None:
    if abs(scale_x - 1.0) < 1e-5 and abs(scale_y - 1.0) < 1e-5:
        return
    weight = np.exp(-(((xx - cx) ** 2) / (2 * sx * sx) + ((yy - cy) ** 2) / (2 * sy * sy)))
    target_x = cx + (xx - cx) / max(scale_x, .7)
    target_y = cy + (yy - cy) / max(scale_y, .7)
    map_x[:] = map_x * (1 - weight) + target_x * weight
    map_y[:] = map_y * (1 - weight) + target_y * weight


def deform(arr: np.ndarray, char_id: str, spec: dict) -> np.ndarray:
    h, w = arr.shape[:2]
    x, y, fw, fh = FACE_BOXES[char_id]
    out = arr.copy()

    # Tiny whole-figure movement changes posture without changing identity or costume.
    lean_x = spec.get("lean_x", 0.0) * fw
    lean_y = spec.get("lean_y", 0.0) * fh
    if lean_x or lean_y:
        matrix = np.float32([[1, 0, lean_x], [0, 1, lean_y]])
        out = cv2.warpAffine(out, matrix, (w, h), flags=cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        x += lean_x
        y += lean_y

    # Work only in a padded face crop; this makes generation fast and keeps costume untouched.
    pad_x, pad_y = int(.23 * fw), int(.25 * fh)
    x0, y0 = max(0, int(x - pad_x)), max(0, int(y - pad_y))
    x1, y1 = min(w, int(x + fw + pad_x)), min(h, int(y + fh + pad_y))
    crop = out[y0:y1, x0:x1].copy()
    ch, cw = crop.shape[:2]
    yy, xx = np.indices((ch, cw), dtype=np.float32)
    map_x, map_y = xx.copy(), yy.copy()
    fx, fy = x - x0, y - y0

    eye_y = fy + .43 * fh
    eye_lx = fx + .34 * fw
    eye_rx = fx + .67 * fw
    eye_sx, eye_sy = .105 * fw, .075 * fh
    gaussian_scale(map_x, map_y, xx, yy, eye_lx, eye_y, spec.get("eye_x", 1.0), spec.get("eye_y", 1.0), eye_sx, eye_sy)
    gaussian_scale(map_x, map_y, xx, yy, eye_rx, eye_y, spec.get("eye_x", 1.0), spec.get("eye_y", 1.0), eye_sx, eye_sy)

    brow_y = fy + .29 * fh
    points = {
        "brow_ol": (fx + .25 * fw, brow_y),
        "brow_il": (fx + .44 * fw, brow_y + .01 * fh),
        "brow_ir": (fx + .56 * fw, brow_y + .01 * fh),
        "brow_or": (fx + .75 * fw, brow_y),
    }
    global_brow = spec.get("brow_y", 0.0)
    for key, (cx, cy) in points.items():
        dy = (spec.get(key, 0.0) + global_brow) * fh
        if dy:
            gaussian_shift(map_x, map_y, xx, yy, cx, cy, 0, dy, .085 * fw, .055 * fh)

    mouth_y = fy + .745 * fh
    mouth_points = {
        "mouth_l": (fx + .39 * fw, mouth_y),
        "mouth_c": (fx + .51 * fw, mouth_y + .005 * fh),
        "mouth_r": (fx + .63 * fw, mouth_y),
    }
    for key, (cx, cy) in mouth_points.items():
        dy = spec.get(key, 0.0) * fh
        if dy:
            gaussian_shift(map_x, map_y, xx, yy, cx, cy, 0, dy, .095 * fw, .055 * fh)

    warped = cv2.remap(crop, map_x, map_y, cv2.INTER_CUBIC,
                       borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    out[y0:y1, x0:x1] = warped
    return out

def add_parted_lips(arr: np.ndarray, char_id: str, amount: float) -> np.ndarray:
    if amount <= 0:
        return arr
    x, y, fw, fh = FACE_BOXES[char_id]
    pil = Image.fromarray(arr, "RGBA")
    overlay = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    cx = x + .51 * fw
    cy = y + .758 * fh
    rx = max(4, int(.055 * fw * (0.75 + amount * .3)))
    ry = max(1, int(.008 * fh + amount * .009 * fh))
    colour = (42, 20, 22, int(75 + 70 * amount))
    draw.ellipse((cx-rx, cy-ry, cx+rx, cy+ry), fill=colour)
    overlay = overlay.filter(ImageFilter.GaussianBlur(radius=max(.7, .006 * fw)))
    pil.alpha_composite(overlay)
    return np.array(pil)


def grade(arr: np.ndarray, spec: dict) -> np.ndarray:
    pil = Image.fromarray(arr, "RGBA")
    rgb = pil.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(spec.get("sat", 1.0))
    rgb = ImageEnhance.Contrast(rgb).enhance(spec.get("con", 1.0))
    rgb = ImageEnhance.Brightness(rgb).enhance(spec.get("bri", 1.0))
    warm = spec.get("warm", 0.0)
    data = np.asarray(rgb).astype(np.float32)
    if warm:
        data[..., 0] *= 1.0 + warm
        data[..., 2] *= 1.0 - warm
    data = np.clip(data, 0, 255).astype(np.uint8)
    rgba = np.dstack([data, np.asarray(pil.getchannel("A"))])
    return rgba


def sharpen(arr: np.ndarray) -> np.ndarray:
    pil = Image.fromarray(arr, "RGBA")
    rgb = pil.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.15, percent=78, threshold=3))
    return np.dstack([np.asarray(rgb), np.asarray(pil.getchannel("A"))])


def save_webp(arr: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").save(path, "WEBP", quality=92, method=4, exact=True)


def create_contact_sheet(paths: Iterable[Path], title: str, out_path: Path) -> None:
    paths = list(paths)
    cols = 4
    cell_w, cell_h = 260, 370
    rows = math.ceil(len(paths) / cols)
    sheet = Image.new("RGB", (cell_w * cols, cell_h * rows + 42), (12, 13, 17))
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 12), title, fill=(235, 230, 219))
    for i, p in enumerate(paths):
        im = Image.open(p).convert("RGBA")
        thumb = Image.new("RGBA", (cell_w, cell_h - 28), (0, 0, 0, 0))
        fitted = im.copy()
        fitted.thumbnail((cell_w - 12, cell_h - 38), Image.Resampling.LANCZOS)
        thumb.alpha_composite(fitted, ((cell_w - fitted.width)//2, (cell_h - 38 - fitted.height)//2))
        x0, y0 = (i % cols) * cell_w, 42 + (i // cols) * cell_h
        checker = Image.new("RGB", (cell_w, cell_h), (29, 30, 35))
        cd = ImageDraw.Draw(checker)
        s = 24
        for yy in range(0, cell_h - 28, s):
            for xx in range(0, cell_w, s):
                if (xx//s + yy//s) % 2 == 0:
                    cd.rectangle((xx, yy, xx+s-1, yy+s-1), fill=(39, 40, 46))
        checker.paste(thumb, (0, 0), thumb)
        cd.text((10, cell_h - 22), p.stem, fill=(232, 227, 216))
        sheet.paste(checker, (x0, y0))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path, quality=94)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": "2.3.0",
        "source": "individual transparent character masters from Final Candidate 2.2",
        "runtimeContactSheets": False,
        "characters": {},
    }
    for char_id in CHARACTERS:
        src = SOURCE_DIR / f"{char_id}.webp"
        arr = np.array(Image.open(src).convert("RGBA"))
        arr = extract_subject(arr)
        outputs = []
        for mood, spec in MOODS.items():
            variant = deform(arr, char_id, spec)
            variant = add_parted_lips(variant, char_id, spec.get("part", 0.0))
            variant = grade(variant, spec)
            variant = sharpen(variant)
            out = OUTPUT_DIR / char_id / f"{mood}.webp"
            save_webp(variant, out)
            outputs.append(out)
        create_contact_sheet(outputs, f"{DISPLAY_NAMES[char_id]} — expression QA (not used in game)",
                             TESTS_DIR / f"character_v23_{char_id}_qa.jpg")
        manifest["characters"][char_id] = {
            "displayName": DISPLAY_NAMES[char_id],
            "faceBox": list(FACE_BOXES[char_id]),
            "expressions": {m: str((OUTPUT_DIR / char_id / f"{m}.webp").relative_to(ROOT / "site")) for m in MOODS},
        }
    (DOCS_DIR / "CHARACTER_ASSET_MANIFEST_V23.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Generated {len(CHARACTERS) * len(MOODS)} expression assets in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
