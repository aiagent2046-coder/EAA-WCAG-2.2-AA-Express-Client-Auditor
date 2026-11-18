# EAA & WCAG 2.2 AA Express Client Auditor (v1.0.0)

Local-first Manifest V3 browser extension for **Google Chrome**, **Microsoft Edge**, and **Mozilla Firefox** that audits web pages against **EN 301 549 V4.1.1 / European Accessibility Act (WCAG 2.2 Level AA)**, demonstrates live **Before / After** fixes directly on the page, and exports branded **White-Label A4 PDF** & **Jira CSV** client reports.

## Key Capabilities
- **On-Page Before ↔ After Studio:** Floating draggable inspector card with smart non-overlapping corner placement, dashed SVG Bezier tether, compact micro-pins, and instant live CSS remediation preview.
- **Zero-False-Positive WCAG 2.2 Engine:**
  - **SC 2.5.8 Target Size (Minimum):** Bounding-box checks (`>= 24×24 px`), Euclidean `24 px` spacing circle math, plus inline-text, equivalent-link, and sticky/fixed layer exemptions.
  - **SC 2.4.7 / 2.4.11 / 2.4.13 Keyboard Focus & Tab# Map:** 9-point raycast occlusion detection against sticky headers/cookie bars, suppressed focus-ring detection, and numbered SVG `Tab#` focus path overlay.
  - **SC 3.2.6 / 3.3.7 / 3.3.8 Forms, Auth & Consistent Help:** Cross-page help mechanism consistency tracking, blocked password-manager paste detection, split-OTP paste checks, and third-party accessibility overlay risk warnings.
- **Spotlight Visual Client Report:** Annotated `640px` HD evidence crops, 4-Pillar EAA Readiness dashboard, RU / EN / DE localization, agency logo White-Labeling, and clean headerless A4 PDF printing.

## Reproducible Build Instructions (For Developers & Firefox AMO Reviewers)

### Prerequisites
- **Operating System:** Linux, macOS, or Windows
- **Node.js:** `v18.0.0` or newer (tested with Node 20/22)
- **Python:** `3.9` or newer (standard library `zipfile` only)

### Build & Package Steps
```bash
# 1. Install dev dependency (esbuild) — optional; build.mjs also includes a zero-dependency bundler fallback
npm install

# 2. Bundle service workers & paywall bridge into dist-sdk/ and create store .zip archives in dist/
npm run package
```

Generated artifacts in `dist/`:
- `wcag22-express-auditor-chrome-v1.0.0.zip` — Chrome Web Store package
- `wcag22-express-auditor-edge-v1.0.0.zip` — Microsoft Edge Add-ons package
- `wcag22-express-auditor-firefox-v1.0.0.zip` — Mozilla Firefox AMO package
- `wcag22-express-auditor-firefox-sources-v1.0.0.zip` — Clean source archive for AMO review

## Deploying the Cloudflare Payment Proxy Worker
To switch from local development (`http://127.0.0.1:8787`) to production Cloudflare Workers (`https://wcag22-paywall-proxy.<subdomain>.workers.dev`):
```bash
./deploy_cloud_worker.sh
```
See [`store-listing/STORE_LISTING_KIT.md`](store-listing/STORE_LISTING_KIT.md) for copy-pasteable Chrome Web Store, Edge, and Firefox submission fields and permission justifications, and [`PRIVACY.md`](PRIVACY.md) for the public Privacy Policy.
