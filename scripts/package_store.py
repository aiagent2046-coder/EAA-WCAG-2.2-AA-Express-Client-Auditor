#!/usr/bin/env python3
"""Builds store-ready .zip bundles for Chrome Web Store, Edge Add-ons, and Firefox AMO (plus AMO source bundle)."""

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

SOURCE_INCLUDE_PATHS = [
    "manifest.json",
    "manifest.firefox.json",
    "package.json",
    "README.md",
    "PRIVACY.md",
    "assets",
    "scripts",
    "src",
    "_locales",
]

FORBIDDEN_RELEASE_TOKENS = (
    "SET_DEV_PRO_OVERRIDE",
    "Dev: Test Pro",
    "Dev: Test Unlock",
    "btn-dev-unlock",
    "btn-dev-report-toggle",
    "4242 4242 4242 4242",
)


def verify_production_cleanliness(stage: Path) -> None:
    for loc_file in sorted((stage / "_locales").glob("*/messages.json")):
        data = json.loads(loc_file.read_text(encoding="utf-8"))
        desc = data.get("extDescription", {}).get("message", "")
        name = data.get("extName", {}).get("message", "")
        if len(name) > 75:
            raise SystemExit(f"[FAIL] {loc_file}: extName exceeds 75 chars ({len(name)})")
        if len(desc) > 132:
            raise SystemExit(f"[FAIL] {loc_file}: extDescription exceeds 132 chars ({len(desc)})")

    for path in sorted(stage.rglob("*")):
        if path.is_file() and path.suffix in {".js", ".html", ".css", ".json"}:
            txt = path.read_text(encoding="utf-8", errors="ignore")
            for tok in FORBIDDEN_RELEASE_TOKENS:
                if tok in txt:
                    raise SystemExit(f"[FAIL] Forbidden dev token {tok!r} found in {path.relative_to(stage)}")


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

        verify_production_cleanliness(stage)
        out_zip = DIST / f"wcag22-express-auditor-{target}-v{version}.zip"
        zip_directory(stage, out_zip)
        return out_zip


def build_firefox_sources_zip() -> Path:
    base_manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    version = base_manifest["version"]
    with tempfile.TemporaryDirectory(prefix="pkg_ff_src_") as tmp:
        stage = Path(tmp)
        for rel in SOURCE_INCLUDE_PATHS:
            src = ROOT / rel
            if not src.exists():
                continue
            dst = stage / rel
            if src.is_dir():
                shutil.copytree(
                    src,
                    dst,
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store", "*.env*"),
                )
            else:
                shutil.copy2(src, dst)
        out_zip = DIST / f"wcag22-express-auditor-firefox-sources-v{version}.zip"
        zip_directory(stage, out_zip)
        return out_zip


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)
    for target in ("chrome", "edge", "firefox"):
        out = build_target(target)
        print(f"[OK] Built {target}: {out.name} ({out.stat().st_size} bytes)")
    src_out = build_firefox_sources_zip()
    print(f"[OK] Built firefox-sources: {src_out.name} ({src_out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
