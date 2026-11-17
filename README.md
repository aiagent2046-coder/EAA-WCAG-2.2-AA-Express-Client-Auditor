# EAA & WCAG 2.2 AA Express Client Auditor

100% local, zero-backend Manifest V3 browser extension (Chrome, Microsoft Edge, Firefox) built for web agencies, QA engineers, and European e-commerce teams auditing pages against **EN 301 549 V4.1.1 / European Accessibility Act (WCAG 2.2 Level AA)**.

## Audited W3C WCAG 2.2 Delta Criteria

| Criterion | Conformance | Automated / Guided Check |
| :--- | :--- | :--- |
| **[SC 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)** | Level AA | Measures CSS bounding boxes (`>= 24x24 px`), applies `Inline` & `User Agent` exemptions, and computes exact Euclidean `R = 12px` spacing-circle collisions |
| **[SC 2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)** | Level AA | Traverses tabbable elements, runs 9-point `elementsFromPoint()` raycasts against sticky headers/cookie banners ([F110](https://www.w3.org/WAI/WCAG22/Techniques/failures/F110)), and calculates exact `scroll-padding-top` fixes |
| **[SC 3.3.8 Accessible Authentication](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)** | Level AA | Probes credential/OTP fields for blocked `paste` events and `autocomplete="off"` password-manager restrictions |
| **[SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)** | Level AA | Flags `[draggable="true"]` and custom slider widgets for 10-second single-pointer QA sign-off inside the client report |

## Quick Start (Unpacked Local Test)

1. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
2. Click **Load unpacked** and select this repository root.
3. Open `tests/fixture_wcag22.html` (enable *Allow access to file URLs* if testing via `file://`, or serve via `python3 -m http.server 8080` at `http://localhost:8080/tests/fixture_wcag22.html`).
4. Click the extension icon -> **Run WCAG 2.2 AA Audit**.
5. Use **Dev Mode: Unlock Pro** inside the paywall card during unpacked development to test branded A4 White-Label PDF, Markdown, and Jira CSV exports.

## Production Setup & Store Packaging

1. Register your extension slug in [ExtensionPay](https://extensionpay.com/) (`wcag22-express-auditor` or update `EXTPAY_ID` in `src/background.js`) and create plans `agency_monthly` and `solo_lifetime`.
2. Pull the upstream production [ExtPay.js SDK](https://github.com/glench/ExtPay):
   ```bash
   ./scripts/fetch_extpay.sh
   ```
3. Build store-ready `.zip` archives for Chrome Web Store, Microsoft Edge Add-ons, and Mozilla Add-ons:
   ```bash
   python3 scripts/package_store.py
   ```
   Output bundles are written to `dist/`.

## Push to GitHub

```bash
./setup_and_push.sh
```
