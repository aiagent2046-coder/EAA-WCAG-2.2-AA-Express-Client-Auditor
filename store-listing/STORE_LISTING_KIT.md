# Пакет публикации в магазины расширений (v1.1.0)

Все тексты ниже проверены по лимитам символов и правилам модерации **Chrome Web Store**, **Microsoft Edge Add-ons** и **Firefox Add-ons (AMO)**.

## 1. Ссылки для анкеты разработчика
- **Privacy Policy URL (Политика конфиденциальности):**  
  `https://github.com/aiagent2046-coder/EAA-WCAG-2.2-AA-Express-Client-Auditor/blob/main/PRIVACY.md`
- **Homepage / Support URL:**  
  `https://github.com/aiagent2046-coder/EAA-WCAG-2.2-AA-Express-Client-Auditor`
- **Category (Категория):** `Developer Tools` (Инструменты разработчика)

## 2. Поля вкладки Privacy Practices (Chrome Web Store)
- **Single Purpose Description:**  
  Audits the active webpage locally against WCAG 2.2 Level AA and European Accessibility Act (EN 301 549) accessibility criteria, previews live CSS fixes on the page, and generates downloadable client audit reports.
- **`activeTab` justification:**  
  Used strictly when the user clicks "Run Visual WCAG 2.2 & EAA Audit" to inspect DOM accessibility metrics and capture local viewport evidence crops of the active tab for the user's audit report. No webpage content leaves the browser.
- **`scripting` justification:**  
  Injects the packaged local accessibility scanner (`src/content/scanner.js`) into the active tab on explicit user request to highlight WCAG 2.2 issues and preview live Before/After CSS fixes inside an isolated Shadow DOM overlay.
- **`storage` justification:**  
  Stores the user's latest local audit report data for PDF generation, HUD filter preferences, optional White-Label agency branding fields, and verified Pro subscription status in local browser storage.
- **Host permissions justification (`https://appbox.space/*` & Cloudflare Worker URL):**  
  Used exclusively to fetch current Pro subscription pricing and verify Stripe subscription status when a user chooses to unlock or restore Pro report exports. Audited webpage data is never transmitted.
- **Remote code:** No, I am not using Remote code (весь исполняемый код упакован внутри архива расширения).

## 3. Описания для карточки магазина (Store Listing)

### English (`en`)
- **Title:** EAA & WCAG 2.2 AA Express Client Auditor
- **Summary (<= 132 chars):** Local WCAG 2.2 AA & EAA auditor: live Before/After page fixes, 24px targets, focus checks & White-Label client PDF reports.
- **Description:**
Audit any website for WCAG 2.2 Level AA and the European Accessibility Act (EN 301 549 V4.1.1) in one click — 100% locally inside your browser, with live Before / After visual remediation right on the page and client-ready White-Label A4 PDF reports.

KEY FEATURES:
• Live On-Page Before ↔ After Studio: Toggle between broken elements and simulated CSS fixes right on the live website with a smart non-overlapping draggable inspector card, dashed element tether, and compact micro-pins.
• WCAG 2.2 AA Delta Engine (Zero False Positives):
  – SC 2.5.8 Target Size (Minimum): Measures interactive hit areas (24×24 CSS px), checks 24px spacing circles, and honors inline-text, equivalent-link, and sticky-layer exemptions.
  – SC 2.4.7 / 2.4.11 / 2.4.13 Keyboard Focus & Tab# Map: Detects sticky headers/cookie banners obscuring focused controls, catches suppressed outline:none styles, and draws the numbered Tab# focus path.
  – SC 3.2.6 / 3.3.7 / 3.3.8 Forms, Auth & Overlays: Flags blocked password-manager paste, split OTP inputs without paste support, cross-page help inconsistencies, and non-compliant third-party accessibility overlay widgets.
• Spotlight Visual Evidence Reports: High-resolution annotated screenshots highlighting the exact element and 24px touch target radius, 4-Pillar EAA Readiness scorecard, and ready-to-paste CSS snippets.
• Agency White-Label Exports (Pro): Add your agency name, logo, and client details, export clean headerless A4 PDFs (in EN, RU, or DE), or download Markdown & Jira CSV tickets.
• 100% Local Privacy: Works on staging, localhost, and password-protected pages. Zero audited HTML or screenshots ever leave your browser.

### Русский (`ru`)
- **Название:** WCAG 2.2 AA & EAA Express Client Auditor
- **Краткое описание (<= 132 симв.):** Локальный аудитор WCAG 2.2 AA и EAA: живой режим «До/После» на сайте, проверка 24px, фокуса и клиентские PDF-отчеты.
- **Полное описание:**
Проверяйте любые сайты на соответствие стандартам WCAG 2.2 уровня AA и European Accessibility Act (EN 301 549 V4.1.1) в один клик — на 100% локально в браузере, с живой демонстрацией исправлений «ДО / ПОСЛЕ» прямо поверх страницы и выгрузкой наглядных клиентских White-Label A4 PDF отчетов.

КЛЮЧЕВЫЕ ВОЗМОЖНОСТИ:
• Живой режим «ДО ↔ ПОСЛЕ» прямо на сайте: Переключайтесь между найденными ошибками и готовым визуальным исправлением на живой странице. Плавающая карточка инспектора автоматически выбирает свободный угол, не перекрывая верстку, поддерживает перетаскивание мышью и компактные микро-пины.
• Точный движок WCAG 2.2 AA: SC 2.5.8 (24×24 px с учетом исключений стандарта), SC 2.4.7 / 2.4.11 / 2.4.13 (перекрытие липкими шапками и карта маршрута Tab#), SC 3.2.6 / 3.3.7 / 3.3.8 (формы, OTP, вставка пароля и детекция сторонних overlay-виджетов).
• Наглядные отчеты со Spotlight-скриншотами: Крупные размеченные снимки проблемных узлов, дашборд готовности к EAA по 4 категориям и готовый CSS-код.
• White-Label экспорт для агентств (Pro): Подстановка логотипа студии и названия проекта клиента, чистая печать в A4 PDF (RU / EN / DE), а также экспорт в Markdown и Jira CSV.

## 4. Памятка перед отправкой архивов в магазины
1. Выполните `./deploy_cloud_worker.sh`, чтобы привязать публичный URL Cloudflare Worker (`*.workers.dev`) и автоматически убрать `http://127.0.0.1:8787/*` из `manifest.json`.
2. Для приема реальных платежей переключите Paywall `#926` и ключ `MONETIZE_API_KEY` в панели Monetize.software / Stripe из тестового режима (Test) в боевой (Live).
3. При загрузке в Firefox AMO приложите архив исходного кода `dist/wcag22-express-auditor-firefox-sources-v1.1.0.zip` в поле Source Code.
