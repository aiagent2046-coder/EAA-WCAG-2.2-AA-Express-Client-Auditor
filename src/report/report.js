let auditData = null;
let brandData = {};
let currentLang = 'ru';

const I18N = {
  ru: {
    toolbarTitle: 'Клиентский White-Label отчет',
    toolbarSub: 'Чистый A4 PDF без браузерных колонтитулов и технических URL',
    btnPrint: 'Сохранить PDF для клиента',
    eyebrow: 'Европейский акт о доступности (EN 301 549 V4.1.1) · WCAG 2.2 Уровень AA',
    title: 'Отчет об аудите доступности (WCAG 2.2 Delta)',
    defaultAgency: 'Подготовлено командой аудита доступности (QA)',
    preparedBy: 'Исполнитель:',
    lblClient: 'Клиент / Проект',
    lblUrl: 'Проверенный URL',
    lblDate: 'Дата и время',
    lblVp: 'Окно просмотра',
    kpiFail: 'Нарушения уровня AA',
    kpiWarn: 'Предупреждения (отступы)',
    kpiManual: 'Ручная проверка QA',
    kpiNodes: 'Проверено узлов DOM',
    verdictFail: n => `Требуются правки (ошибок AA: ${n})`,
    verdictPass: 'Автопроверки WCAG 2.2 AA пройдены',
    scope: '<strong>Методология и охват:</strong> детерминированная проверка геометрии и поведения DOM по новым критериям W3C WCAG 2.2 уровня AA в рамках стандарта EN 301 549 V4.1.1 (SC 2.5.8 минимальный размер таргета 24×24 CSS px, SC 2.4.11 отсутствие перекрытия фокуса липкими слоями, SC 3.3.8 доступная аутентификация без запрета вставки, SC 2.5.7 альтернативы перетаскиванию). Перед финальной юридической приемкой EAA дополните автоматический срез прогоном со скринридером.',
    secFails: '1. Критические нарушения уровня AA (обязательно к исправлению)',
    zeroFails: 'Критических нарушений уровня WCAG 2.2 AA на текущем экране не обнаружено.',
    secWarns: '2. Сводная таблица элементов на грани допуска (проходят за счет отступов)',
    thWCrit: 'Критерий',
    thWEl: 'Элемент и селектор',
    thWObs: 'Фактический замер',
    thWFix: 'Рекомендуемый CSS-запас',
    secManual: '3. Экспресс-проверка аудитором за 10 секунд (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Критерий',
    thMDesc: 'Контрольный вопрос',
    thMSign: 'Отметка аудитора',
    pass: 'Пройдено',
    fail: 'Ошибка',
    na: 'Н/П',
    tagFail: 'НАРУШЕНИЕ AA',
    lblSelector: 'Селектор:',
    lblFix: 'Готовый CSS-фикс:',
    m326: 'Глобальный макет — ссылка или виджет помощи/контактов расположены в едином порядке на всех страницах.',
    m337: 'Многошаговые формы — ранее введенные пользователем данные подставляются автоматически без повторного ввода.',
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
        case 'AUTH_PASTE_BLOCKED':
          return 'Поле пароля/кода блокирует вставку из буфера обмена (ломает менеджеры паролей)';
        case 'AUTH_AUTOCOMPLETE_OFF':
          return 'Отключено автозаполнение менеджером паролей (autocomplete="off")';
        case 'DRAG_MANUAL_CHECK':
          return `Проверить наличие кнопочной альтернативы (клик/тап) для drag-элемента (${p.tag || 'widget'})`;
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
        case 'AUTH_PASTE_BLOCKED':
          return 'Событие вставки (paste) заблокировано через preventDefault() или атрибут onpaste';
        case 'AUTH_AUTOCOMPLETE_OFF':
          return 'Атрибут autocomplete="off" запрещает менеджеру паролей подставлять учетные данные';
        default:
          return iss.actual;
      }
    }
  },
  en: {
    toolbarTitle: 'White-Label Client Report',
    toolbarSub: 'Clean A4 PDF without browser headers or extension URLs',
    btnPrint: 'Save Client PDF',
    eyebrow: 'European Accessibility Act (EN 301 549 V4.1.1) · WCAG 2.2 Level AA',
    title: 'Accessibility Delta Audit Report',
    defaultAgency: 'Prepared by Accessibility QA Team',
    preparedBy: 'Prepared by',
    lblClient: 'Client / Project',
    lblUrl: 'Audited URL',
    lblDate: 'Audit Timestamp',
    lblVp: 'Viewport',
    kpiFail: 'Level AA Violations',
    kpiWarn: 'Spacing & Advisory Warnings',
    kpiManual: 'Guided Manual QA Items',
    kpiNodes: 'Evaluated DOM Controls',
    verdictFail: n => `Action Required (${n} AA Fails)`,
    verdictPass: 'Passed Automated WCAG 2.2 Delta',
    scope: '<strong>Scope & Methodology:</strong> Deterministic browser geometry and focus-layer inspection against W3C WCAG 2.2 Level AA delta criteria under EN 301 549 V4.1.1 (SC 2.5.8 Target Size Minimum 24×24 CSS px, SC 2.4.11 Focus Not Obscured Minimum, SC 3.3.8 Accessible Authentication, and SC 2.5.7 Dragging Movements). Pair with assistive screen-reader traversal prior to formal EAA legal sign-off.',
    secFails: '1. Level AA Violations (Remediation Required)',
    zeroFails: 'Zero automated WCAG 2.2 Level AA violations detected on this viewport.',
    secWarns: '2. Compact Advisory & Spacing Digest (Passes AA via Spacing Exception)',
    thWCrit: 'Criterion',
    thWEl: 'Control & Selector',
    thWObs: 'Measured Geometry',
    thWFix: 'Recommended Hardening CSS',
    secManual: '3. Guided 10-Second Manual QA Sign-Off (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Criterion',
    thMDesc: 'Verification Check',
    thMSign: 'Auditor Sign-Off',
    pass: 'Pass',
    fail: 'Fail',
    na: 'N/A',
    tagFail: 'AA FAIL',
    lblSelector: 'Selector:',
    lblFix: 'Developer Fix:',
    m326: 'Global layout — verify help/contact link or widget appears in consistent relative order across pages.',
    m337: 'Multi-step forms — verify previously entered user data is auto-populated or selectable without re-typing.',
    issueTitle: iss => iss.title,
    issueObs: iss => `${iss.elementLabel ? `"${iss.elementLabel}" — ` : ''}${iss.actual}`
  },
  de: {
    toolbarTitle: 'White-Label-Prüfbericht (BFSG / EAA)',
    toolbarSub: 'Sauberer A4-PDF-Export ohne Browser-Fußzeilen',
    btnPrint: 'Kunden-PDF speichern',
    eyebrow: 'Barrierefreiheitsstärkungsgesetz (BFSG · EN 301 549 V4.1.1) · WCAG 2.2 Stufe AA',
    title: 'Prüfbericht zur digitalen Barrierefreiheit (WCAG 2.2)',
    defaultAgency: 'Erstellt vom Accessibility-QA-Team',
    preparedBy: 'Prüfstelle:',
    lblClient: 'Kunde / Projekt',
    lblUrl: 'Geprüfte URL',
    lblDate: 'Prüfzeitpunkt',
    lblVp: 'Viewport',
    kpiFail: 'Stufe-AA-Verstöße',
    kpiWarn: 'Abstands-Hinweise',
    kpiManual: 'Manuelle Kurzprüfung',
    kpiNodes: 'Geprüfte DOM-Elemente',
    verdictFail: n => `Handlungsbedarf (${n} AA-Verstöße)`,
    verdictPass: 'Automatische WCAG-2.2-Prüfung bestanden',
    scope: '<strong>Methodik & Prüfumfang:</strong> Deterministische DOM-Geometrie- und Fokus-Prüfung gemäß W3C WCAG 2.2 Stufe AA im Rahmen der EN 301 549 V4.1.1 / BFSG (SC 2.5.8 Mindestzielgröße 24×24 CSS px, SC 2.4.11 Fokus nicht verdeckt, SC 3.3.8 Zugängliche Authentifizierung, SC 2.5.7 Ziehvorgänge).',
    secFails: '1. Kritische Verstöße der Stufe AA (Korrektur erforderlich)',
    zeroFails: 'Keine automatisierten Verstöße der Stufe WCAG 2.2 AA im aktuellen Viewport festgestellt.',
    secWarns: '2. Kompakte Übersicht der Abstands-Ausnahmen (bestanden über 24px-Abstand)',
    thWCrit: 'Kriterium',
    thWEl: 'Element & Selektor',
    thWObs: 'Messwert',
    thWFix: 'Empfohlenes CSS',
    secManual: '3. Manuelle 10-Sekunden-Prüfung (SC 2.5.7 / 3.2.6 / 3.3.7)',
    thMCrit: 'Kriterium',
    thMDesc: 'Prüfpunkt',
    thMSign: 'Freigabe',
    pass: 'Bestanden',
    fail: 'Fehler',
    na: 'N/Z',
    tagFail: 'AA-VERSTOSS',
    lblSelector: 'Selektor:',
    lblFix: 'CSS-Korrektur:',
    m326: 'Seitenlayout — Hilfe-/Kontaktoptionen erscheinen auf allen Unterseiten an derselben relativen Position.',
    m337: 'Mehrstufige Formulare — bereits eingegebene Daten werden ohne erneutes Eintippen übernommen.',
    issueTitle(iss) {
      const p = iss.params || {};
      switch (iss.code) {
        case 'TARGET_COLLISION':
          return 'Klickfläche kleiner als 24×24 CSS px mit Abstands-Kollision';
        case 'TARGET_SPACING_PASS':
          return 'Klickfläche unter 24×24 px (besteht nur über Abstandsregel)';
        case 'FOCUS_OBSCURED_FULL':
          return 'Fokussiertes Element zu 100 % durch fixierten Header/Banner verdeckt (F110)';
        case 'AUTH_PASTE_BLOCKED':
          return 'Passwortfeld blockiert Einfügen aus der Zwischenablage';
        default:
          return iss.title;
      }
    },
    issueObs(iss) {
      const p = iss.params || {};
      if (iss.code === 'TARGET_COLLISION') return `„${iss.elementLabel}“: ${p.w} × ${p.h} px — kollidiert mit ${p.neighbor}`;
      if (iss.code === 'TARGET_SPACING_PASS') return `${p.w} × ${p.h} px (24px-Kreis frei)`;
      if (iss.code === 'FOCUS_OBSCURED_FULL') return `100 % verdeckt durch ${p.blocker} (${p.blockerH}px)`;
      if (iss.code === 'AUTH_PASTE_BLOCKED') return 'Einfügen (paste) im Passwortfeld per Skript blockiert';
      if (iss.code === 'AUTH_AUTOCOMPLETE_OFF') return 'Attribut autocomplete="off" verhindert Passwort-Manager-Autofill';
      return iss.actual;
    }
  }
};

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
  document.getElementById('ui-kpi-manual').textContent = t.kpiManual;
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
  document.getElementById('rep-url').textContent = auditData.url;
  document.getElementById('rep-date').textContent = new Date(auditData.scannedAt).toLocaleString(currentLang);
  document.getElementById('rep-vp').textContent = auditData.viewport;

  document.getElementById('sum-fail').textContent = String(auditData.counts.fail);
  document.getElementById('sum-warn').textContent = String(auditData.counts.warning);
  document.getElementById('sum-manual').textContent = String(auditData.counts.manual);
  document.getElementById('sum-nodes').textContent = String(auditData.counts.checkedNodes);

  const verdict = document.getElementById('rep-verdict');
  if (auditData.counts.fail > 0) {
    verdict.textContent = t.verdictFail(auditData.counts.fail);
    verdict.className = 'verdict-pill verdict-fail';
  } else {
    verdict.textContent = t.verdictPass;
    verdict.className = 'verdict-pill verdict-pass';
  }

  // 1. Render ONLY critical AA Fails as full evidence cards
  const failsContainer = document.getElementById('fails-container');
  failsContainer.replaceChildren();
  const fails = auditData.issues.filter(i => i.severity === 'fail');

  if (fails.length === 0) {
    const banner = document.createElement('div');
    banner.className = 'pass-banner';
    banner.textContent = t.zeroFails;
    failsContainer.appendChild(banner);
  } else {
    fails.forEach((iss, i) => {
      const card = document.createElement('div');
      card.className = 'finding';

      const top = document.createElement('div');
      top.className = 'finding-top';
      const strong = document.createElement('strong');
      strong.textContent = `${i + 1}. ${t.issueTitle(iss)}`;
      const tag = document.createElement('span');
      tag.className = 'tag tag-fail';
      tag.textContent = `SC ${iss.criterion} · ${t.tagFail}`;
      top.append(strong, tag);

      const body = document.createElement('div');
      body.className = 'finding-body';

      const details = document.createElement('div');
      const obs = document.createElement('div');
      obs.textContent = t.issueObs(iss);
      const sel = document.createElement('div');
      sel.className = 'mono notranslate';
      sel.setAttribute('translate', 'no');
      sel.textContent = `${t.lblSelector} ${iss.selector}`;
      const fix = document.createElement('div');
      fix.className = 'fix-box notranslate';
      fix.setAttribute('translate', 'no');
      fix.textContent = `${t.lblFix} ${iss.fixCode}`;
      details.append(obs, sel, fix);
      body.appendChild(details);

      if (iss.cropDataUrl) {
        const img = document.createElement('img');
        img.className = 'crop-img';
        img.src = iss.cropDataUrl;
        img.alt = iss.selector;
        body.appendChild(img);
      }

      card.append(top, body);
      failsContainer.appendChild(card);
    });
  }

  // 2. Render Warnings in a compact component-grouped table (keeps mega-footer sites like stripe.com at 2-3 pages instead of 21 pages!)
  const warns = auditData.issues.filter(i => i.severity === 'warning');
  const warnSection = document.getElementById('warnings-section');
  const warnTbody = document.getElementById('warnings-tbody');
  warnTbody.replaceChildren();

  function getComponentSignature(w) {
    const raw = String(w.selector || '').trim();
    const parts = raw.split('>').map(s => s.trim()).filter(Boolean);
    const leaf = (parts[parts.length - 1] || raw).replace(/:nth-of-type\(\d+\)/g, '');
    const parent = (parts[parts.length - 2] || '').replace(/:nth-of-type\(\d+\)/g, '');
    // If leaf has an explicit semantic class (e.g. a.hds-link.footer-links-block__item), group across repeated columns!
    const hasLeafClass = leaf.includes('.');
    const sigSelector = hasLeafClass ? leaf : `${parent} > ${leaf}`;
    return `${w.criterion}|${w.code || ''}|${sigSelector}|${w.fixCode || ''}`;
  }

  if (warns.length === 0) {
    warnSection.hidden = true;
  } else {
    warnSection.hidden = false;
    const groupsMap = new Map();
    warns.forEach(w => {
      const key = getComponentSignature(w);
      if (!groupsMap.has(key)) {
        groupsMap.set(key, []);
      }
      groupsMap.get(key).push(w);
    });

    for (const items of groupsMap.values()) {
      const first = items[0];
      const tr = document.createElement('tr');
      const tdCrit = document.createElement('td');
      tdCrit.textContent = `SC ${first.criterion}`;

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
        lbl.textContent = `${countBadge}${sampleLabels}${moreSuffix}`;

        const parts = String(first.selector || '').split('>').map(s => s.trim());
        const cleanLeaf = (parts[parts.length - 1] || first.selector).replace(/:nth-of-type\(\d+\)/g, '');
        code.textContent = `${cleanLeaf}  /* e.g. ${first.selector} */`;
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

  // 3. Guided Manual QA table
  const manualTbody = document.getElementById('manual-tbody');
  manualTbody.replaceChildren();
  const manualItems = [
    ...auditData.issues.filter(i => i.severity === 'manual').map(m => ({
      criterion: m.criterion,
      text: `${t.issueTitle(m)} (${m.selector})`
    })),
    { criterion: '3.2.6', text: t.m326 },
    { criterion: '3.3.7', text: t.m337 }
  ];

  manualItems.forEach(m => {
    const tr = document.createElement('tr');
    const tdC = document.createElement('td');
    tdC.textContent = `SC ${m.criterion}`;
    const tdS = document.createElement('td');
    tdS.textContent = m.text;
    const tdCheck = document.createElement('td');
    tdCheck.className = 'sign-cell';
    tdCheck.innerHTML = `<label><input type="checkbox"> ${t.pass}</label><label><input type="checkbox"> ${t.fail}</label><label><input type="checkbox"> ${t.na}</label>`;
    tr.append(tdC, tdS, tdCheck);
    manualTbody.appendChild(tr);
  });
}

const PAYWALL_I18N = {
  ru: {
    btnUnlockToolbar: 'Разблокировать Pro / Войти',
    btnAccountToolbar: 'Аккаунт Pro',
    btnOpenBanner: 'Открыть Paywall / Войти',
    lockTitle: 'White-Label экспорт заблокирован (Paywall #926)',
    lockSub: 'Войдите по Email-коду или активируйте тариф через Paywall #926, чтобы открыть печать чистого A4 PDF, Markdown и Jira CSV.',
    noAuditYet: 'Сначала запустите аудит на любой веб-странице через иконку расширения (или войдите в Pro-аккаунт кнопкой выше).',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Разблокируйте клиентский A4 PDF без водяных знаков, брендирование агентства и выгрузку задач в Markdown / Jira CSV.',
    lblPlan: 'Тарифный план (Paywall #926)',
    lblAuth: 'Шаг 1 · Вход или регистрация по одноразовому Email-коду',
    phEmail: 'you@agency.com',
    btnSendOtp: 'Получить код',
    btnResendOtp: 'Отправить повторно',
    phOtp: 'Код из письма ИЛИ вставьте ссылку из кнопки письма',
    btnVerifyOtp: 'Подтвердить',
    otpSentInfo: email => `Письмо отправлено на ${email}. Введите код ниже — если в письме вместо цифр пришла кнопка/ссылка (на Default domain она не открывается в браузере), просто скопируйте адрес ссылки из письма и вставьте целиком в поле ниже!`,
    signedInAs: email => `Аккаунт: ${email}`,
    btnSignOut: 'Выйти',
    btnCheckout: 'Перейти к оплате тарифа',
    btnPortal: 'Управление подпиской (Stripe Portal)',
    awaitTitle: 'Окно оплаты Stripe открыто в соседней вкладке',
    awaitHint: 'В тестовом режиме используйте карту песочницы Stripe: <code>4242 4242 4242 4242</code> (любой будущий срок MM/YY и любой CVC). Доступ откроется автоматически через 2–3 секунды после оплаты.',
    btnCheckNow: 'Я оплатил — проверить доступ',
    btnReopenUrl: 'Открыть оплату снова',
    loadingPlans: 'Загрузка тарифов с appbox.space...',
    noPlans: 'У Paywall #926 пока нет привязанных тарифов во вкладке «Цены».',
    unlockedSuccess: 'Оплата подтверждена! Pro-экспорт разблокирован.',
    notPaidYet: 'Подписка пока не обнаружена — завершите оплату во вкладке Stripe и нажмите кнопку еще раз.',
    trialDays: n => `Пробный период: ${n} дн.`
  },
  en: {
    btnUnlockToolbar: 'Unlock Pro / Sign In',
    btnAccountToolbar: 'Pro Account',
    btnOpenBanner: 'Open Paywall / Sign In',
    lockTitle: 'White-Label Export Locked (Paywall #926)',
    lockSub: 'Sign in via Email OTP or upgrade via Paywall #926 to unlock clean A4 PDF printing, Markdown, and Jira CSV exports.',
    noAuditYet: 'Run an audit on any webpage from the extension popup first (or sign in / upgrade above).',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Unlock clean White-Label A4 PDF client reports, custom agency branding, and Markdown / Jira CSV ticket exports.',
    lblPlan: 'Select Plan (Paywall #926)',
    lblAuth: 'Step 1 · Passwordless Email OTP Sign-In',
    phEmail: 'you@agency.com',
    btnSendOtp: 'Send OTP Code',
    btnResendOtp: 'Resend Code',
    phOtp: 'Paste 6-digit code OR confirmation link URL from email',
    btnVerifyOtp: 'Verify Code',
    otpSentInfo: email => `Email sent to ${email}. Paste the 6-digit code below — or if the email contains a confirmation link button (which fails on Default domain), copy and paste that link URL right into the box below!`,
    signedInAs: email => `Signed in: ${email}`,
    btnSignOut: 'Sign Out',
    btnCheckout: 'Continue to Stripe Checkout',
    btnPortal: 'Manage Subscription (Customer Portal)',
    awaitTitle: 'Stripe Checkout opened in a new tab',
    awaitHint: 'In Test mode, use Stripe sandbox card <code>4242 4242 4242 4242</code> (any future expiry & CVC). Pro unlocks automatically within seconds after payment.',
    btnCheckNow: 'I completed payment — Check now',
    btnReopenUrl: 'Reopen Checkout Tab',
    loadingPlans: 'Loading plans from appbox.space...',
    noPlans: 'Paywall #926 has 0 attached prices in the Offers tab.',
    unlockedSuccess: 'Payment verified! White-Label Pro exports unlocked.',
    notPaidYet: 'Active subscription not detected yet — complete Stripe Checkout and check again.',
    trialDays: n => `${n}-day free trial included`
  },
  de: {
    btnUnlockToolbar: 'Pro freischalten / Anmelden',
    btnAccountToolbar: 'Pro-Konto',
    btnOpenBanner: 'Paywall öffnen / Anmelden',
    lockTitle: 'White-Label-Export gesperrt (Paywall #926)',
    lockSub: 'Melden Sie sich per E-Mail-Code über Paywall #926 an, um den sauberen A4-PDF-, Markdown- und Jira-CSV-Export freizuschalten.',
    noAuditYet: 'Starten Sie zuerst eine Prüfung über das Erweiterungs-Popup (oder melden Sie sich oben an).',
    modalTitle: 'Express Client Auditor Pro',
    modalSub: 'Schalten Sie saubere White-Label-A4-PDF-Berichte, Agentur-Branding sowie Markdown- und Jira-CSV-Exporte frei.',
    lblPlan: 'Tarif wählen (Paywall #926)',
    lblAuth: 'Schritt 1 · Anmeldung per Einmal-Code (E-Mail)',
    phEmail: 'name@agentur.de',
    btnSendOtp: 'Code senden',
    btnResendOtp: 'Erneut senden',
    phOtp: 'Code ODER Bestätigungs-Link aus der E-Mail einfügen',
    btnVerifyOtp: 'Bestätigen',
    otpSentInfo: email => `Einmal-Code an ${email} gesendet. Bitte unten eingeben.`,
    signedInAs: email => `Angemeldet: ${email}`,
    btnSignOut: 'Abmelden',
    btnCheckout: 'Weiter zur Zahlung (Stripe)',
    btnPortal: 'Abonnement verwalten (Portal)',
    awaitTitle: 'Stripe Checkout in neuem Tab geöffnet',
    awaitHint: 'Im Testmodus Karte <code>4242 4242 4242 4242</code> (beliebiges Ablaufdatum & CVC) verwenden. Freischaltung erfolgt automatisch.',
    btnCheckNow: 'Zahlung abgeschlossen — Status prüfen',
    btnReopenUrl: 'Zahlungslink erneut öffnen',
    loadingPlans: 'Tarife werden geladen...',
    noPlans: 'Paywall #926 enthält aktuell 0 verknüpfte Tarife.',
    unlockedSuccess: 'Zahlung bestätigt! Pro-Export freigeschaltet.',
    notPaidYet: 'Noch keine aktive Zahlung gefunden — bitte Stripe Checkout abschließen.',
    trialDays: n => `${n} Tage kostenlos testen`
  }
};

let reportProUnlocked = false;
let reportDevOverride = false;
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

function syncModalAuthState() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const user = window.MonetizeBridge?.getCurrentUser?.();
  const authBox = document.getElementById('pw-auth-box');
  const sessBox = document.getElementById('pw-session-box');
  const emailSpan = document.getElementById('pw-user-email');
  const checkoutBtn = document.getElementById('pw-btn-checkout');
  const portalBtn = document.getElementById('pw-btn-portal');

  if (user && (user.email || user.id)) {
    authBox.hidden = true;
    sessBox.hidden = false;
    emailSpan.textContent = pt.signedInAs(user.email || user.id);
    checkoutBtn.hidden = reportProUnlocked;
    portalBtn.hidden = !reportProUnlocked;
  } else {
    authBox.hidden = false;
    sessBox.hidden = true;
    document.getElementById('pw-awaiting-box').hidden = true;
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
  document.getElementById('pw-lbl-auth').textContent = pt.lblAuth;
  document.getElementById('pw-email').placeholder = pt.phEmail;
  document.getElementById('pw-btn-send-otp').textContent = pt.btnSendOtp;
  document.getElementById('pw-otp').placeholder = pt.phOtp;
  document.getElementById('pw-btn-verify-otp').textContent = pt.btnVerifyOtp;
  document.getElementById('pw-btn-signout').textContent = pt.btnSignOut;
  document.getElementById('pw-btn-checkout').textContent = pt.btnCheckout;
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
  syncModalAuthState();
}

async function openPaywallDialog() {
  const modal = document.getElementById('paywall-modal');
  if (!modal) return;
  modal.hidden = false;
  showModalAlert(null, '');
  syncModalAuthState();

  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const listEl = document.getElementById('pw-plans-list');
  if (!loadedPrices.length && listEl) {
    listEl.textContent = pt.loadingPlans;
  }

  try {
    loadedPrices = await window.MonetizeBridge.loadPrices(false);
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
    const res = await window.MonetizeBridge.checkAccess({ skipCacheFallback: true });
    if (res && res.granted) {
      stopCheckoutPolling();
      const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
      applyLockUI(true);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 900);
    }
  } catch (_) {}
}

function startCheckoutPolling() {
  stopCheckoutPolling();
  pollTimer = setInterval(pollOnceForUnlock, 3000);
}

window.addEventListener('focus', () => { if (pollTimer) pollOnceForUnlock(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && pollTimer) pollOnceForUnlock();
});

async function handleSendOtp() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const emailIn = document.getElementById('pw-email');
  const btn = document.getElementById('pw-btn-send-otp');
  btn.disabled = true;
  showModalAlert(null, '');
  try {
    const { email } = await window.MonetizeBridge.sendEmailOtp(emailIn.value);
    emailIn.value = email;
    document.getElementById('pw-otp-row').hidden = false;
    document.getElementById('pw-otp').focus();
    btn.textContent = pt.btnResendOtp;
    showModalAlert('info', pt.otpSentInfo(email));
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  } finally {
    btn.disabled = false;
  }
}

async function handleVerifyOtp() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const email = document.getElementById('pw-email').value;
  const code = document.getElementById('pw-otp').value;
  const btn = document.getElementById('pw-btn-verify-otp');
  btn.disabled = true;
  showModalAlert(null, '');
  try {
    const { access } = await window.MonetizeBridge.verifyEmailOtp(email, code);
    syncModalAuthState();
    if (access && access.granted) {
      applyLockUI(true);
      showModalAlert('ok', pt.unlockedSuccess);
      setTimeout(() => closePaywallDialog(), 800);
    } else {
      showModalAlert('ok', pt.signedInAs(email));
    }
  } catch (err) {
    showModalAlert('error', window.MonetizeBridge.formatError(err));
  } finally {
    btn.disabled = false;
  }
}

async function handleStartCheckout() {
  const pt = PAYWALL_I18N[currentLang] || PAYWALL_I18N.en;
  const btn = document.getElementById('pw-btn-checkout');
  btn.disabled = true;
  showModalAlert(null, '');
  try {
    if (!selectedPriceId && loadedPrices.length) {
      selectedPriceId = loadedPrices[0].id;
    }
    const res = await window.MonetizeBridge.startStripeCheckout(selectedPriceId);
    if (res.alreadyPurchased) {
      applyLockUI(true);
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
  if (btnPrint) btnPrint.style.display = reportProUnlocked ? '' : 'none';
  if (btnMd) btnMd.style.display = reportProUnlocked ? '' : 'none';
  if (btnCsv) btnCsv.style.display = reportProUnlocked ? '' : 'none';

  const manifest = chrome.runtime.getManifest();
  const devBtn = document.getElementById('btn-dev-report-toggle');
  if (!manifest.update_url && devBtn) {
    devBtn.hidden = false;
    devBtn.textContent = reportDevOverride ? 'Dev Override: ON (Lock)' : 'Dev: Test Unlock';
  }
  syncModalAuthState();
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

document.getElementById('pw-close')?.addEventListener('click', closePaywallDialog);
document.getElementById('paywall-modal')?.addEventListener('click', e => {
  if (e.target.id === 'paywall-modal') closePaywallDialog();
});
document.getElementById('pw-btn-send-otp')?.addEventListener('click', handleSendOtp);
document.getElementById('pw-email')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSendOtp();
});
document.getElementById('pw-btn-verify-otp')?.addEventListener('click', handleVerifyOtp);
document.getElementById('pw-otp')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleVerifyOtp();
});
document.getElementById('pw-btn-checkout')?.addEventListener('click', handleStartCheckout);
document.getElementById('pw-btn-signout')?.addEventListener('click', async () => {
  await window.MonetizeBridge.signOut();
  applyLockUI(false);
  syncModalAuthState();
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
  const res = await window.MonetizeBridge.checkAccess({ skipCacheFallback: true });
  if (res && res.granted) {
    stopCheckoutPolling();
    applyLockUI(true);
    showModalAlert('ok', pt.unlockedSuccess);
    setTimeout(() => closePaywallDialog(), 800);
  } else {
    showModalAlert('info', pt.notPaidYet);
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
    applyLockUI(false);
    return;
  }

  window.MonetizeBridge.onOpenModal(() => openPaywallDialog());
  window.MonetizeBridge.onAccessChange((granted, detail) => {
    applyLockUI(granted, detail?.devOverride ?? reportDevOverride);
  });

  applyLockUI(false);

  const params = new URLSearchParams(window.location.search);
  const explicitPaywallOpen = params.get('paywall') === '1';

  const access = await window.MonetizeBridge.checkAccess();
  applyLockUI(access.granted, access.devOverride);

  if (explicitPaywallOpen || !access.granted) {
    openPaywallDialog();
  }
}

initReport().then(() => initPaywallGate());
