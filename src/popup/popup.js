let currentTabId = null;
let currentWindowId = null;
let lastAudit = null;
let activeFilter = 'all';
let isPro = false;
let billingEmail = '';
let simFixActive = false;

const btnScan = document.getElementById('btn-scan');
const statusMsg = document.getElementById('status-msg');
const resultsPanel = document.getElementById('results-panel');
const issuesList = document.getElementById('issues-list');
const helpBar = document.getElementById('help-consistency-bar');
const promoBanner = document.getElementById('promo-banner');
const btnSimFix = document.getElementById('btn-sim-fix');
const chkHud = document.getElementById('chk-hud');
const chkWarnHud = document.getElementById('chk-warn-hud');
const chkTabMapHud = document.getElementById('chk-tabmap-hud');
const planPill = document.getElementById('btn-plan-pill');
const btnOpenPaywall = document.getElementById('btn-open-paywall');
const btnSignOutPro = document.getElementById('btn-signout-pro');

function showStatus(text) {
  statusMsg.textContent = text;
  statusMsg.hidden = !text;
}

function getHumanSummary(iss) {
  const p = iss.params || {};
  switch (iss.code) {
    case 'TEXT_CONTRAST_LOW':
      return `Text contrast is ${p.ratio}:1 (needs ${p.required}:1 under EN 301 549 Cl. 9.1.4.3) — hard to read for low-vision users.`;
    case 'IMG_ALT_MISSING':
      return 'Image lacks alt attribute (Cl. 9.1.1.1) — screen readers announce raw filename or skip link action.';
    case 'EMPTY_INTERACTIVE_NAME':
      return 'Button or link has zero accessible name (Cl. 9.4.1.2) — announced as blank control by VoiceOver/NVDA.';
    case 'FORM_LABEL_MISSING':
      return 'Input lacks programmatic <label> or aria-label (Cl. 9.3.3.2) — fails EAA form accessibility.';
    case 'HTML_LANG_MISSING':
      return 'Missing <html lang> attribute (Cl. 9.3.1.1) — screen readers use wrong pronunciation engine.';
    case 'TARGET_COLLISION':
      return `Hit area is only ${p.w}×${p.h}px (needs 24×24px) — users with motor tremor or touch screens misclick adjacent controls.`;
    case 'FOCUS_RING_SUPPRESSED':
      return 'Invisible when pressing Tab — keyboard users lose track of where they are typing or clicking.';
    case 'FOCUS_OBSCURED_FULL':
      return `100% hidden behind sticky bar (${p.blockerH}px) when tabbed — keyboard users cannot see what they focused.`;
    case 'AUTH_PASTE_BLOCKED':
      return 'Blocks password manager paste — violates EAA cognitive accessibility requirements.';
    case 'EAA_OVERLAY_DETECTED':
      return `Uses ${p.vendor} overlay widget — rejected by EU accessibility regulators as non-compliant.`;
    default:
      return iss.title;
  }
}

function updateProBadges() {
  planPill.textContent = isPro ? 'PRO' : 'FREE';
  planPill.classList.toggle('is-pro', isPro);

  if (promoBanner) {
    promoBanner.hidden = isPro;
  }

  if (btnOpenPaywall) {
    btnOpenPaywall.textContent = isPro
      ? (billingEmail ? `Pro: ${billingEmail}` : 'Pro Account')
      : 'Upgrade Pro ($10/mo)';
  }

  if (btnSignOutPro) {
    btnSignOutPro.hidden = !isPro;
  }
}

async function refreshProStatus() {
  try {
    if (window.MonetizeBridge) {
      const res = await window.MonetizeBridge.checkAccess();
      isPro = Boolean(res && res.granted);
      billingEmail = (res && res.email) || '';
    }
  } catch (_) {
    isPro = false;
  }
  updateProBadges();
}

if (window.MonetizeBridge) {
  window.MonetizeBridge.onAccessChange((granted, detail) => {
    isPro = Boolean(granted);
    if (detail && typeof detail.email === 'string') billingEmail = detail.email;
    updateProBadges();
    renderIssues();
  });
}

async function loadBrandingInputs() {
  const { agencyBrand } = await chrome.storage.local.get('agencyBrand');
  if (!agencyBrand) return;
  document.getElementById('in-agency').value = agencyBrand.agencyName || '';
  document.getElementById('in-auditor').value = agencyBrand.auditorContact || '';
  document.getElementById('in-client').value = agencyBrand.clientName || '';
}

async function evaluateCrossPageConsistentHelp(audit) {
  const hp = audit.helpProfile;
  if (!hp || !hp.hostname) return audit;

  const store = await chrome.storage.local.get('domainHelpHistory');
  const history = store.domainHelpHistory || {};
  const domainPages = history[hp.hostname] || {};

  if (hp.mechanisms && hp.mechanisms.length > 0) {
    domainPages[hp.pathname || '/'] = {
      signature: hp.signature,
      mechanisms: hp.mechanisms,
      updatedAt: audit.scannedAt
    };
    const keys = Object.keys(domainPages);
    if (keys.length > 10) {
      delete domainPages[keys[0]];
    }
    history[hp.hostname] = domainPages;
    await chrome.storage.local.set({ domainHelpHistory: history });
  }

  const entries = Object.entries(domainPages);
  audit.consistentHelpSummary = {
    pagesCompared: entries.length,
    status: entries.length >= 2 ? 'pass' : 'single_page',
    baselinePath: entries[0]?.[0] || hp.pathname
  };

  if (entries.length >= 2) {
    const [basePath, baseData] = entries[0];
    for (const [pathKey, pageData] of entries.slice(1)) {
      const baseMap = new Map((baseData.mechanisms || []).map(m => [m.kind, m.zone]));
      for (const m of (pageData.mechanisms || [])) {
        if (baseMap.has(m.kind) && baseMap.get(m.kind) !== m.zone) {
          audit.consistentHelpSummary.status = 'fail';
          audit.consistentHelpSummary.mismatchDetail = `${m.kind}: ${baseMap.get(m.kind)} (${basePath}) vs ${m.zone} (${pathKey})`;
          audit.issues.unshift({
            code: 'CONSISTENT_HELP_MISMATCH',
            criterion: '3.2.6',
            level: 'A',
            severity: 'fail',
            title: `Help mechanism (${m.kind}) changed relative landmark order across pages`,
            elementLabel: m.label || m.kind,
            selector: m.selector || 'header / footer',
            componentGroupKey: `help:${m.kind}`,
            params: { kind: m.kind, baseZone: baseMap.get(m.kind), basePath, curZone: m.zone, curPath: pathKey },
            actual: `${m.kind} in ${baseMap.get(m.kind)} on ${basePath}, but ${m.zone} on ${pathKey}`,
            fixCode: 'Keep repeated help/contact/chat mechanisms in the same relative DOM landmark order across all pages (SC 3.2.6).',
            bbox: null
          });
          audit.counts.fail += 1;
          audit.readinessScore = Math.max(5, (audit.readinessScore || 100) - 12);
          break;
        }
      }
      if (audit.consistentHelpSummary.status === 'fail') break;
    }
  }

  return audit;
}

function renderHelpBar(audit) {
  if (!helpBar || !audit.consistentHelpSummary) {
    if (helpBar) helpBar.hidden = true;
    return;
  }
  const s = audit.consistentHelpSummary;
  const mechCount = audit.helpProfile?.mechanisms?.length || 0;
  helpBar.hidden = false;
  helpBar.classList.toggle('is-mismatch', s.status === 'fail');

  if (s.status === 'fail') {
    helpBar.textContent = `SC 3.2.6 Mismatch across ${s.pagesCompared} pages: ${s.mismatchDetail}`;
  } else if (s.pagesCompared >= 2) {
    helpBar.textContent = `SC 3.2.6 Verified: Consistent Help order across ${s.pagesCompared} pages of ${audit.helpProfile.hostname}`;
  } else {
    helpBar.textContent = `SC 3.2.6 Tracker: ${mechCount} help link(s) recorded on ${audit.helpProfile.pathname} — scan 1 more page to verify cross-page order`;
  }
}

function updateScoreMeter(score) {
  const s = Math.max(5, Math.min(100, Number(score ?? 100)));
  const valEl = document.getElementById('score-meter-val');
  const fillEl = document.getElementById('score-fill');
  if (valEl) {
    valEl.textContent = `${s}%`;
    valEl.style.color = s >= 85 ? '#34d399' : (s >= 60 ? '#fbbf24' : '#f87171');
  }
  if (fillEl) {
    fillEl.style.width = `${s}%`;
  }
}

function renderIssues() {
  if (!lastAudit) return;
  issuesList.replaceChildren();

  const filtered = lastAudit.issues
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'fail') return item.severity === 'fail';
      if (activeFilter === 'a11y-name') return ['1.1.1', '2.4.4', '3.1.1', '3.3.2', '4.1.2', '1.3.1'].includes(item.criterion);
      return item.criterion.startsWith(activeFilter);
    });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'status-msg';
    empty.textContent = 'Zero findings in this filter.';
    issuesList.appendChild(empty);
    return;
  }

  filtered.forEach(({ item, idx }, cardPos) => {
    const card = document.createElement('div');
    card.className = `issue-card sev-${item.severity}`;

    const head = document.createElement('div');
    head.className = 'issue-head';
    const pill = document.createElement('span');
    pill.className = 'issue-pill';
    pill.textContent = `#${idx + 1} · SC ${item.criterion} · ${item.severity.toUpperCase()}`;

    const spot = document.createElement('span');
    spot.className = 'spot-btn';
    spot.textContent = item.bbox ? 'Spotlight ↗' : '';
    head.append(pill, spot);

    const elBadge = document.createElement('div');
    elBadge.className = 'issue-el-badge';
    elBadge.textContent = item.elementLabel ? `"${item.elementLabel}"` : item.selector;

    const lawLine = document.createElement('div');
    lawLine.className = 'issue-law';
    const lawInfo = window.WCAG22_NORMATIVE_DB?.lookupClause?.(item.criterion, 'en');
    lawLine.textContent = `⚖ ${item.enClause || lawInfo?.enClause || `EN 301 549 Cl. 9.${item.criterion}`} · ${item.eaaLaw || 'EU 2019/882 Annex I'}`;

    const impact = document.createElement('div');
    impact.className = 'issue-impact';
    impact.textContent = getHumanSummary(item);

    card.append(head, elBadge, lawLine, impact);

    if (isPro || cardPos < 1) {
      const fix = document.createElement('div');
      fix.className = 'issue-fix';
      fix.textContent = `Fix: ${item.fixCode}`;
      card.appendChild(fix);
    } else {
      const locked = document.createElement('div');
      locked.className = 'issue-locked';
      locked.textContent = '🔒 Annotated screenshot & CSS fix in Visual Report →';
      card.appendChild(locked);
    }

    card.addEventListener('click', () => {
      if (currentTabId && item.bbox) {
        chrome.tabs.sendMessage(currentTabId, { type: 'HIGHLIGHT_ISSUE', index: idx });
      }
    });

    issuesList.appendChild(card);
  });
}

// Vector Spotlight Evidence Studio: draws CleanShot-style spotlight vignette, red corner brackets,
// 24px target circle or sticky hazard band, and high-contrast callout pill directly onto the screenshot!
function annotateEvidenceCrop(dataUrl, rect, issue, badgeNum) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const dpr = rect.dpr || 1;
      // Generous contextual crop (minimum 440x230 CSS px) so client clearly sees WHERE on the page the bug lives!
      const ctxW = Math.max(440, rect.w + 180);
      const ctxH = Math.max(230, rect.h + 130);

      const centerX = rect.x + rect.w / 2;
      const centerY = rect.y + rect.h / 2;

      const maxCssW = img.width / dpr;
      const maxCssH = img.height / dpr;

      const cropCssX = Math.max(0, Math.min(maxCssW - ctxW, centerX - ctxW / 2));
      const cropCssY = Math.max(0, Math.min(maxCssH - ctxH, centerY - ctxH / 2));
      const actualCssW = Math.max(80, Math.min(maxCssW - cropCssX, ctxW));
      const actualCssH = Math.max(60, Math.min(maxCssH - cropCssY, ctxH));

      const sx = Math.round(cropCssX * dpr);
      const sy = Math.round(cropCssY * dpr);
      const sw = Math.round(actualCssW * dpr);
      const sh = Math.round(actualCssH * dpr);

      const outW = 640;
      const scale = outW / actualCssW;
      const outH = Math.round(actualCssH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');

      // 1. Draw full crisp page context
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      // Element coordinates inside output canvas
      const ex = (rect.x - cropCssX) * scale;
      const ey = (rect.y - cropCssY) * scale;
      const ew = Math.max(16, rect.w * scale);
      const eh = Math.max(16, rect.h * scale);

      // 2. Subtle CleanShot Spotlight Vignette around outside so target element pops!
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.beginPath();
      ctx.rect(0, 0, outW, outH);
      const spotPad = 10;
      ctx.rect(
        Math.max(0, ex - spotPad),
        Math.max(0, ey - spotPad),
        Math.min(outW, ew + spotPad * 2),
        Math.min(outH, eh + spotPad * 2)
      );
      ctx.fill('evenodd');
      ctx.restore();

      // 3. Criterion-specific visual proof overlay
      if (issue.code === 'FOCUS_OBSCURED_FULL') {
        // Diagonal red hazard stripes showing sticky header obscuring the focused element
        ctx.save();
        ctx.fillStyle = 'rgba(220, 38, 38, 0.24)';
        ctx.fillRect(ex - 4, ey - 4, ew + 8, eh + 8);
        ctx.restore();
      } else if (issue.criterion === '2.5.8') {
        // Draw red 24px minimum target radius circle centered on control
        const r24 = 12 * scale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ex + ew / 2, ey + eh / 2, r24, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
        ctx.restore();
      }

      // 4. Crisp Red Spotlight Frame + Glow around target element
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.65)';
      ctx.shadowBlur = 10;
      ctx.strokeRect(ex - 4, ey - 4, ew + 8, eh + 8);
      ctx.restore();

      // 5. High-contrast Callout Pill (auto-positioned below if near top edge!)
      const pillText = `#${badgeNum} · SC ${issue.criterion} · ${issue.hudCallout || 'AA VIOLATION'}`;
      ctx.save();
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const tw = ctx.measureText(pillText).width;
      const pw = tw + 20;
      const ph = 26;
      const px = Math.max(8, Math.min(outW - pw - 8, ex - 4));
      const py = (ey - ph - 10 >= 6) ? (ey - ph - 10) : Math.min(outH - ph - 6, ey + eh + 10);

      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(px, py, pw, ph, 6);
      } else {
        ctx.rect(px, py, pw, ph);
      }
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, px + 10, py + ph / 2 + 0.5);
      ctx.restore();

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function captureTopIssueCrops(audit, maxCrops = 10) {
  const enriched = structuredClone(audit);
  if (!currentTabId) return enriched;

  const seenGroupKeys = new Set();
  const targets = [];
  let groupOrder = 0;
  enriched.issues.forEach((issue, idx) => {
    if (issue.severity !== 'fail' || !issue.bbox) return;
    const gKey = `${issue.criterion}|${issue.code || ''}|${issue.componentGroupKey || issue.selector}`;
    if (seenGroupKeys.has(gKey)) return;
    seenGroupKeys.add(gKey);
    groupOrder += 1;
    if (targets.length < maxCrops) {
      targets.push({ issue, idx, badgeNum: groupOrder });
    }
  });

  for (const { issue, idx, badgeNum } of targets) {
    try {
      const pos = await chrome.tabs.sendMessage(currentTabId, { type: 'SCROLL_FOR_CROP', index: idx });
      if (!pos || !pos.ok) continue;
      await new Promise(r => setTimeout(r, (pos.settledMs && pos.settledMs >= 350) ? 40 : 350));
      const shot = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB', windowId: currentWindowId });
      if (!shot || !shot.dataUrl) continue;

      issue.cropDataUrl = await annotateEvidenceCrop(shot.dataUrl, pos.viewportRect, issue, badgeNum);
    } catch (_) {}
  }

  try {
    await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_HUD_AFTER_CROP' });
  } catch (_) {}

  return enriched;
}

function syncSimButtonUI() {
  if (!btnSimFix || !lastAudit) return;
  const hasFails = lastAudit.counts.fail > 0;
  btnSimFix.hidden = !hasFails;
  btnSimFix.classList.toggle('is-active', simFixActive);
  document.getElementById('sim-text').textContent = simFixActive
    ? 'Showing AFTER Fix on Page (Click to View Broken State)'
    : `Preview CSS Fixes Live on Page (${lastAudit.counts.fail} AA Fails)`;
}

btnSimFix?.addEventListener('click', async () => {
  if (!currentTabId || !lastAudit) return;
  simFixActive = !simFixActive;
  await chrome.tabs.sendMessage(currentTabId, { type: 'SIMULATE_FIXES', enabled: simFixActive });
  syncSimButtonUI();
});

btnScan.addEventListener('click', async () => {
  simFixActive = false;
  showStatus('Scanning WCAG 2.2 AA geometry, focus X-Ray & EAA layers...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url || /^(chrome|edge|about|moz-extension):/i.test(tab.url)) {
    showStatus('Open any HTTP/HTTPS webpage to run a WCAG 2.2 AA audit.');
    return;
  }
  currentTabId = tab.id;
  currentWindowId = tab.windowId;

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/rules/normative-db.js']
    }).catch(() => {});
    const injected = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/scanner.js']
    });
    let rawAudit = injected && injected[0] && injected[0].result;
    if (!rawAudit) throw new Error('Scanner returned empty result');

    lastAudit = await evaluateCrossPageConsistentHelp(rawAudit);

    if (chkWarnHud.checked) {
      chrome.tabs.sendMessage(tab.id, { type: 'SET_HUD_WARNINGS', showWarnings: true });
    }
    if (chkTabMapHud.checked) {
      chrome.tabs.sendMessage(tab.id, { type: 'SET_HUD_TABMAP', showTabMap: true });
    }

    await chrome.storage.local.set({ latestAuditReport: lastAudit });

    document.getElementById('cnt-fail').textContent = String(lastAudit.counts.fail);
    document.getElementById('cnt-warn').textContent = String(lastAudit.counts.warning);
    document.getElementById('cnt-manual').textContent = String(lastAudit.counts.manual);
    document.getElementById('cnt-nodes').textContent = String(lastAudit.counts.checkedNodes);
    updateScoreMeter(lastAudit.readinessScore);
    syncSimButtonUI();

    showStatus(`Scanned ${lastAudit.counts.checkedNodes} controls (${lastAudit.counts.tabStops || 0} tab stops) in ${lastAudit.durationMs} ms`);
    resultsPanel.hidden = false;
    renderHelpBar(lastAudit);
    renderIssues();
  } catch (err) {
    showStatus(`Audit failed on this tab: ${err.message}`);
  }
});

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    activeFilter = btn.dataset.filter;
    renderIssues();
  });
});

chkHud.addEventListener('change', () => {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'TOGGLE_HUD', visible: chkHud.checked });
  }
});

chkWarnHud.addEventListener('change', () => {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'SET_HUD_WARNINGS', showWarnings: chkWarnHud.checked });
  }
});

chkTabMapHud.addEventListener('change', () => {
  if (currentTabId) {
    chrome.tabs.sendMessage(currentTabId, { type: 'SET_HUD_TABMAP', showTabMap: chkTabMapHud.checked });
  }
});

document.getElementById('btn-save-brand').addEventListener('click', async () => {
  const existing = (await chrome.storage.local.get('agencyBrand')).agencyBrand || {};
  const logoInput = document.getElementById('in-logo');
  let logoDataUrl = existing.logoDataUrl || null;

  if (logoInput.files && logoInput.files[0]) {
    logoDataUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(logoInput.files[0]);
    });
  }

  const agencyBrand = {
    agencyName: document.getElementById('in-agency').value.trim(),
    auditorContact: document.getElementById('in-auditor').value.trim(),
    clientName: document.getElementById('in-client').value.trim(),
    logoDataUrl
  };
  await chrome.storage.local.set({ agencyBrand });
  showStatus('Agency branding saved locally.');
});

async function openReportTab(mode) {
  if (!lastAudit) return;
  showStatus('Rendering Spotlight visual evidence cards...');
  const enriched = await captureTopIssueCrops(lastAudit);
  await chrome.storage.local.set({ latestAuditReport: enriched, reportAutoAction: mode });
  chrome.tabs.create({ url: chrome.runtime.getURL(`src/report/report.html?mode=${encodeURIComponent(mode)}`) });
}

document.getElementById('btn-export-pdf').addEventListener('click', () => openReportTab('pdf'));
document.getElementById('btn-export-md').addEventListener('click', () => openReportTab('tickets'));

function openAccountOrPaywallTab() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/report/report.html?paywall=1') });
}

btnOpenPaywall.addEventListener('click', openAccountOrPaywallTab);
planPill.addEventListener('click', openAccountOrPaywallTab);
document.getElementById('btn-promo-upgrade')?.addEventListener('click', openAccountOrPaywallTab);

btnSignOutPro?.addEventListener('click', async () => {
  if (window.MonetizeBridge) {
    await window.MonetizeBridge.signOut();
  }
  billingEmail = '';
  isPro = false;
  await refreshProStatus();
  renderIssues();
  showStatus('Signed out of Pro license — Free tier & Visual Teaser enabled.');
});

refreshProStatus();
loadBrandingInputs();

async function initNormativeBar() {
  const txtEl = document.getElementById('norm-bar-text');
  const btn = document.getElementById('btn-sync-norms');
  if (!txtEl) return;

  const renderState = st => {
    const ver = st?.registryVersion || window.WCAG22_NORMATIVE_DB?.data?.registryVersion || '2026.11.1';
    const dt = st?.lastCheckedAt ? new Date(st.lastCheckedAt).toLocaleDateString() : 'v1.1';
    txtEl.textContent = `⚖ EN 301 549 V4.1.1 · EU 2019/882 (${ver} · ✓ ${dt})`;
    if (st && window.WCAG22_NORMATIVE_DB) {
      window.WCAG22_NORMATIVE_DB.applyRegistryOverrides(st);
    }
  };

  try {
    const { normativeRegistryState } = await chrome.storage.local.get('normativeRegistryState');
    renderState(normativeRegistryState);
  } catch (_) {}

  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '↻ ...';
    try {
      const res = await chrome.runtime.sendMessage({ type: 'CHECK_NORMATIVE_UPDATES', force: true });
      if (res?.state) renderState(res.state);
      showStatus('Нормативная база стандартов WCAG 2.2 & EN 301 549 проверена и актуальна.');
    } catch (_) {}
    btn.disabled = false;
    btn.textContent = '↻ Нормы';
  });
}
initNormativeBar();
