#!/usr/bin/env python3
"""Builds store-ready .zip bundles for Chrome Web Store, Edge Add-ons, and Firefox AMO."""

import json
import shutil
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"

INCLUDE_PATHS = [
    "manifest.json",
    "assets",
    "dist-sdk",
    "src",
    "_locales",
]


def zip_directory(src_dir: Path, zip_path: Path) -> None:
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in sorted(src_dir.rglob("*")):
            if file.is_file():
                zf.write(file, file.relative_to(src_dir))


def build_target(target: str) -> Path:
    if not (ROOT / "dist-sdk" / "sw.js").exists():
        raise SystemExit("Missing dist-sdk/sw.js — run `npm run build` before packaging.")

    base_manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = base_manifest["version"]

    with tempfile.TemporaryDirectory(prefix=f"pkg_{target}_") as tmp:
        stage = Path(tmp)
        for rel in INCLUDE_PATHS:
            src = ROOT / rel
            dst = stage / rel
            if src.is_dir():
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

        for entry_file in stage.rglob("*.entry.js"):
            entry_file.unlink()

        if target == "firefox":
            ff_overlay = json.loads((ROOT / "manifest.firefox.json").read_text(encoding="utf-8"))
            merged = {**base_manifest, **ff_overlay}
            (stage / "manifest.json").write_text(
                json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            p = stage / "dist-sdk" / "sw.js"
            if p.exists():
                p.unlink()
        else:
            p = stage / "dist-sdk" / "sw-firefox.js"
            if p.exists():
                p.unlink()

        out_zip = DIST / f"wcag22-express-auditor-{target}-v{version}.zip"
        zip_directory(stage, out_zip)
        return out_zip


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)
    for target in ("chrome", "edge", "firefox"):
        out = build_target(target)
        print(f"[OK] Built {target}: {out.name} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
