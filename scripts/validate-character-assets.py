#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "site" / "assets" / "characters" / "expressions"
REPORT = ROOT / "tests" / "character_asset_validation_v23.json"
CHARS = ["sumi", "claire", "marta", "marc", "leon", "andre"]
MOODS = ["neutral", "quiet", "soft", "focused", "working", "guarded", "wary", "resolved", "down", "shaken", "alarm", "tense", "breathless"]
FACE_BOXES = {
    "andre": (211, 123, 234, 234), "claire": (283, 139, 212, 212),
    "leon": (210, 124, 217, 217), "marc": (241, 87, 273, 273),
    "marta": (268, 153, 194, 194), "sumi": (282, 152, 200, 200),
}


def main() -> None:
    failures: list[str] = []
    details: dict[str, object] = {}
    hashes: dict[str, str] = {}

    for char_id in CHARS:
        neutral = np.array(Image.open(ASSET_ROOT / char_id / "neutral.webp").convert("RGBA"))
        x, y, w, h = FACE_BOXES[char_id]
        pad = int(.08 * w)
        y0, y1 = max(0, y-pad), min(neutral.shape[0], y+h+pad)
        x0, x1 = max(0, x-pad), min(neutral.shape[1], x+w+pad)
        base_face = cv2.cvtColor(neutral[y0:y1, x0:x1, :3], cv2.COLOR_RGB2GRAY)
        char_details = {}

        for mood in MOODS:
            path = ASSET_ROOT / char_id / f"{mood}.webp"
            if not path.exists():
                failures.append(f"missing {char_id}/{mood}")
                continue
            raw = path.read_bytes()
            digest = hashlib.sha256(raw).hexdigest()
            if digest in hashes:
                failures.append(f"duplicate binary {char_id}/{mood} == {hashes[digest]}")
            hashes[digest] = f"{char_id}/{mood}"

            im = Image.open(path).convert("RGBA")
            arr = np.array(im)
            alpha = arr[..., 3]
            coverage = float((alpha > 16).mean())
            corner_alpha = [int(alpha[0,0]), int(alpha[0,-1]), int(alpha[-1,0]), int(alpha[-1,-1])]
            binary = (alpha > 96).astype(np.uint8)
            count, _labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
            component_ratio = 1.0
            if count > 1:
                areas = stats[1:, cv2.CC_STAT_AREA]
                component_ratio = float(areas.max() / max(1, areas.sum()))

            face = cv2.cvtColor(arr[y0:y1, x0:x1, :3], cv2.COLOR_RGB2GRAY)
            ssim = 1.0 if mood == "neutral" else float(structural_similarity(base_face, face, data_range=255))
            mean_delta = 0.0 if mood == "neutral" else float(np.mean(np.abs(base_face.astype(np.float32) - face.astype(np.float32))))

            if im.size != (720, 960): failures.append(f"{char_id}/{mood}: size {im.size}")
            if alpha.min() != 0 or alpha.max() != 255: failures.append(f"{char_id}/{mood}: alpha range {alpha.min()}..{alpha.max()}")
            if not (0.12 <= coverage <= 0.58): failures.append(f"{char_id}/{mood}: subject coverage {coverage:.3f}")
            if any(v > 8 for v in corner_alpha): failures.append(f"{char_id}/{mood}: nontransparent corner {corner_alpha}")
            if component_ratio < .985: failures.append(f"{char_id}/{mood}: disconnected silhouette {component_ratio:.3f}")
            if mood != "neutral" and ssim < .60: failures.append(f"{char_id}/{mood}: identity structure SSIM too low {ssim:.3f}")
            if mood != "neutral" and mean_delta < .18: failures.append(f"{char_id}/{mood}: expression delta too small {mean_delta:.3f}")

            char_details[mood] = {
                "bytes": len(raw), "coverage": round(coverage, 4),
                "largestComponentRatio": round(component_ratio, 4),
                "faceSSIMToNeutral": round(ssim, 4),
                "faceMeanDelta": round(mean_delta, 4),
            }
        details[char_id] = char_details

    result = {
        "version": "2.3.0",
        "characters": len(CHARS),
        "moodsPerCharacter": len(MOODS),
        "assetCount": len(hashes),
        "requirements": {
            "individualFile": True,
            "transparentBackground": True,
            "fixedCanvas": [720, 960],
            "identityLocked": True,
            "runtimeContactSheet": False,
        },
        "failures": failures,
        "details": details,
        "pass": not failures and len(hashes) == len(CHARS) * len(MOODS),
    }
    REPORT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k != "details"}, ensure_ascii=False, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
