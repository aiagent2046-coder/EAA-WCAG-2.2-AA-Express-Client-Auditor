let auditData = null;
let brandData = {};
let currentLang = 'ru';

const I18N = {
  ru: {
    toolbarTitle: 'Клиентский White-Label отчет',
    toolbarSub: 'Наглядные скриншоты дефектов и чистый A4 PDF без колонтитулов браузера',
    btnPrint: 'Сохранить PDF для клиента',
    eyebrow: 'Европейский акт о доступности (EN 301 549 V4.1.1) · WCAG 2.2 Уровень AA',
    title: 'Визуальный отчет об аудите доступности (WCAG 2.2 & EAA)',
    defaultAgency: 'Подготовлено командой аудита доступности (QA)',
    preparedBy: 'Исполнитель:',
    lblClient: 'Клиент / Проект',
    lblUrl: 'Проверенный URL',
    lblDate: 'Дата и время',
    lblVp: 'Окно просмотра',
    kpiFail: 'Нарушения уровня AA',
    kpiWarn: 'Предупреждения и риски',
    kpiScore: 'Индекс готовности EAA',
    kpiNodes: 'Проверено контролов DOM',
    verdictFail: n => `Требуются правки (ошибок AA: ${n})`,
    verdictPass: 'Автопроверки WCAG 2.2 AA пройдены',
    scope: '<strong>Методология и визуальная верификация (v0.6.1 Visual X-Ray):</strong> автоматический замер геометрии, видимости фокуса и кросс-страничной навигации по стандарту EN 301 549 V4.1.1 / W3C WCAG 2.2 AA с автоматической Spotlight-разметкой снимков экрана.',
    secFails: '1. Критические нарушения уровня AA — визуальные доказательства и код исправления',
    zeroFails: 'Критических нарушений уровня WCAG 2.2 AA на текущем экране не обнаружено.',
    secWarns: '2. Сводная таблица предупреждений, контраста фокуса и отступов',
    thWCrit: 'Критерий',
    thWEl: 'Элемент и селектор',
    thWObs: 'Фактический замер',
    thWFix: 'Рекомендуемое решение CSS / HTML',
    secManual: '3. Контрольный чек-лист аудитора (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Критерий',
    thMDesc: 'Контрольный вопрос',
    thMSign: 'Отметка аудитора',
    pass: 'Пройдено',
    fail: 'Ошибка',
    na: 'Н/П',
    tagFail: 'НАРУШЕНИЕ AA',
    lblSelector: 'Технический селектор:',
    lblFix: 'Готовый CSS / HTML фикс:',
    cropHint: 'Нажмите на снимок для увеличения ↗',
    m326: 'Глобальный макет — ссылка или виджет помощи/контактов расположены в едином порядке на всех страницах.',
    m326AutoPass: n => `Автоматически подтверждено расширением на ${n} стр. этого домена.`,
    m337: 'Многошаговые формы — ранее введенные пользователем данные подставляются автоматически без повторного ввода.',
    pillars: {
      target: '1. Зоны клика и моторика (SC 2.5.8)',
      focus: '2. Видимость и слой фокуса (SC 2.4.7 / 2.4.11)',
      auth: '3. Вход без барьеров и формы (SC 3.3.7 / 3.3.8)',
      nav: '4. Порядок Tab, помощь и EAA (SC 2.4.3 / 3.2.6)',
      ok: 'В норме',
      warn: n => `Риск (${n})`,
      fail: n => `Ошибки AA (${n})`
    },
    humanImpact(iss) {
      switch (iss.code) {
        case 'TARGET_COLLISION':
          return '👆 Риск для пользователя: слишком мелкая кнопка вплотную к соседней — люди с тремором рук и пользователи смартфонов промахиваются при нажатии.';
        case 'FOCUS_RING_SUPPRESSED':
          return '⌨️ Риск для пользователя: при переходе клавишей Tab поле никак не подсвечивается — незрячие и моторные пользователи теряют курсор на странице.';
        case 'FOCUS_OBSCURED_FULL':
          return '🧱 Риск для пользователя: элемент получает фокус клавиатуры, но на 100% спрятан под прилипшей шапкой — пользователь не видит, куда нажимает Enter.';
        case 'AUTH_PASTE_BLOCKED':
          return '🔐 Риск для пользователя: заблокирована вставка пароля из менеджера паролей — прямое нарушение когнитивной доступности EAA.';
        case 'CONSISTENT_HELP_MISMATCH':
          return '🧭 Риск для пользователя: блок помощи прыгает в разные места макета на разных страницах сайта.';
        default:
          return '⚠️ Нарушение доступности интерфейса по стандарту EN 301 549 / WCAG 2.2 Level AA.';
      }
    },
    issueTitle(iss) {
      const p = iss.params || {};
      switch (iss.code) {
        case 'TARGET_COLLISION':
          return 'Размер интерактивного элемента менее 24×24 CSS px с пересечением зоны соседнего контрола';
        case 'TARGET_SPACING_PASS':
          return 'Маломерный элемент (менее 24×24 px) проходит только за счет пустого поля вокруг';
        case 'FOCUS_OBSCURED_FULL':
          return 'Элемент в фокусе на 100% перекрыт фиксированной шапкой или баннером (F110)';
        case 'FOCUS_OBSCURED_PARTIAL':
          return `Частичное перекрытие элемента в фокусе (${p.coveredPts || '?'} из 9 точек закрыты)`;
        case 'FOCUS_RING_SUPPRESSED':
          return 'Подавлен видимый индикатор фокуса клавиатуры (outline: none без замены)';
        case 'FOCUS_APPEARANCE_LOW':
          return `Низкий контраст рамки фокуса (${p.ratio || '?'}:1 при рекомендации не менее 3:1)`;
        case 'TABINDEX_POSITIVE':
          return `Положительный tabindex="${p.tabindex}" ломает естественный порядок табуляции`;
        case 'CONSISTENT_HELP_MISMATCH':
          return `Нарушен единый порядок блока помощи (${p.kind}) между страницами сайта`;
        case 'AUTH_PASTE_BLOCKED':
          return 'Поле пароля/кода блокирует вставку из буфера обмена (ломает менеджеры паролей)';
        case 'AUTH_AUTOCOMPLETE_OFF':
          return 'Отключено автозаполнение менеджером паролей (autocomplete="off")';
        case 'AUTH_OTP_SPLIT_NO_PASTE':
          return `Раздельные поля кода (${p.boxes || 6} ячеек) без autocomplete="one-time-code"`;
        case 'AUTH_COGNITIVE_CAPTCHA':
          return 'Обнаружена CAPTCHA — убедитесь в наличии беспарольной альтернативы или распознавания объектов';
        case 'REDUNDANT_ENTRY_RISK':
          return 'Дублирующиеся поля доставки и оплаты без чекбокса «Совпадает с адресом доставки»';
        case 'EAA_OVERLAY_DETECTED':
          return `Обнаружен сторонний виджет-оверлей (${p.vendor}) — не признается регуляторами ЕС достаточным для EAA`;
        case 'DRAG_MANUAL_CHECK':
          return `Элемент перетаскивания / слайдер (${p.tag || 'widget'}) без видимых кнопок одиночного клика рядом`;
        default:
          return iss.title;
      }
    },
    issueObs(iss) {
      const p = iss.params || {};
      switch (iss.code) {
        case 'TARGET_COLLISION':
          return `Элемент «${iss.elementLabel}»: ${p.w} × ${p.h} px — 24px-окружность задевает ${p.neighbor}`;
        case 'TARGET_SPACING_PASS':
          return `${p.w} × ${p.h} px (проходит по правилу 24px-окружности)`;
        case 'FOCUS_OBSCURED_FULL':
          return `Элемент «${iss.elementLabel}» полностью скрыт под слоем ${p.blocker} (высота ${p.blockerH}px)`;
        case 'FOCUS_OBSCURED_PARTIAL':
          return `Частично перекрыт слоем ${p.blocker} (${p.coveredPts}/9 точек)`;
        case 'FOCUS_RING_SUPPRESSED':
          return `Поле «${iss.elementLabel}»: отсутствуют контур outline, тень box-shadow и изменение границы при фокусе`;
        case 'FOCUS_APPEARANCE_LOW':
          return `Контраст контура фокуса ${p.ratio}:1 (толщина ${p.outlineW}px)`;
        case 'TABINDEX_POSITIVE':
          return `Атрибут tabindex="${p.tabindex}" перехватывает фокус раньше основного контента`;
        case 'CONSISTENT_HELP_MISMATCH':
          return `На стр. ${p.basePath} блок в зоне ${p.baseZone}, а на ${p.curPath} переместился в ${p.curZone}`;
        case 'AUTH_PASTE_BLOCKED':
          return 'Событие вставки (paste) заблокировано через preventDefault() или атрибут onpaste';
        case 'AUTH_AUTOCOMPLETE_OFF':
          return 'Атрибут autocomplete="off" запрещает менеджеру паролей подставлять учетные данные';
        case 'AUTH_OTP_SPLIT_NO_PASTE':
          return `${p.boxes} одиночных полей maxlength="1" без автоподстановки полного кода из буфера`;
        case 'REDUNDANT_ENTRY_RISK':
          return 'Форма требует повторного ручного ввода адреса плательщика';
        case 'EAA_OVERLAY_DETECTED':
          return `Скрипт ${p.vendor} накладывает поверхностный виджет вместо исправления исходного DOM/ARIA-кода`;
        default:
          return iss.actual;
      }
    }
  },
  en: {
    toolbarTitle: 'White-Label Visual Client Report',
    toolbarSub: 'Spotlight-annotated visual proof & clean A4 PDF without browser headers',
    btnPrint: 'Save Client PDF',
    eyebrow: 'European Accessibility Act (EN 301 549 V4.1.1) · WCAG 2.2 Level AA',
    title: 'Accessibility & EAA Visual Audit Report',
    defaultAgency: 'Prepared by Accessibility QA Team',
    preparedBy: 'Prepared by',
    lblClient: 'Client / Project',
    lblUrl: 'Audited URL',
    lblDate: 'Audit Timestamp',
    lblVp: 'Viewport',
    kpiFail: 'Level AA Violations',
    kpiWarn: 'Warnings & EAA Risks',
    kpiScore: 'EAA Readiness Index',
    kpiNodes: 'Evaluated DOM Controls',
    verdictFail: n => `Action Required (${n} AA Fails)`,
    verdictPass: 'Passed Automated WCAG 2.2 AA',
    scope: '<strong>Scope & Visual Evidence (v0.6.1 Visual X-Ray):</strong> Deterministic DOM geometry, focus-indicator contrast, and cross-page consistency inspection under EN 301 549 V4.1.1 / W3C WCAG 2.2 AA with automated Spotlight screenshot annotations.',
    secFails: '1. Level AA Violations — Visual Proof & Developer Remediation',
    zeroFails: 'Zero automated WCAG 2.2 Level AA violations detected on this viewport.',
    secWarns: '2. Compact Advisory, Focus Contrast & Spacing Digest',
    thWCrit: 'Criterion',
    thWEl: 'Control & Selector',
    thWObs: 'Measured Telemetry',
    thWFix: 'Recommended Remediation',
    secManual: '3. Guided 10-Second Manual QA Sign-Off (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Criterion',
    thMDesc: 'Verification Check',
    thMSign: 'Auditor Sign-Off',
    pass: 'Pass',
    fail: 'Fail',
    na: 'N/A',
    tagFail: 'AA FAIL',
    lblSelector: 'DOM Selector:',
    lblFix: 'Ready-to-Apply Fix:',
    cropHint: 'Click screenshot to zoom full size ↗',
    m326: 'Global layout — verify help/contact link or widget appears in consistent relative order across pages.',
    m326AutoPass: n => `Automatically verified across ${n} audited pages on this domain.`,
    m337: 'Multi-step forms — verify previously entered user data is auto-populated or selectable without re-typing.',
    pillars: {
      target: '1. Pointer & Touch Targets (SC 2.5.8)',
      focus: '2. Focus Ring & Sticky Layers (SC 2.4.7 / 2.4.11)',
      auth: '3. Frictionless Login & Forms (SC 3.3.7 / 3.3.8)',
      nav: '4. Tab Order, Help & EAA Risk (SC 2.4.3 / 3.2.6)',
      ok: 'Passed',
      warn: n => `Warnings (${n})`,
      fail: n => `AA Fails (${n})`
    },
    humanImpact(iss) {
      switch (iss.code) {
        case 'TARGET_COLLISION':
          return '👆 User Impact: Undersized hit box collides with adjacent control — causes misclicks for mobile & motor-impaired users.';
        case 'FOCUS_RING_SUPPRESSED':
          return '⌨️ User Impact: Focus indicator disappears when pressing Tab — keyboard-only users cannot see where they are.';
        case 'FOCUS_OBSCURED_FULL':
          return '🧱 User Impact: Focused control is 100% trapped behind a sticky bar — keyboard users press Enter blindly.';
        case 'AUTH_PASTE_BLOCKED':
          return '🔐 User Impact: Password manager paste is blocked — fails EAA cognitive accessibility mandate.';
        default:
          return '⚠️ Violates mandatory EN 301 549 / WCAG 2.2 Level AA accessibility requirements.';
      }
    },
    issueTitle: iss => iss.title,
    issueObs: iss => `${iss.elementLabel ? `"${iss.elementLabel}" — ` : ''}${iss.actual}`
  },
  de: {
    toolbarTitle: 'White-Label-Prüfbericht (BFSG / EAA)',
    toolbarSub: 'Visuelle Fehlerbelege & sauberer A4-PDF-Export',
    btnPrint: 'Kunden-PDF speichern',
    eyebrow: 'Barrierefreiheitsstärkungsgesetz (BFSG · EN 301 549 V4.1.1) · WCAG 2.2 Stufe AA',
    title: 'Visueller Prüfbericht zur Barrierefreiheit (WCAG 2.2 & EAA)',
    defaultAgency: 'Erstellt vom Accessibility-QA-Team',
    preparedBy: 'Prüfstelle:',
    lblClient: 'Kunde / Projekt',
    lblUrl: 'Geprüfte URL',
    lblDate: 'Prüfzeitpunkt',
    lblVp: 'Viewport',
    kpiFail: 'Stufe-AA-Verstöße',
    kpiWarn: 'Warnungen & Risiken',
    kpiScore: 'EAA-Bereitschaftsindex',
    kpiNodes: 'Geprüfte DOM-Elemente',
    verdictFail: n => `Handlungsbedarf (${n} AA-Verstöße)`,
    verdictPass: 'Automatische WCAG-2.2-Prüfung bestanden',
    scope: '<strong>Methodik & Visuelle Belege (v0.6.1 Visual X-Ray):</strong> Deterministische DOM-Geometrie- und Fokus-Prüfung gemäß EN 301 549 V4.1.1 / BFSG mit automatischer Spotlight-Screenshot-Markierung.',
    secFails: '1. Kritische Verstöße der Stufe AA — Visuelle Belege & Korrekturcode',
    zeroFails: 'Keine automatisierten Verstöße der Stufe WCAG 2.2 AA im aktuellen Viewport festgestellt.',
    secWarns: '2. Kompakte Übersicht der Warnungen, Fokuskontraste & Abstände',
    thWCrit: 'Kriterium',
    thWEl: 'Element & Selektor',
    thWObs: 'Messwert',
    thWFix: 'Empfohlene Korrektur',
    secManual: '3. Manuelle 10-Sekunden-Prüfung (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Kriterium',
    thMDesc: 'Prüfpunkt',
    thMSign: 'Freigabe',
    pass: 'Bestanden',
    fail: 'Fehler',
    na: 'N/Z',
    tagFail: 'AA-VERSTOSS',
    lblSelector: 'Selektor:',
    lblFix: 'Entwickler-Korrektur:',
    cropHint: 'Zum Vergrößern anklicken ↗',
    m326: 'Seitenlayout — Hilfe-/Kontaktoptionen erscheinen auf allen Unterseiten an derselben relativen Position.',
    m326AutoPass: n => `Automatisch über ${n} geprüfte Unterseiten dieser Domain bestätigt.`,
    m337: 'Mehrstufige Formulare — bereits eingegebene Daten werden ohne erneutes Eintippen übernommen.',
    pillars: {
      target: '1. Klickflächen & Motorik (SC 2.5.8)',
      focus: '2. Fokus-Sichtbarkeit & Layer (SC 2.4.7 / 2.4.11)',
      auth: '3. Barrierefreier Login & Formulare (SC 3.3.7 / 3.3.8)',
      nav: '4. Tab-Reihenfolge, Hilfe & BFSG (SC 2.4.3 / 3.2.6)',
      ok: 'Bestanden',
      warn: n => `Warnungen (${n})`,
      fail: n => `AA-Fehler (${n})`
    },
    humanImpact(iss) {
      if (iss.code === 'FOCUS_RING_SUPPRESSED') return '⌨️ Nutzer-Auswirkung: Unsichtbarer Tastaturfokus — Tastaturnutzer verlieren die Orientierung.';
      if (iss.code === 'FOCUS_OBSCURED_FULL') return '🧱 Nutzer-Auswirkung: Fokussiertes Element komplett hinter fixiertem Header verborgen.';
      return '⚠️ Verstoß gegen verbindliche BFSG / EN 301 549 Barrierefreiheits-Anforderungen.';
    },
    issueTitle: iss => iss.title,
    issueObs: iss => iss.actual
  }
};

function normalizeSelectorDigits(sel) {
  return String(sel || '')
    .replace(/:nth-of-type\(\d+\)/g, '')
    .replace(/\d{2,}/g, '#')
    .replace(/-\d+\b/g, '-#');
}

function getComponentSignature(item) {
  if (item.componentGroupKey) {
    return `${item.criterion}|${item.code || ''}|${item.componentGroupKey}|${item.fixCode || ''}`;
  }
  const raw = String(item.selector || '').trim();
  const parts = raw.split('>').map(s => s.trim()).filter(Boolean);
  const leaf = normalizeSelectorDigits(parts[parts.length - 1] || raw);
  const parent = normalizeSelectorDigits(parts[parts.length - 2] || '');
  const hasLeafClass = leaf.includes('.');
  const sigSelector = hasLeafClass ? leaf : `${parent} > ${leaf}`;
  return `${item.criterion}|${item.code || ''}|${sigSelector}|${item.fixCode || ''}`;
}

function groupByComponent(list) {
  const map = new Map();
  for (const item of list) {
    const key = getComponentSignature(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return Array.from(map.values());
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toMarkdown(audit, brand) {
  const t = I18N[currentLang];
  const lines = [
    `# ${t.title} — ${brand.clientName || audit.pageTitle}`,
    '',
    `- **${t.lblUrl}:** ${audit.url}`,
    `- **${t.preparedBy}** ${brand.agencyName || t.defaultAgency}${brand.auditorContact ? ` (${brand.auditorContact})` : ''}`,
    `- **${t.lblDate}:** ${audit.scannedAt}`,
    `- **${t.lblVp}:** ${audit.viewport}`,
    `- **EAA Readiness Index:** ${audit.readinessScore ?? 100}%`,
    `- **Summary:** ${audit.counts.fail} AA Fails · ${audit.counts.warning} Warnings · ${audit.counts.manual} Manual QA`,
    ''
  ];

  audit.issues.forEach((iss, idx) => {
    lines.push(`### ${idx + 1}. [SC ${iss.criterion} · ${iss.severity.toUpperCase()}] ${t.issueTitle(iss)}`);
    lines.push(`- **Selector:** \`${iss.selector}\``);
    lines.push(`- **Observed:** ${t.issueObs(iss)}`);
    lines.push(`- **Fix:** \`${iss.fixCode}\``);
    lines.push('');
  });
  return lines.join('\n');
}

function csvEscape(val) {
  return `"${String(val ?? '').replace(/"/g, '""')}"`;
}

function toCsv(audit) {
  const t = I18N[currentLang];
  const rows = [['Index', 'WCAG_Criterion', 'Severity', 'Title', 'Selector', 'Observed', 'Recommended_Fix']];
  audit.issues.forEach((iss, idx) => {
    rows.push([
      idx + 1,
      iss.criterion,
      iss.severity.toUpperCase(),
      t.issueTitle(iss),
      iss.selector,
      t.issueObs(iss),
      iss.fixCode
    ]);
  });
  return rows.map(r => r.map(csvEscape).join(',')).join('\n');
}

function formatRepeatedLabels(items) {
  const sampleLabels = items
    .map(x => x.elementLabel)
    .filter(Boolean)
    .slice(0, 4)
    .map(s => `"${s}"`)
    .join(', ');
  const moreCount = Math.max(0, items.length - 4);
  const countBadge = currentLang === 'ru'
    ? `Однотипный компонент (×${items.length} шт.): `
    : (currentLang === 'de' ? `Gleichartiges Bauteil (×${items.length}): ` : `Repeated component (×${items.length} controls): `);
  const moreSuffix = moreCount > 0
    ? (currentLang === 'ru' ? ` и еще ${moreCount}` : (currentLang === 'de' ? ` +${moreCount} weitere` : ` +${moreCount} more`))
    : '';
  return `${countBadge}${sampleLabels}${moreSuffix}`;
}

function renderPillarDashboard(audit, t) {
  const grid = document.getElementById('pillars-grid');
  if (!grid) return;
  grid.replaceChildren();

  const defs = [
    { key: 'target', match: i => i.criterion === '2.5.8' },
    { key: 'focus', match: i => ['2.4.7', '2.4.11', '2.4.13'].includes(i.criterion) },
    { key: 'auth', match: i => ['3.3.7', '3.3.8'].includes(i.criterion) },
    { key: 'nav', match: i => ['2.4.3', '2.5.7', '3.2.6', 'EN 301 549'].includes(i.criterion) }
  ];

  for (const d of defs) {
    const subset = audit.issues.filter(d.match);
    const fCnt = subset.filter(i => i.severity === 'fail').length;
    const wCnt = subset.filter(i => i.severity !== 'fail').length;

    let state = 'pass';
    let pct = 100;
    let statusText = t.pillars.ok;
    if (fCnt > 0) {
      state = 'fail';
      pct = Math.max(18, 100 - fCnt * 28 - Math.min(20, wCnt * 4));
      statusText = t.pillars.fail(fCnt);
    } else if (wCnt > 0) {
      state = 'warn';
      pct = Math.max(58, 95 - Math.min(35, wCnt * 3));
      statusText = t.pillars.warn(wCnt);
    }

    const card = document.createElement('div');
    card.className = 'pillar-card';
    card.innerHTML = `
      <div class="pillar-top">
        <span class="pillar-name">${t.pillars[d.key]}</span>
        <span class="pillar-status is-${state}">${statusText}</span>
      </div>
      <div class="pillar-bar">
        <div class="pillar-fill is-${state}" style="width:${pct}%"></div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function openLightbox(src, caption) {
  const lb = document.getElementById('img-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');
  if (!lb || !img) return;
  img.src = src;
  if (cap) cap.textContent = caption || '';
  lb.hidden = false;
}

document.getElementById('lightbox-close')?.addEventListener('click', () => {
  document.getElementById('img-lightbox').hidden = true;
});
document.getElementById('img-lightbox')?.addEventListener('click', e => {
  if (e.target.id === 'img-lightbox') document.getElementById('img-lightbox').hidden = true;
});

function updateInlineTeaserVisibility() {
  const gate = document.getElementById('inline-teaser-gate');
  if (!gate) return;
  if (reportProUnlocked || !auditData) {
    gate.hidden = true;
    return;
  }
  const hasLockedContent = auditData.issues.length > 0;
  gate.hidden = !hasLockedContent;

  const titleEl = document.getElementById('ui-teaser-title');
  const descEl = document.getElementById('ui-teaser-desc');
  const btnEl = document.getElementById('btn-inline-unlock');

  const remCount = Math.max(0, auditData.issues.length - 1);
  if (currentLang === 'ru') {
    titleEl.textContent = auditData.counts.fail > 0
      ? 'Вы видите реальный визуальный разбор дефекта №1 на вашем сайте'
      : 'Предварительный срез готов — откройте полную таблицу рекомендаций и экспорт PDF';
    descEl.textContent = `В полном Pro-отчете доступны еще ${remCount} проверенных элементов, крупные Spotlight-скриншоты всех ошибок, логотип вашего агентства и печать чистого A4 PDF без водяных знаков.`;
    btnEl.textContent = 'Разблокировать весь отчет и PDF — $10/мес';
  } else if (currentLang === 'de') {
    titleEl.textContent = 'Oben sehen Sie den vollständigen visuellen Beleg #1 Ihrer Seite';
    descEl.textContent = `Schalten Sie ${remCount} weitere Prüfpunkte, alle Spotlight-Screenshots, Agentur-Branding und den sauberen A4-PDF-Export frei.`;
    btnEl.textContent = 'Vollständigen Bericht & PDF freischalten — $10/Monat';
  } else {
    titleEl.textContent = 'Above is live visual evidence #1 captured directly on your site';
    descEl.textContent = `Unlock ${remCount} additional findings with Spotlight screenshots, custom agency White-Label branding, Jira CSV export, and clean A4 PDF printing.`;
    btnEl.textContent = 'Unlock Full Visual Report & PDF — $10/mo';
  }
}

function renderReport() {
  if (!auditData) return;
  const t = I18N[currentLang];
  document.documentElement.lang = currentLang;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.lang === currentLang);
  });

  document.getElementById('ui-toolbar-title').textContent = t.toolbarTitle;
  document.getElementById('ui-toolbar-sub').textContent = t.toolbarSub;
  document.getElementById('btn-print').textContent = t.btnPrint;
  document.getElementById('ui-eyebrow').textContent = t.eyebrow;
  document.getElementById('ui-title').textContent = t.title;
  document.getElementById('ui-lbl-client').textContent = t.lblClient;
  document.getElementById('ui-lbl-url').textContent = t.lblUrl;
  document.getElementById('ui-lbl-date').textContent = t.lblDate;
  document.getElementById('ui-lbl-vp').textContent = t.lblVp;
  document.getElementById('ui-kpi-fail').textContent = t.kpiFail;
  document.getElementById('ui-kpi-warn').textContent = t.kpiWarn;
  document.getElementById('ui-kpi-score').textContent = t.kpiScore;
  document.getElementById('ui-kpi-nodes').textContent = t.kpiNodes;
  document.getElementById('ui-scope-note').innerHTML = t.scope;
  document.getElementById('ui-sec-fails').textContent = t.secFails;
  document.getElementById('ui-sec-warns').textContent = t.secWarns;
  document.getElementById('ui-sec-manual').textContent = t.secManual;
  document.getElementById('ui-th-w-crit').textContent = t.thWCrit;
  document.getElementById('ui-th-w-el').textContent = t.thWEl;
  document.getElementById('ui-th-w-obs').textContent = t.thWObs;
  document.getElementById('ui-th-w-fix').textContent = t.thWFix;
  document.getElementById('ui-th-m-crit').textContent = t.thMCrit;
  document.getElementById('ui-th-m-desc').textContent = t.thMDesc;
  document.getElementById('ui-th-m-sign').textContent = t.thMSign;

  if (brandData.logoDataUrl) {
    const logoEl = document.getElementById('rep-logo');
    logoEl.src = brandData.logoDataUrl;
    logoEl.hidden = false;
  }
  const agencyParts = [brandData.agencyName, brandData.auditorContact].filter(Boolean);
  document.getElementById('rep-agency').textContent = agencyParts.length > 0
    ? `${t.preparedBy} ${agencyParts.join(' · ')}`
    : t.defaultAgency;

  document.getElementById('rep-client').textContent = brandData.clientName || auditData.pageTitle || 'Web Property';
  const rawUrl = String(auditData.url || ''); const urlEl = document.getElementById('rep-url'); urlEl.textContent = rawUrl.length > 96 ? rawUrl.slice(0, 93) + '…' : rawUrl; urlEl.title = rawUrl;
  document.getElementById('rep-date').textContent = new Date(auditData.scannedAt).toLocaleString(currentLang);
  document.getElementById('rep-vp').textContent = auditData.viewport;

  document.getElementById('sum-fail').textContent = String(auditData.counts.fail);
  document.getElementById('sum-warn').textContent = String(auditData.counts.warning);
  document.getElementById('sum-score').textContent = `${auditData.readinessScore ?? 100}%`;
  document.getElementById('sum-nodes').textContent = String(auditData.counts.checkedNodes);

  renderPillarDashboard(auditData, t);

  const verdict = document.getElementById('rep-verdict');
  if (auditData.counts.fail > 0) {
    verdict.textContent = t.verdictFail(auditData.counts.fail);
    verdict.className = 'verdict-pill verdict-fail';
  } else {
    verdict.textContent = t.verdictPass;
    verdict.className = 'verdict-pill verdict-pass';
  }

  // 1. Render Critical AA Fails — Card #1 is ALWAYS unblurred (Show-First visual proof!), Cards #2+ get .is-locked-finding when unpaid
  const failsContainer = document.getElementById('fails-container');
  failsContainer.replaceChildren();
  const fails = auditData.issues.filter(i => i.severity === 'fail');

  if (fails.length === 0) {
    const banner = document.createElement('div');
    banner.className = 'pass-banner';
    banner.textContent = t.zeroFails;
    failsContainer.appendChild(banner);
  } else {
    const failGroups = groupByComponent(fails);
    failGroups.forEach((items, i) => {
      const iss = items.find(x => x.cropDataUrl) || items[0];
      const card = document.createElement('div');
      // Card index 0 stays completely unblurred in Free mode so client sees full visual value!
      card.className = i === 0 ? 'finding is-sample-unlocked' : 'finding is-locked-finding';

      const top = document.createElement('div');
      top.className = 'finding-top';
      const strong = document.createElement('strong');
      const multSuffix = items.length > 1 ? ` (×${items.length})` : '';
      strong.textContent = `${i + 1}. ${t.issueTitle(iss)}${multSuffix}`;
      const tag = document.createElement('span');
      tag.className = 'tag tag-fail';
      tag.textContent = `SC ${iss.criterion} · ${t.tagFail}`;
      top.append(strong, tag);

      const impact = document.createElement('div');
      impact.className = 'impact-callout';
      impact.textContent = t.humanImpact(iss);

      const body = document.createElement('div');
      body.className = iss.cropDataUrl ? 'finding-body' : 'finding-body no-crop';

      const details = document.createElement('div');
      const obs = document.createElement('div');
      obs.textContent = items.length > 1
        ? `${formatRepeatedLabels(items)} — ${t.issueObs(iss)}`
        : t.issueObs(iss);
      const sel = document.createElement('div');
      sel.className = 'mono notranslate';
      sel.setAttribute('translate', 'no');
      const sampleSels = items.slice(0, 3).map(x => x.selector).join(', ');
      sel.textContent = `${t.lblSelector} ${sampleSels}${items.length > 3 ? ` (+${items.length - 3})` : ''}`;
      const fix = document.createElement('div');
      fix.className = 'fix-box notranslate';
      fix.setAttribute('translate', 'no');
      fix.textContent = `${t.lblFix} ${iss.fixCode}`;
      details.append(obs, sel, fix);
      body.appendChild(details);

      if (iss.cropDataUrl) {
        const fig = document.createElement('figure');
        fig.className = 'crop-figure';
        const img = document.createElement('img');
        img.className = 'crop-img';
        img.src = iss.cropDataUrl;
        img.alt = iss.selector;
        const cap = document.createElement('figcaption');
        cap.className = 'crop-caption no-print';
        cap.textContent = t.cropHint;
        fig.append(img, cap);
        fig.addEventListener('click', () => {
          if (i === 0 || reportProUnlocked) {
            openLightbox(iss.cropDataUrl, `${i + 1}. ${t.issueTitle(iss)}`);
          } else {
            triggerPaywallModal();
          }
        });
        body.appendChild(fig);
      }

      card.append(top, impact, body);
      failsContainer.appendChild(card);
      if (i === 0 && failGroups.length > 1) {
        const gateEl = document.getElementById("inline-teaser-gate");
        if (gateEl) failsContainer.appendChild(gateEl);
      }
    });
  }

  // 2. Warnings Digest
  const warns = auditData.issues.filter(i => i.severity === 'warning');
  const warnSection = document.getElementById('warnings-section');
  const warnTbody = document.getElementById('warnings-tbody');
  warnTbody.replaceChildren();

  if (warns.length === 0) {
    warnSection.hidden = true;
  } else {
    warnSection.hidden = false;
    const warnGroups = groupByComponent(warns);

    for (const items of warnGroups) {
      const first = items[0];
      const tr = document.createElement('tr');
      const tdCrit = document.createElement('td');
      tdCrit.textContent = first.criterion.startsWith('EN') ? first.criterion : `SC ${first.criterion}`;

      const tdSel = document.createElement('td');
      const lbl = document.createElement('div');
      const code = document.createElement('div');
      code.className = 'compact-code notranslate';
      code.setAttribute('translate', 'no');

      const tdObs = document.createElement('td');

      if (items.length === 1) {
        lbl.textContent = first.elementLabel || 'Control';
        code.textContent = first.selector;
        tdObs.textContent = t.issueObs(first);
      } else {
        lbl.textContent = formatRepeatedLabels(items);
        const pattern = first.componentGroupKey || normalizeSelectorDigits(first.selector);
        code.textContent = `${pattern}  /* e.g. ${first.selector} */`;
        tdObs.textContent = t.issueObs(first);
      }

      tdSel.append(lbl, code);

      const tdFix = document.createElement('td');
      tdFix.className = 'compact-code notranslate';
      tdFix.setAttribute('translate', 'no');
      tdFix.textContent = first.fixCode;

      tr.append(tdCrit, tdSel, tdObs, tdFix);
      warnTbody.appendChild(tr);
    }
  }

  // 3. Manual QA table
  const manualTbody = document.getElementById('manual-tbody');
  manualTbody.replaceChildren();

  const chSummary = auditData.consistentHelpSummary;
  const autoPass326 = chSummary && chSummary.pagesCompared >= 2 && chSummary.status === 'pass';

  const manualItems = [
    ...auditData.issues.filter(i => i.severity === 'manual').map(m => ({
      criterion: m.criterion,
      text: `${t.issueTitle(m)} (${m.selector})`,
      autoPassNote: ''
    })),
    {
      criterion: '3.2.6',
      text: t.m326,
      autoPassNote: autoPass326 ? t.m326AutoPass(chSummary.pagesCompared) : ''
    },
    {
      criterion: '3.3.7',
      text: t.m337,
      autoPassNote: ''
    }
  ];

  manualItems.forEach(m => {
    const tr = document.createElement('tr');
    const tdC = document.createElement('td');
    tdC.textContent = `SC ${m.criterion}`;
    const tdS = document.createElement('td');
    const mainText = document.createElement('div');
    mainText.textContent = m.text;
    tdS.appendChild(mainText);
    if (m.autoPassNote) {
      const note = document.createElement('div');
      note.className = 'auto-pass-note';
      note.textContent = m.autoPassNote;
      tdS.appendChild(note);
    }
    const tdCheck = document.createElement('td');
    tdCheck.className = 'sign-cell';
    const checkedAttr = m.autoPassNote ? ' checked' : '';
    tdCheck.innerHTML = `<label><input type="checkbox"${checkedAttr}> ${t.pass}</label><label><input type="checkbox"> ${t.fail}</label><label><input type="checkbox"> ${t.na}</label>`;
    tr.append(tdC, tdS, tdCheck);
    manualTbody.appendChild(tr);
  });

  updateInlineTeaserVisibility();
}

const PAYWALL_I18N = {
  ru: {
    btnUnlockToolbar: 'Разблокировать Pro ($10/мес)',
    btnAccountToolbar: 'Аккаунт Pro',
    btnOpenBanner: 'Открыть полный отчет ($10/мес)',
    lockTitle: 'Демо-режим: карточка №1 открыта со скриншотом и готовым CSS-кодом!',
    lockSub: 'Убедитесь в наглядности разбора на вашем сайте ниже. Оплатите Pro в 1 клик через Stripe, чтобы открыть остальные карточки, логотип агентства и чистый A4 PDF.',
    noAuditYet: 'Сначала запустите аудит на любой веб-странице через иконку расширения (или активируйте Pro кнопкой выше).',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Прямая активация через Stripe без регистрации и писем подтверждения: все визуальные карточки со скриншотами, логотип вашего агентства и экспорт A4 PDF / Jira CSV.',
    lblPlan: 'Тарифный план (Paywall #926)',
    lblEmail: 'Email для квитанции Stripe и привязки лицензии',
    phEmail: 'you@agency.com',
    btnCheckout: 'Перейти сразу к оплате в Stripe',
    btnRestore: 'Уже покупали на этот Email? Восстановить доступ',
    signedInAs: email => `Активная подписка: ${email}`,
    btnSignOut: 'Сменить Email',
    btnPortal: 'Управление подпиской (Stripe Billing Portal)',
    awaitTitle: 'Окно оплаты Stripe открыто в соседней вкладке',
    awaitHint: 'Для тестовой оплаты введите карту песочницы Stripe: <code>4242 4242 4242 4242</code> (любой будущий срок MM/YY и любой CVC). При возврате на эту вкладку Pro-доступ откроется автоматически.',
    btnCheckNow: 'Я оплатил — проверить сейчас',
    btnReopenUrl: 'Открыть оплату снова',
    loadingPlans: 'Загрузка тарифа с appbox.space...',
    noPlans: 'У Paywall #926 пока нет активных тарифов во вкладке «Цены».',
    unlockedSuccess: 'Оплата подтверждена! Все скриншоты и White-Label PDF экспорт разблокированы.',
    notPaidYet: 'Активная оплата для этого Email пока не найдена — завершите платеж во вкладке Stripe и нажмите кнопку еще раз.',
    trialDays: n => `Пробный период: ${n} дн.`
  },
  en: {
    btnUnlockToolbar: 'Unlock Pro ($10/mo)',
    btnAccountToolbar: 'Pro Account',
    btnOpenBanner: 'Unlock Full Report ($10/mo)',
    lockTitle: 'Live Preview: Finding #1 is unlocked in full HD below!',
    lockSub: 'Inspect the Spotlight screenshot and remediation code on your site below, then unlock all remaining cards, White-Label A4 PDF printing, and Jira CSV in 1 click.',
    noAuditYet: 'Run an audit on any webpage from the extension popup first (or unlock Pro above).',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Instant 1-click Stripe Checkout with zero confirmation emails: unlock all Spotlight visual cards, custom agency branding, and clean A4 PDF / Jira CSV exports.',
    lblPlan: 'Select Plan (Paywall #926)',
    lblEmail: 'Work Email (for Stripe receipt & license lookup)',
    phEmail: 'you@agency.com',
    btnCheckout: 'Continue Directly to Stripe Checkout',
    btnRestore: 'Already subscribed with this email? Restore Pro',
    signedInAs: email => `Active Pro license: ${email}`,
    btnSignOut: 'Switch Email',
    btnPortal: 'Manage Subscription (Stripe Billing Portal)',
    awaitTitle: 'Stripe Checkout opened in a new tab',
    awaitHint: 'In Test mode, enter Stripe sandbox card <code>4242 4242 4242 4242</code> (any future expiry & CVC). Pro unlocks automatically as soon as you return to this tab.',
    btnCheckNow: 'I completed payment — Check now',
    btnReopenUrl: 'Reopen Checkout Tab',
    loadingPlans: 'Loading plan from appbox.space...',
    noPlans: 'Paywall #926 has 0 attached prices in the Offers tab.',
    unlockedSuccess: 'Payment verified! Full visual report & PDF exports unlocked.',
    notPaidYet: 'No active subscription found for this email yet — complete Stripe Checkout and check again.',
    trialDays: n => `${n}-day free trial included`
  },
  de: {
    btnUnlockToolbar: 'Pro freischalten ($10/Monat)',
    btnAccountToolbar: 'Pro-Konto',
    btnOpenBanner: 'Vollbericht freischalten',
    lockTitle: 'Vorschau-Modus: Prüfpunkt #1 ist unten vollständig sichtbar!',
    lockSub: 'Prüfen Sie den markierten Screenshot Ihrer Seite unten und schalten Sie alle weiteren Karten sowie den sauberen A4-PDF-Export via Stripe frei.',
    noAuditYet: 'Starten Sie zuerst eine Prüfung über das Erweiterungs-Popup.',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Direkte Zahlung via Stripe ohne OTP-Codes: Alle visuellen Fehlerkarten, Agentur-Branding sowie A4-PDF- und Jira-CSV-Export.',
    lblPlan: 'Tarif (Paywall #926)',
    lblEmail: 'E-Mail-Adresse (für Stripe-Beleg & Lizenz)',
    phEmail: 'name@agentur.de',
    btnCheckout: 'Direkt weiter zu Stripe Checkout',
    btnRestore: 'Bereits gekauft? Zugang per E-Mail wiederherstellen',
    signedInAs: email => `Aktive Pro-Lizenz: ${email}`,
    btnSignOut: 'E-Mail wechseln',
    btnPortal: 'Abonnement verwalten (Stripe Portal)',
    awaitTitle: 'Stripe Checkout in neuem Tab geöffnet',
    awaitHint: 'Im Testmodus Karte <code>4242 4242 4242 4242</code> verwenden. Nach der Zahlung wird Pro automatisch freigeschaltet.',
    btnCheckNow: 'Zahlung abgeschlossen — Jetzt prüfen',
    btnReopenUrl: 'Zahlungslink erneut öffnen',
    loadingPlans: 'Tarif wird geladen...',
    noPlans: 'Paywall #926 enthält aktuell 0 Tarife.',
    unlockedSuccess: 'Zahlung bestätigt! Pro-Export freigeschaltet.',
    notPaidYet: 'Noch keine aktive Zahlung für diese E-Mail gefunden.',
    trialDays: n => `${n} Tage kostenlos testen`
  }
};

let reportProUnlocked = false;
let reportDevOverride = false;
let currentBillingEmail = '';
let loadedPrices = [];
let selectedPriceId = null;
let lastCheckoutUrl = null;
let pollTimer = null;

function stopCheckoutPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function showModalAlert(level, text) {
  const el = document.getElementById('pw-alert');
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = '';
    el.className = 'pw-alert';
    return;
  }
  el.hidden = false;
  el.className = `pw-alert is-${level}`;
  el.textContent = text;
}

function formatPlanDisplay(p) {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const title = p.label || p.name || p.title || 'Express Client Auditor Pro';
  const currency = String(p.local?.currency || p.currency || 'USD').toUpperCase();
  const rawAmount = p.local?.amount ?? p.amount ?? p.price ?? null;
  let amountStr = '';
  if (typeof p.formatted === 'string' && p.formatted) {
    amountStr = p.formatted;
  } else if (rawAmount !== null && rawAmount !== undefined && !Number.isNaN(Number(rawAmount))) {
    try {
      amountStr = new Intl.NumberFormat(currentLang, { style: 'currency', currency }).format(Number(rawAmount));
    } catch (_) {
      amountStr = `${rawAmount} ${currency}`;
    }
  }
  const interval = p.interval
    ? (p.interval_count && p.interval_count > 1 ? ` / ${p.interval_count} ${p.interval}` : ` / ${p.interval}`)
    : '';
  const trial = p.trial_days || p.trialDays || 0;
  return {
    title,
    priceText: `${amountStr}${interval}`.trim(),
    trialText: trial > 0 ? pt.trialDays(trial) : ''
  };
}

function renderPlanCards() {
  const listEl = document.getElementById('pw-plans-list');
  if (!listEl) return;
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  listEl.replaceChildren();

  if (!loadedPrices.length) {
    const empty = document.createElement('div');
    empty.className = 'pw-subtitle';
    empty.textContent = pt.noPlans;
    listEl.appendChild(empty);
    return;
  }

  if (!selectedPriceId || !loadedPrices.some(p => p.id === selectedPriceId)) {
    selectedPriceId = loadedPrices[0].id;
  }

  loadedPrices.forEach(p => {
    const info = formatPlanDisplay(p);
    const card = document.createElement('div');
    card.className = `pw-plan-card${p.id === selectedPriceId ? ' is-selected' : ''}`;

    const left = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'pw-plan-name';
    nameEl.textContent = info.title;
    left.appendChild(nameEl);

    if (info.trialText) {
      const trEl = document.createElement('div');
      trEl.className = 'pw-plan-trial';
      trEl.textContent = info.trialText;
      left.appendChild(trEl);
    }

    const priceEl = document.createElement('div');
    priceEl.className = 'pw-plan-price';
    priceEl.textContent = info.priceText;

    card.append(left, priceEl);
    card.addEventListener('click', () => {
      selectedPriceId = p.id;
      renderPlanCards();
    });
    listEl.appendChild(card);
  });
}

function syncModalView() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const coBox = document.getElementById('pw-checkout-box');
  const sessBox = document.getElementById('pw-session-box');
  const emailSpan = document.getElementById('pw-user-email');
  const emailInput = document.getElementById('pw-email');

  if (currentBillingEmail && emailInput && !emailInput.value) {
    emailInput.value = currentBillingEmail;
  }

  if (reportProUnlocked && !reportDevOverride && currentBillingEmail) {
    coBox.hidden = true;
    sessBox.hidden = false;
    emailSpan.textContent = pt.signedInAs(currentBillingEmail);
  } else {
    coBox.hidden = false;
    sessBox.hidden = true;
  }
}

function renderChromeStrings() {
  const t = I18N[currentLang] || I18N.en;
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  document.documentElement.lang = currentLang;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.lang === currentLang);
  });

  document.getElementById('ui-toolbar-title').textContent = t.toolbarTitle;
  document.getElementById('ui-toolbar-sub').textContent = t.toolbarSub;
  document.getElementById('btn-print').textContent = t.btnPrint;
  document.getElementById('btn-unlock-pro').textContent = pt.btnUnlockToolbar;
  document.getElementById('btn-account-pro').textContent = pt.btnAccountToolbar;
  document.getElementById('btn-banner-paywall').textContent = pt.btnOpenBanner;
  document.getElementById('ui-lock-title').textContent = pt.lockTitle;
  document.getElementById('ui-lock-sub').textContent = pt.lockSub;

  document.getElementById('pw-title').textContent = pt.modalTitle;
  document.getElementById('pw-subtitle').textContent = pt.modalSub;
  document.getElementById('pw-lbl-plan').textContent = pt.lblPlan;
  document.getElementById('pw-lbl-email').textContent = pt.lblEmail;
  document.getElementById('pw-email').placeholder = pt.phEmail;
  document.getElementById('pw-btn-checkout').textContent = pt.btnCheckout;
  document.getElementById('pw-btn-restore').textContent = pt.btnRestore;
  document.getElementById('pw-btn-signout').textContent = pt.btnSignOut;
  document.getElementById('pw-btn-portal').textContent = pt.btnPortal;
  document.getElementById('pw-await-title').textContent = pt.awaitTitle;
  document.getElementById('pw-await-hint').innerHTML = pt.awaitHint;
  document.getElementById('pw-btn-check-now').textContent = pt.btnCheckNow;
  document.getElementById('pw-btn-reopen-url').textContent = pt.btnReopenUrl;

  if (!auditData) {
    document.getElementById('fails-container').textContent = pt.noAuditYet;
  }
  if (loadedPrices.length) {
    renderPlanCards();
  }
  syncModalView();
  updateInlineTeaserVisibility();
}

async function openPaywallDialog() {
  const modal = document.getElementById('paywall-modal');
  if (!modal) return;
  modal.hidden = false;
  showModalAlert(null, '');

  const state = await window.MonetizeBridge?.getStoredBillingState?.();
  if (state?.email) {
    currentBillingEmail = state.email;
  }
  syncModalView();

  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const listEl = document.getElementById('pw-plans-list');
  if (!loadedPrices.length && listEl) {
    listEl.textContent = pt.loadingPlans;
  }

  try {
    loadedPrices = await window.MonetizeBridge.loadPrices();
    renderPlanCards();
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  }
}

function closePaywallDialog() {
  stopCheckoutPolling();
  const modal = document.getElementById('paywall-modal');
  if (modal) modal.hidden = true;
}

function openExternalTab(url) {
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
    chrome.tabs.create({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

async function pollOnceForUnlock() {
  if (!pollTimer) return;
  try {
    const emailVal = document.getElementById('pw-email')?.value || currentBillingEmail;
    const res = await window.MonetizeBridge.checkAccess({ email: emailVal, skipCacheFallback: true });
    if (res && res.granted) {
      stopCheckoutPolling();
      currentBillingEmail = res.email || emailVal;
      const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
      applyLockUI(true, res.devOverride);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 900);
    }
  } catch (_) {}
}

function startCheckoutPolling() {
  stopCheckoutPolling();
  pollTimer = setInterval(pollOnceForUnlock, 2500);
}

window.addEventListener('focus', () => { if (pollTimer) pollOnceForUnlock(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && pollTimer) pollOnceForUnlock();
});

async function handleDirectCheckout() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const emailVal = document.getElementById('pw-email').value;
  const btn = document.getElementById('pw-btn-checkout');
  btn.disabled = true;
  showModalAlert(null, '');

  try {
    if (!selectedPriceId && loadedPrices.length) {
      selectedPriceId = loadedPrices[0].id;
    }
    const res = await window.MonetizeBridge.startStripeCheckout(emailVal, selectedPriceId);
    currentBillingEmail = res.email || emailVal.trim().toLowerCase();

    if (res.alreadyPurchased) {
      applyLockUI(true, false);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 800);
      return;
    }

    lastCheckoutUrl = res.checkoutUrl;
    document.getElementById('pw-awaiting-box').hidden = false;
    openExternalTab(res.checkoutUrl);
    startCheckoutPolling();
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  } finally {
    btn.disabled = false;
  }
}

async function handleRestorePurchase() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const emailVal = document.getElementById('pw-email').value;
  const btn = document.getElementById('pw-btn-restore');
  btn.disabled = true;
  showModalAlert(null, '');

  try {
    const res = await window.MonetizeBridge.restorePurchaseByEmail(emailVal);
    if (res && res.granted) {
      currentBillingEmail = res.email || emailVal.trim().toLowerCase();
      applyLockUI(true, res.devOverride);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 800);
    } else {
      showModalAlert('info', pt.notPaidYet);
    }
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  } finally {
    btn.disabled = false;
  }
}

async function initReport() {
  const uiLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  currentLang = ['ru', 'en', 'de'].includes(uiLang) ? uiLang : 'en';

  const store = await chrome.storage.local.get(['latestAuditReport', 'agencyBrand', 'reportLang']);
  if (store.reportLang && I18N[store.reportLang]) {
    currentLang = store.reportLang;
  }
  auditData = store.latestAuditReport;
  brandData = store.agencyBrand || {};

  renderChromeStrings();
  if (auditData) {
    renderReport();
  }
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ reportLang: currentLang });
    }
    renderChromeStrings();
    if (auditData) {
      renderReport();
    }
  });
});

function applyLockUI(unlocked, devOverride = reportDevOverride) {
  reportProUnlocked = Boolean(unlocked);
  reportDevOverride = Boolean(devOverride);
  document.body.classList.toggle('is-paywall-locked', !reportProUnlocked);

  const btnUnlock = document.getElementById('btn-unlock-pro');
  const btnAccount = document.getElementById('btn-account-pro');
  const banner = document.getElementById('locked-banner');
  const btnPrint = document.getElementById('btn-print');
  const btnMd = document.getElementById('btn-dl-md');
  const btnCsv = document.getElementById('btn-dl-csv');

  if (btnUnlock) btnUnlock.hidden = reportProUnlocked;
  if (btnAccount) btnAccount.hidden = !reportProUnlocked;
  if (banner) banner.hidden = reportProUnlocked;

  // Keep Print / MD / CSV buttons visible even in Free mode (clicking them triggers the Stripe modal!)
  // so Free users clearly see the export capabilities they are unlocking!
  if (btnPrint) btnPrint.style.opacity = reportProUnlocked ? '1' : '0.88';
  if (btnMd) btnMd.style.opacity = reportProUnlocked ? '1' : '0.88';
  if (btnCsv) btnCsv.style.opacity = reportProUnlocked ? '1' : '0.88';

  const manifest = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) ? chrome.runtime.getManifest() : {};
  const devBtn = document.getElementById('btn-dev-report-toggle');
  if (!manifest.update_url && devBtn) {
    devBtn.hidden = false;
    devBtn.textContent = reportDevOverride ? 'Dev Override: ON (Lock)' : 'Dev: Test Unlock';
  }
  syncModalView();
  updateInlineTeaserVisibility();
}

function triggerPaywallModal() {
  openPaywallDialog();
}

document.getElementById('btn-print').addEventListener('click', () => {
  if (!reportProUnlocked) return triggerPaywallModal();
  window.print();
});

document.getElementById('btn-dl-md').addEventListener('click', () => {
  if (!reportProUnlocked) return triggerPaywallModal();
  if (!auditData) return;
  downloadBlob(`wcag22-audit-${currentLang}.md`, toMarkdown(auditData, brandData), 'text/markdown;charset=utf-8');
});

document.getElementById('btn-dl-csv').addEventListener('click', () => {
  if (!reportProUnlocked) return triggerPaywallModal();
  if (!auditData) return;
  downloadBlob(`wcag22-tickets-${currentLang}.csv`, toCsv(auditData), 'text/csv;charset=utf-8');
});

document.getElementById('btn-unlock-pro')?.addEventListener('click', triggerPaywallModal);
document.getElementById('btn-account-pro')?.addEventListener('click', triggerPaywallModal);
document.getElementById('btn-banner-paywall')?.addEventListener('click', triggerPaywallModal);
document.getElementById('btn-inline-unlock')?.addEventListener('click', triggerPaywallModal);

document.getElementById('pw-close')?.addEventListener('click', closePaywallDialog);
document.getElementById('paywall-modal')?.addEventListener('click', e => {
  if (e.target.id === 'paywall-modal') closePaywallDialog();
});
document.getElementById('pw-btn-checkout')?.addEventListener('click', handleDirectCheckout);
document.getElementById('pw-email')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleDirectCheckout();
});
document.getElementById('pw-btn-restore')?.addEventListener('click', handleRestorePurchase);

document.getElementById('pw-btn-signout')?.addEventListener('click', async () => {
  await window.MonetizeBridge.signOut();
  currentBillingEmail = '';
  document.getElementById('pw-email').value = '';
  applyLockUI(false, false);
});
document.getElementById('pw-btn-portal')?.addEventListener('click', async () => {
  try {
    const url = await window.MonetizeBridge.openCustomerPortal();
    openExternalTab(url);
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  }
});
document.getElementById('pw-btn-check-now')?.addEventListener('click', async () => {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const emailVal = document.getElementById('pw-email').value || currentBillingEmail;
  try {
    const res = await window.MonetizeBridge.checkAccess({ email: emailVal, skipCacheFallback: true, throwOnError: true });
    if (res && res.granted) {
      stopCheckoutPolling();
      currentBillingEmail = res.email || emailVal;
      applyLockUI(true, res.devOverride);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 800);
    } else {
      showModalAlert('info', pt.notPaidYet);
    }
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  }
});
document.getElementById('pw-btn-reopen-url')?.addEventListener('click', () => {
  if (lastCheckoutUrl) openExternalTab(lastCheckoutUrl);
});

document.getElementById('btn-dev-report-toggle')?.addEventListener('click', async () => {
  const nextDev = !reportDevOverride;
  await chrome.runtime.sendMessage({ type: 'SET_DEV_PRO_OVERRIDE', paid: nextDev });
  const access = await window.MonetizeBridge.checkAccess();
  applyLockUI(access.granted, access.devOverride);
});

async function initPaywallGate() {
  if (!window.MonetizeBridge) {
    applyLockUI(false, false);
    return;
  }

  window.MonetizeBridge.onOpenModal(() => openPaywallDialog());
  window.MonetizeBridge.onAccessChange((granted, detail) => {
    if (detail?.email) currentBillingEmail = detail.email;
    applyLockUI(granted, detail?.devOverride ?? reportDevOverride);
  });

  applyLockUI(false, false);

  const params = new URLSearchParams(window.location.search);
  const explicitPaywallOpen = params.get('paywall') === '1';

  const access = await window.MonetizeBridge.checkAccess();
  if (access.email) currentBillingEmail = access.email;
  applyLockUI(access.granted, access.devOverride);

  // ONLY auto-open the modal when user explicitly clicked "Upgrade / Account" (?paywall=1),
  // OR if there is no audit report loaded yet. When opening a report in Free mode (?mode=pdf),
  // let the user admire Finding #1's full HD visual proof first before clicking Unlock!
  if (explicitPaywallOpen || (!access.granted && !auditData)) {
    openPaywallDialog();
  }
}

initReport().then(() => initPaywallGate());
