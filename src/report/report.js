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

  // 2. Render Warnings in a compact single table instead of multi-page full cards
  const warns = auditData.issues.filter(i => i.severity === 'warning');
  const warnSection = document.getElementById('warnings-section');
  const warnTbody = document.getElementById('warnings-tbody');
  warnTbody.replaceChildren();

  if (warns.length === 0) {
    warnSection.hidden = true;
  } else {
    warnSection.hidden = false;
    warns.forEach(w => {
      const tr = document.createElement('tr');
      const tdCrit = document.createElement('td');
      tdCrit.textContent = `SC ${w.criterion}`;

      const tdEl = document.createElement('td');
      const lbl = document.createElement('div');
      lbl.textContent = w.elementLabel || '—';
      const code = document.createElement('div');
      code.className = 'compact-code notranslate';
      code.setAttribute('translate', 'no');
      code.textContent = w.selector;
      tdEl.append(lbl, code);

      const tdObs = document.createElement('td');
      tdObs.textContent = t.issueObs(w);

      const tdFix = document.createElement('td');
      tdFix.className = 'compact-code notranslate';
      tdFix.setAttribute('translate', 'no');
      tdFix.textContent = w.fixCode;

      tr.append(tdCrit, tdEl, tdObs, tdFix);
      warnTbody.appendChild(tr);
    });
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

async function initReport() {
  const uiLang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  currentLang = ['ru', 'en', 'de'].includes(uiLang) ? uiLang : 'en';

  const store = await chrome.storage.local.get(['latestAuditReport', 'agencyBrand', 'reportLang']);
  if (store.reportLang && I18N[store.reportLang]) {
    currentLang = store.reportLang;
  }
  auditData = store.latestAuditReport;
  brandData = store.agencyBrand || {};

  if (!auditData) {
    document.getElementById('fails-container').textContent = 'Run an audit from the extension popup first.';
    return;
  }
  renderReport();
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    currentLang = btn.dataset.lang;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ reportLang: currentLang });
    }
    renderReport();
  });
});

document.getElementById('btn-print').addEventListener('click', () => { if (!reportProUnlocked) return triggerPaywallModal(); window.print(); });
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


let reportProUnlocked = false;

function applyLockUI(unlocked) {
  reportProUnlocked = Boolean(unlocked);
  document.body.classList.toggle('is-paywall-locked', !reportProUnlocked);

  const btnUnlock = document.getElementById('btn-unlock-pro');
  const banner = document.getElementById('locked-banner');
  const btnPrint = document.getElementById('btn-print');
  const btnMd = document.getElementById('btn-dl-md');
  const btnCsv = document.getElementById('btn-dl-csv');

  if (btnUnlock) btnUnlock.hidden = reportProUnlocked;
  if (banner) banner.hidden = reportProUnlocked;
  if (btnPrint) btnPrint.style.display = reportProUnlocked ? '' : 'none';
  if (btnMd) btnMd.style.display = reportProUnlocked ? '' : 'none';
  if (btnCsv) btnCsv.style.display = reportProUnlocked ? '' : 'none';

  const manifest = chrome.runtime.getManifest();
  const devBtn = document.getElementById('btn-dev-report-toggle');
  if (!manifest.update_url && devBtn) {
    devBtn.hidden = false;
    devBtn.textContent = reportProUnlocked ? 'Dev: Lock' : 'Dev: Unlock';
  }
}

function triggerPaywallModal() {
  if (window.MonetizeBridge) {
    window.MonetizeBridge.openPaywall();
  }
}

async function initPaywallGate() {
  if (!window.MonetizeBridge) {
    applyLockUI(false);
    return;
  }
  window.MonetizeBridge.onAccessChange(granted => {
    applyLockUI(granted);
  });

  const access = await window.MonetizeBridge.checkAccess();
  applyLockUI(access.granted);

  const params = new URLSearchParams(window.location.search);
  if (!access.granted || params.get('paywall') === '1') {
    triggerPaywallModal();
  }
}

document.getElementById('btn-unlock-pro')?.addEventListener('click', triggerPaywallModal);
document.getElementById('btn-banner-paywall')?.addEventListener('click', triggerPaywallModal);
document.getElementById('btn-dev-report-toggle')?.addEventListener('click', async () => {
  const res = await chrome.runtime.sendMessage({ type: 'SET_DEV_PRO_OVERRIDE', paid: !reportProUnlocked });
  applyLockUI(Boolean(res && res.paid));
});

initReport().then(() => initPaywallGate());
