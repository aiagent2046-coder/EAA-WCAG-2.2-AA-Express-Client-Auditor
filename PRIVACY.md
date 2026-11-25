# Privacy Policy — EAA & WCAG 2.2 AA Express Client Auditor

**Last Updated:** November 18, 2026  
**Applies to:** EAA & WCAG 2.2 AA Express Client Auditor browser extension (Chrome, Microsoft Edge, Mozilla Firefox)

---

## 1. Local-First Webpage Auditing (Zero Page Content Transmission)
All accessibility inspections — including DOM traversal, CSS bounding-box measurements (WCAG 2.2 SC 2.5.8), keyboard focus & sticky-header occlusion checks (SC 2.4.7, 2.4.11, 2.4.13), form authentication checks (SC 3.3.7, 3.3.8), live Before/After CSS previews, and local viewport screenshot crops (`tabs.captureVisibleTab`) — execute **100% locally inside your browser**.

- **No audited HTML, DOM text, form inputs, passwords, cookies, browsing history, or screenshot images are ever uploaded or transmitted to any external server.**
- Temporary audit results, cross-page consistent-help signatures (`domainHelpHistory`), and optional White-Label agency branding fields (agency name, contact, client name, logo image) are stored exclusively on your device inside `chrome.storage.local`.

## 2. Optional Pro Subscription & Billing Verification
If you choose to upgrade to **Express Client Auditor Pro** or restore an existing subscription:
- Only the **work email address** you explicitly enter into the upgrade dialog and the selected **plan identifier** are sent over HTTPS to our payment gateway proxy and [Monetize.software](https://monetize.software/) / [Stripe](https://stripe.com/) to create a Stripe Checkout session, verify active subscription status, or open the Stripe Billing Portal.
- Payment card details are entered directly on **Stripe Checkout** (`checkout.stripe.com`) and are never seen, processed, or stored by the extension.

## 3. Browser Permissions Justification
- **`activeTab` & `scripting`:** Used strictly when you click *Run Visual WCAG 2.2 & EAA Audit* to evaluate accessibility criteria and render the interactive Before/After overlay on the active tab. Never runs automatically in the background across websites.
- **`storage`:** Saves your latest audit report for PDF printing, HUD filter toggles, White-Label agency profile, and verified Pro license status locally in your browser.
- **Host Permissions (`appbox.space` & payment proxy worker):** Used solely to load current Pro plan pricing and verify Stripe subscription status.

## 4. Data Sharing & Retention
We do not sell, rent, or share user data with advertisers, data brokers, or third parties. You can clear all locally stored extension data at any time by clicking **Sign Out Pro** in the extension or removing the extension from your browser.

## 5. Contact
For privacy or support inquiries, please open an issue on the official repository:  
https://github.com/aiagent2046-coder/EAA-WCAG-2.2-AA-Express-Client-Auditor/issues

---

# Политика конфиденциальности (RU)

1. **100% локальный аудит страниц:** Весь анализ DOM-дерева, замеры интерактивных зон `24×24 px` (SC 2.5.8), проверка перекрытия фокуса липкими шапками (SC 2.4.11), интерактивный режим «ДО / ПОСЛЕ» и создание кроп-скриншотов (`captureVisibleTab`) выполняются **исключительно локально в вашем браузере**. Содержимое проверяемых страниц, вводимые данные и скриншоты никуда не отправляются.
2. **Оплата и проверка лицензии Pro:** При оформлении или восстановлении подписки Pro передается только указанный вами Email-адрес для создания сессии оплаты в **Stripe Checkout** через API Monetize.software и проверки статуса подписки. Платежные реквизиты карт обрабатываются напрямую на стороне Stripe.
3. **Хранение и удаление данных:** Настройки брендинга агентства и последний отчет хранятся локально в `chrome.storage.local` и удаляются при выходе из аккаунта в расширении или удалении расширения из браузера.
