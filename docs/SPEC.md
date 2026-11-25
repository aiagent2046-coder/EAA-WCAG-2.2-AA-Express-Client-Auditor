# Техническое задание (MVP): WCAG 2.2 AA & EAA Express Client Auditor

**Формат продукта:** кроссбраузерное расширение на базе Manifest V3 (Chrome, Firefox, Microsoft Edge) со 100% локальным исполнением в браузере (Zero-Backend, Offline-First).

**Целевой рынок и регуляторный драйвер:** веб-студии, QA-инженеры, фриланс-аудиторы и владельцы e-commerce в ЕС на фоне перехода стандарта `EN 301 549 V4.1.1` под European Accessibility Act на базу **WCAG 2.2 Level AA** ([разбор сроков и стандарта от Ardura Consulting](https://ardura.consulting/blog/wcag-accessibility-audit-european-accessibility-act-scope-timeline-cost/)).

**Главное отличие от старых сканеров (Lighthouse / axe Free):** точечный геометрический и поведенческий аудит именно **новых критериев [спецификации W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)** (размер таргетов `24×24 CSS px` с проверкой 24-пиксельных окружностей, перекрытие клавиатурного фокуса липкими шапками и cookie-баннерами, блокировка вставки паролей) + генерация брендированного клиентского отчета за один клик.

## 1. Продуктовая воронка: Free vs Agency Pro

Пэйволл строится по принципу «бесплатная диагностика на экране — платная упаковка результата для сдачи заказчику»:

| Контур | Что доступно пользователю | Техническое ограничение | Тариф в ExtensionPay | 
| ----- | ----- | ----- | ----- | 
| **Free (Визуальный инспектор)** | Полный прогон вкладки по новым критериям [обзора What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), интерактивная подсветка проблемных узлов через Shadow DOM оверлей, счетчик ошибок в попапе и просмотр первых 3 карточек с готовыми CSS-рекомендациями | Экспорт файлов и настройки White-Label заблокированы; копирование полного списка селекторов закрыто пэйволлом | `$0` (без регистрации) | 
| **Agency Pro (Подписка)** | Выгрузка готового к отправке клиенту **White-Label PDF / HTML-отчета** (с логотипом студии, названием проекта и кроп-скриншотами дефектов), экспорт тикетов в **Markdown / CSV / JSON** для Jira, Linear и GitHub Issues, сохранение профилей брендинга | Доступ активируется по флагу `user.paid === true` через библиотеку [ExtPay.js](https://github.com/glench/ExtPay) | `$24/мес` (`agency_monthly`) или `$190/год` (`agency_yearly`) | 
| **Solo QA Pass (Опциональный LTD)** | Все функции экспорта для одного специалиста без командного White-Label конструктора обложки | Одноразовый платеж на раннем этапе запуска для быстрого сбора оборотного кэша | `$49` разово (`solo_lifetime`) | 

## 2. Архитектура и файловая структура репозитория

Расширение не инжектирует постоянные скрипты на все сайты пользователя (`<all_urls>` отсутствует), что избавляет от пугающего предупреждения при установке и ускоряет автоматическую модерацию в [Chrome Web Store](https://developer.chrome.com/docs/webstore/review-process), [Mozilla Add-ons](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/) и [Microsoft Edge Add-ons](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

| Путь файла в проекте | Назначение модуля | 
| ----- | ----- | 
| `manifest.json` | Базовый манифест Manifest V3 под Chromium (Chrome, Edge) с правами `activeTab`, `scripting`, `storage` | 
| `manifest.firefox.json` | Оверлей манифеста для сборки под Firefox (`browser_specific_settings.gecko` и хост-разрешение для платежного шлюза) | 
| `vendor/ExtPay.js` | Официальный клиентский SDK [ExtensionPay](https://extensionpay.com/) без внешних CDN-зависимостей | 
| `src/background.js` | Service Worker: инициализация `ExtPay`, кэширование статуса оплаты, съемка видимой области вкладки (`captureVisibleTab`) | 
| `src/popup/popup.html` | Компактная панель запуска аудита, сводка по критериям `2.4.11`, `2.5.8`, `3.3.8`, `2.5.7` и кнопки экспорта | 
| `src/popup/popup.js` | Инжекция сканера через `chrome.scripting.executeScript`, рендер сводки, вызов генератора отчета или окна оплаты | 
| `src/content/scanner.js` | Изолированное ядро геометрических и DOM-проверок WCAG 2.2 AA + Shadow DOM оверлей подсветки дефектов | 
| `src/report/report.html` | Шаблон печатного White-Label отчета (формат A4 с CSS `@media print` для сохранения в чистый PDF через системный диалог или автопечать) | 
| `src/report/report.js` | Заполнение шаблона данными из `chrome.storage.session` / `local`, подстановка логотипа студии и генерация `.md` / `.csv` | 
| `_locales/{lang}/messages.json` | Локализованные строки названия, описания и интерфейса для мультиязычного ASO | 

## 3. Спецификация `manifest.json` (Manifest V3)

Единственный декларативный `content_scripts` привязан исключительно к домену `https://extensionpay.com/*` с параметром `"run_at": "document_start"` — это штатное требование [документации ExtPay.js](https://github.com/glench/ExtPay) для мгновенного перехвата успешной оплаты без запроса глобальных прав на чтение всех сайтов.

```
{
  "manifest_version": 3,
  "name": "__MSG_extName__",
  "description": "__MSG_extDescription__",
  "version": "0.1.0",
  "default_locale": "en",
  "minimum_chrome_version": "116",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_title": "Audit Page for WCAG 2.2 AA & EAA",
    "default_popup": "src/popup/popup.html"
  },
  "background": {
    "service_worker": "src/background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://extensionpay.com/*"],
      "js": ["vendor/ExtPay.js"],
      "run_at": "document_start"
    }
  ],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://extensionpay.com https://*.extensionpay.com;"
  },
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  }
}

```

**Дельта для сборки под Firefox (`package_extension.py`):**

1. Добавить секцию `"host_permissions": ["https://extensionpay.com/*"]` (согласно требованиям Mozilla для сетевых запросов из фонового контекста в [инструкции ExtPay](https://github.com/glench/ExtPay)).

2. Заменить `"service_worker"` на `"scripts": ["vendor/ExtPay.js", "src/background.js"]` в блоке `"background"` и добавить `browser_specific_settings.gecko.id` + `data_collection_permissions` (указать отсутствие сбора пользовательского контента).

## 4. Точные алгоритмы DOM-проверок новых критериев WCAG 2.2 AA (`src/content/scanner.js`)

Сканер инжектируется по требованию при нажатии кнопки **Run WCAG 2.2 Audit** в попапе и возвращает сериализуемый JSON-объект со списком нарушений, предупреждений и ручных проверок.

### 4.1. Вспомогательная генерация детерминированного CSS-селектора и фильтрация видимости

```
function isElementRendered(el) {
  if (!(el instanceof Element)) return false;
  if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getReadableSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts = [];
  let cur = el;
  while (cur && cur.nodeType === 1 && parts.length < 4) {
    let part = cur.tagName.toLowerCase();
    if (cur.classList.length > 0) {
      part += '.' + Array.from(cur.classList).slice(0, 2).map(c => CSS.escape(c)).join('.');
    }
    const parent = cur.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s => s.tagName === cur.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(cur) + 1})`;
      }
    }
    parts.unshift(part);
    if (cur.id) break;
    cur = parent;
  }
  return parts.join(' > ');
}

```

### 4.2. Критерий SC 2.5.8: Target Size (Minimum) — Level AA

По официальному документу [W3C Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), каждый интерактивный указательный таргет обязан иметь габариты не менее `24 × 24 CSS px`, **за исключением** элементов внутри текстовой строки (`Inline`), нативных немодифицированных контролов браузера (`User Agent Control`) и маломерных элементов, проходящих геометрическое правило отступа (`Spacing`: окружность диаметром `24 CSS px`, то есть радиусом `12px` из центра `boundingBox` маломерного элемента, не должна пересекать ни рамку любого соседнего таргета, ни 24-пиксельную окружность другого маломерного таргета).

```
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[onclick]'
].join(',');

function isInlineTextException(el, style) {
  if (!style.display.startsWith('inline')) return false;
  if (style.display === 'inline-block' || style.display === 'inline-flex') return false;
  const parent = el.parentElement;
  if (!parent) return false;
  // Проверяем, есть ли рядом обычный нецелевой текст в том же абзаце/блоке
  const parentText = parent.textContent.trim();
  const ownText = el.textContent.trim();
  return parentText.length > ownText.length;
}

function isNativeUnstyledControl(el, style) {
  if (!['INPUT', 'SELECT'].includes(el.tagName)) return false;
  return style.appearance !== 'none' && style.webkitAppearance !== 'none';
}

function circleIntersectsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.left, Math.min(cx, rect.right));
  const nearestY = Math.max(rect.top, Math.min(cy, rect.bottom));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  // Строгое пересечение с допуском 0.05px на субпиксельное округление
  return (dx * dx + dy * dy) < ((radius - 0.05) * (radius - 0.05));
}

function auditTargetSize258() {
  const nodes = Array.from(document.querySelectorAll(INTERACTIVE_SELECTOR)).filter(isElementRendered);
  const targets = nodes.map(el => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      el,
      rect,
      style,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      undersized: rect.width < 23.95 || rect.height < 23.95
    };
  });

  const issues = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (!t.undersized) continue;
    if (isInlineTextException(t.el, t.style)) continue;
    if (isNativeUnstyledControl(t.el, t.style)) continue;

    // Если мелкий input вложен внутрь крупного <label> >= 24x24px, кликабельная зона расширена легально
    const wrappingLabel = t.el.closest('label');
    if (wrappingLabel) {
      const lRect = wrappingLabel.getBoundingClientRect();
      if (lRect.width >= 24 && lRect.height >= 24) continue;
    }

    // Проверка исключения Spacing (окружность R = 12px вокруг центра t)
    const collisions = [];
    for (let j = 0; j < targets.length; j++) {
      if (i === j) continue;
      const other = targets[j];
      if (t.el.contains(other.el) || other.el.contains(t.el)) continue;

      const hitsBox = circleIntersectsRect(t.cx, t.cy, 12, other.rect);
      const hitsOtherCircle = other.undersized &&
        Math.hypot(t.cx - other.cx, t.cy - other.cy) < 23.9;

      if (hitsBox || hitsOtherCircle) {
        collisions.push(getReadableSelector(other.el));
      }
    }

    if (collisions.length > 0) {
      const padX = Math.max(0, Math.ceil((24 - t.rect.width) / 2));
      const padY = Math.max(0, Math.ceil((24 - t.rect.height) / 2));
      issues.push({
        criterion: '2.5.8',
        level: 'AA',
        severity: 'fail',
        title: 'Target Size (Minimum) < 24×24 CSS px without spacing clearance',
        selector: getReadableSelector(t.el),
        actual: `${Math.round(t.rect.width * 10) / 10} × ${Math.round(t.rect.height * 10) / 10} px (collides with ${collisions[0]})`,
        fixCode: `min-width: 24px; min-height: 24px; padding: ${padY}px ${padX}px;`,
        bbox: { x: t.rect.left + window.scrollX, y: t.rect.top + window.scrollY, w: t.rect.width, h: t.rect.height }
      });
    }
  }
  return issues;
}

```

### 4.3. Критерий SC 2.4.11: Focus Not Obscured (Minimum) — Level AA

Согласно [W3C Understanding SC 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) и описанию отказа [Technique F110](https://www.w3.org/WAI/WCAG22/Techniques/failures/F110), элемент, получивший клавиатурный фокус, не должен быть **полностью** закрыт авторским оверлеем (липким хедером, футером, плавающим чатом или неудаленным cookie-баннером). Если элемент перекрыт **частично**, он формально проходит `2.4.11 (AA)`, но заваливает `2.4.12 (AAA)` — такие узлы помечаются как `warning` с готовым расчетом `scroll-padding-top`, что резко повышает экспертную ценность отчета для агентства.

```
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function findStickyAncestor(node) {
  let cur = node;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const pos = window.getComputedStyle(cur).position;
    if (pos === 'fixed' || pos === 'sticky') return cur;
    cur = cur.parentElement;
  }
  return null;
}

function auditFocusNotObscured2411(maxNodes = 150) {
  const prevScrollX = window.scrollX;
  const prevScrollY = window.scrollY;
  const prevActive = document.activeElement;

  const focusables = Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
    .filter(el => isElementRendered(el) && el.tabIndex >= 0)
    .slice(0, maxNodes);

  const issues = [];

  for (const el of focusables) {
    // Если сам элемент лежит внутри sticky-шапки или модалки, он не перекрывает сам себя
    const ownStickyRoot = findStickyAncestor(el);

    el.focus({ preventScroll: false });
    const r = el.getBoundingClientRect();

    // Пропускаем элементы вне вьюпорта (например, sr-only skip-link до раскрытия)
    const left = Math.max(0, r.left);
    const right = Math.min(window.innerWidth, r.right);
    const top = Math.max(0, r.top);
    const bottom = Math.min(window.innerHeight, r.bottom);
    if (right - left < 2 || bottom - top < 2) continue;

    // 9 контрольных точек внутри видимого прямоугольника элемента
    const xs = [left + 1, (left + right) / 2, right - 1];
    const ys = [top + 1, (top + bottom) / 2, bottom - 1];

    let visibleSampleCount = 0;
    let blockerNode = null;

    for (const x of xs) {
      for (const y of ys) {
        const stack = document.elementsFromPoint(x, y);
        const topHit = stack.find(n => {
          const st = window.getComputedStyle(n);
          return st.pointerEvents !== 'none' && parseFloat(st.opacity) > 0.05;
        });

        if (!topHit) {
          visibleSampleCount++;
          continue;
        }

        const belongsToTarget = el === topHit || el.contains(topHit) || topHit.contains(el) ||
          (ownStickyRoot && ownStickyRoot.contains(topHit));

        if (belongsToTarget) {
          visibleSampleCount++;
        } else if (!blockerNode) {
          blockerNode = findStickyAncestor(topHit) || topHit;
        }
      }
    }

    if (visibleSampleCount === 0 && blockerNode) {
      const blockerRect = blockerNode.getBoundingClientRect();
      issues.push({
        criterion: '2.4.11',
        level: 'AA',
        severity: 'fail',
        title: 'Focused element is 100% obscured by sticky/overlay layer (F110)',
        selector: getReadableSelector(el),
        actual: `Covered by ${getReadableSelector(blockerNode)} (${Math.round(blockerRect.height)}px height)`,
        fixCode: `html { scroll-padding-top: ${Math.ceil(blockerRect.height + 16)}px; }`,
        bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      });
    } else if (visibleSampleCount > 0 && visibleSampleCount < 9 && blockerNode) {
      issues.push({
        criterion: '2.4.11 / 2.4.12',
        level: 'AAA-warn',
        severity: 'warning',
        title: `Focused element is partially obscured (${9 - visibleSampleCount}/9 points covered)`,
        selector: getReadableSelector(el),
        actual: `Partially overlapped by ${getReadableSelector(blockerNode)}`,
        fixCode: `Ensure scroll-margin-top / scroll-margin-bottom clears sticky chrome.`,
        bbox: { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }
      });
    }
  }

  // Возвращаем исходное состояние страницы без визуального скачка для пользователя
  if (prevActive && typeof prevActive.focus === 'function') {
    prevActive.focus({ preventScroll: true });
  }
  window.scrollTo(prevScrollX, prevScrollY);
  return issues;
}

```

### 4.4. Критерий SC 3.3.8: Accessible Authentication (Minimum) — Level AA и SC 2.5.7: Dragging Movements

Для полноты покрытия новых требований [WCAG 2.2 Level AA](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) сканер дополняется двумя легкими детерминированными проходами:

```
function auditAccessibleAuth338() {
  const issues = [];
  const authInputs = document.querySelectorAll(
    'input[type="password"], input[autocomplete*="password"], input[autocomplete="one-time-code"]'
  );

  authInputs.forEach(input => {
    if (!isElementRendered(input)) return;
    const rect = input.getBoundingClientRect();

    // 1. Проверка запрета вставки из менеджера паролей (paste blocking)
    let pasteBlocked = input.getAttribute('onpaste')?.includes('false') || false;
    if (!pasteBlocked) {
      const probeEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
      input.dispatchEvent(probeEvent);
      pasteBlocked = probeEvent.defaultPrevented;
    }

    if (pasteBlocked) {
      issues.push({
        criterion: '3.3.8',
        level: 'AA',
        severity: 'fail',
        title: 'Password / OTP field blocks clipboard paste (breaks password managers)',
        selector: getReadableSelector(input),
        actual: 'paste event is cancelled via preventDefault() or inline handler',
        fixCode: 'Remove paste event blockers and allow autocomplete="current-password".',
        bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
      });
    }

    // 2. Проверка принудительного отключения автозаполнения
    if (input.getAttribute('autocomplete') === 'off') {
      issues.push({
        criterion: '3.3.8',
        level: 'AA',
        severity: 'warning',
        title: 'Authentication field disables password manager autofill (autocomplete="off")',
        selector: getReadableSelector(input),
        actual: 'autocomplete="off" on credential input',
        fixCode: 'Set autocomplete="current-password" or "new-password".',
        bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
      });
    }
  });
  return issues;
}

function auditDraggingCandidates257() {
  const dragSelectors = '[draggable="true"], [role="slider"], [data-rbd-draggable-id], .swiper-wrapper, .sortable';
  return Array.from(document.querySelectorAll(dragSelectors))
    .filter(isElementRendered)
    .map(el => {
      const rect = el.getBoundingClientRect();
      return {
        criterion: '2.5.7',
        level: 'AA',
        severity: 'manual',
        title: 'Verify single-pointer (click/tap) alternative for draggable / slider widget',
        selector: getReadableSelector(el),
        actual: `Interactive drag/slide container (${el.tagName.toLowerCase()})`,
        fixCode: 'Provide explicit Up/Down, Prev/Next, or numeric input controls alongside drag.',
        bbox: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height }
      };
    });
}

```

## 5. Изолированный визуальный оверлей в вкладке (Shadow DOM HUD)

Чтобы стили проверяемого сайта не ломали подсветку (и наоборот — чтобы оверлей не искажал геометрию повторного скана), контейнер рамок монтируется в `document.documentElement` через закрытый `attachShadow({ mode: 'open' })` с `pointer-events: none`:

1. **Цветовая кодировка рамок:** жесткие нарушения `AA` (`fail`) обводятся сплошной рамкой `2px solid #dc2626` с бейджем критерия (`2.5.8` или `2.4.11`) в левом верхнем углу; предупреждения (`warning`) — пунктиром `2px dashed #d97706`; элементы на ручную проверку `2.5.7` (`manual`) — `2px dotted #2563eb`.

2. **Прыжок к дефекту из попапа:** клик по строке ошибки в `popup.html` отправляет `chrome.tabs.sendMessage(tabId, { type: 'HIGHLIGHT_ISSUE', index })` — контент-скрипт плавно прокручивает элемент в центр экрана и пульсирует рамкой.

3. **Автозахват мини-скриншотов для платного PDF-отчета:** перед генерацией White-Label отчета `background.js` для топ-15 ошибок прокручивает узел в видимую зону, делает снимок через `chrome.tabs.captureVisibleTab(null, { format: 'png' })` (разрешено правом `activeTab` без дополнительных разрешений) и вырезает кроп `360 × 180 px` вокруг `bbox` на `OffscreenCanvas`.

## 6. Формат платного White-Label отчета (`src/report/report.html`)

Агентства покупают подписку ради документа, который выглядит как консалтинговый артефакт стоимостью `€500+`, готовый к пересылке клиенту:

| Блок клиентского отчета | Содержимое блока | Источник данных | 
| ----- | ----- | ----- | 
| **1. Шапка White-Label (Agency Cover)** | Логотип студии (`base64` из `chrome.storage.local`), название агентства `[Agency Name]`, контакт аудитора, проверяемый URL, дата/время прогона, размер вьюпорта (`1440×900` или мобильный `390×844`) | Настройки профиля Pro + метаданные вкладки | 
| **2. Executive Verdict (EAA / EN 301 549 V4.1.1)** | Статус готовности страницы (`Action Required` / `Compliant on Automated WCAG 2.2 Delta`), сводная карточка по 4 проверяемым зонам (`2.5.8`, `2.4.11`, `3.3.8`, `2.5.7`) и юридическая ремарка о разнице между автоматическим DOM-аудитом и полным ручным тестированием скринридером | Агрегатор результатов `scanner.js` | 
| **3. Реестр критических дефектов (Level AA Fails)** | По каждому узлу: кроп-скриншот с красной рамкой, точный CSS-селектор, фактический замер (`16 × 16 px` или какой именно sticky-блок перекрыл фокус) и блок **Ready-to-Paste Developer Fix** | Массив `issues.filter(i => i.severity === 'fail')` | 
| **4. Чек-лист ручной QA-верификации (10-sec Check)** | Интерактивные чекбоксы прямо в `report.html` перед печатью в PDF: аудитор за 15 секунд проставляет `Pass / Fail` напротив найденных drag-виджетов (`2.5.7`) и форм с повторным вводом (`3.3.7`), после чего нажимает кнопку **Save Client PDF** (`window.print()`) | Полуавтоматические флаги `manual` + решение аудитора | 
| **5. Пакетная выгрузка для разработчиков** | Кнопки скачивания `.md` (готовый чек-лист для GitHub Issue / PR) и `.csv` (импорт задач в Jira / Linear с колонками `Summary`, `WCAG Criterion`, `Selector`, `Fix Snippet`) | Локальная генерация `Blob` + `URL.createObjectURL` | 

## 7. Подключение монетизации через `ExtPay.js` (без своего бэкенда)

По правилам Service Worker в Manifest V3 ([документация Glench/ExtPay](https://github.com/glench/ExtPay)) метод `extpay.startBackground()` вызывается строго один раз на верхнем уровне `src/background.js`, а внутри асинхронных обработчиков сообщений экземпляр `ExtPay` создается заново без повторного вызова `startBackground()`.

```
// src/background.js
importScripts('../vendor/ExtPay.js');

const EXTPAY_ID = 'wcag22-express-auditor'; // ID, зарегистрированный в панели ExtensionPay.com
const extpay = ExtPay(EXTPAY_ID);
extpay.startBackground();

extpay.onPaid.addListener(user => {
  chrome.storage.local.set({
    proStatus: {
      paid: true,
      planNickname: user.plan?.nickname || 'pro',
      checkedAt: Date.now()
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PRO_STATUS') {
    const client = ExtPay(EXTPAY_ID);
    client.getUser()
      .then(user => {
        const status = {
          paid: Boolean(user.paid),
          email: user.email || null,
          plan: user.plan?.nickname || null,
          checkedAt: Date.now()
        };
        chrome.storage.local.set({ proStatus: status });
        sendResponse(status);
      })
      .catch(async () => {
        // Офлайн-фоллбэк: если нет сети на закрытом стенде, читаем последний валидный статус из storage
        const cached = await chrome.storage.local.get('proStatus');
        sendResponse(cached.proStatus || { paid: false, offlineFallback: true });
      });
    return true; // Держим канал открытым для async sendResponse
  }

  if (msg.type === 'OPEN_CHECKOUT') {
    const client = ExtPay(EXTPAY_ID);
    client.openPaymentPage(msg.planNickname || undefined);
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'OPEN_RESTORE_LOGIN') {
    const client = ExtPay(EXTPAY_ID);
    client.openLoginPage();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === 'CAPTURE_TAB') {
    chrome.tabs.captureVisibleTab(sender.tab?.windowId ?? null, { format: 'png' }, dataUrl => {
      sendResponse({ dataUrl: dataUrl || null });
    });
    return true;
  }
});

```

**Логика пэйволла в `popup.js` при клике на «Export White-Label Client Report»:**

1. Бесплатный скан уже выполнен, в попапе горит бейдж, например: `Found 11 WCAG 2.2 AA Violations (7 Target Size, 4 Obscured Focus)`.

2. При клике на экспорт вызывается `chrome.runtime.sendMessage({ type: 'GET_PRO_STATUS' })`.

3. Если `status.paid === true` — открывается вкладка `src/report/report.html` с уже заполненными данными, логотипом агентства и кроп-скриншотами.

4. Если `status.paid === false` — открывается компактная шторка предпросмотра (размытый превью-лист клиентского отчета + 2 кнопки выбора тарифа: **Agency Pro `$24/mo`** → `OPEN_CHECKOUT` с `agency_monthly` или **Restore Purchase** → `OPEN_RESTORE_LOGIN`).

## 8. План сборки на 48 часов и чек-лист релиза

| Этап уикенд-спринта | Конкретный результат | Критерий готовности | 
| ----- | ----- | ----- | 
| **Суббота, утро (4 ч)** | Каркас репозитория, `manifest.json` + `scanner.js` (алгоритмы `2.5.8`, `2.4.11`, `3.3.8`, `2.5.7`) и Shadow DOM оверлей рамок | На реальных лендингах с cookie-баннерами и мелкими иконками в футере сканер отрабатывает быстрее `400 мс` без сдвига скролла | 
| **Суббота, вечер (4 ч)** | UI попапа `popup.html` + кроп-скриншоты через `captureVisibleTab` + печатный шаблон `report.html` (`@media print`) + экспорт `.md` / `.csv` | Кнопка `Save Client PDF` генерирует чистый многостраничный A4-документ без разрывов карточек дефектов посередине (`break-inside: avoid`) | 
| **Воскресенье, утро (3 ч)** | Регистрация `wcag22-express-auditor` в [ExtensionPay](https://extensionpay.com/), привязка Stripe, тест-оплата тестовой картой Stripe и офлайн-кэш лицензии | Переключение из `paid: false` в `paid: true` разблокирует White-Label отчет мгновенно без перезагрузки браузера | 
| **Воскресенье, вечер (3 ч)** | Прогон локализаций `_locales` под ASO-ключи (`WCAG 2.2 AA checker`, `European Accessibility Act audit`, `Target size 24px inspector`), сборка `.zip` под AMO, Edge и [Chrome Web Store](https://developer.chrome.com/blog/cws-review-updates-2026) + запись 15-секундного демо-рилса в Playwright | Пакеты отправлены на модерацию во все три стора; в форме Privacy указано `100% local execution, zero webpage data transmitted` | 
