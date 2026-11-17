let currentTabId = null;
let currentWindowId = null;
let lastAudit = null;
let activeFilter = 'all';
let isPro = false;
let isDevOverride = false;

const btnScan = document.getElementById('btn-scan');
const statusMsg = document.getElementById('status-msg');
const resultsPanel = document.getElementById('results-panel');
const issuesList = document.getElementById('issues-list');
const helpBar = document.getElementById('help-consistency-bar');
const chkHud = document.getElementById('chk-hud');
const chkWarnHud = document.getElementById('chk-warn-hud');
const chkTabMapHud = document.getElementById('chk-tabmap-hud');
const planPill = document.getElementById('btn-plan-pill');

function showStatus(text) {
  statusMsg.textContent = text;
  statusMsg.hidden = !text;
}

function updateProBadges() {
  planPill.textContent = isPro ? 'PRO' : 'FREE';
  planPill.classList.toggle('is-pro', isPro);

  const manifest = chrome.runtime.getManifest();
  const devBtn = document.getElementById('btn-dev-unlock');
  if (!manifest.update_url && devBtn) {
    devBtn.hidden = false;
    devBtn.textContent = isDevOverride ? 'Dev Override: ON (Reset to Free)' : 'Dev Mode: Test Pro';
  }
}

async function refreshProStatus() {
  try {
    if (window.MonetizeBridge) {
      const res = await window.MonetizeBridge.checkAccess();
      isPro = Boolean(res && res.granted);
      isDevOverride = Boolean(res && res.devOverride);
    }
  } catch (_) {
    isPro = false;
  }
  updateProBadges();
}

if (window.MonetizeBridge) {
  window.MonetizeBridge.onAccessChange((granted, detail) => {
    isPro = Boolean(granted);
    if (detail && typeof detail.devOverride === 'boolean') isDevOverride = detail.devOverride;
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

// Cross-page SC 3.2.6 Consistent Help tracker per hostname
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
      // Compare common help mechanism kinds that appear on both pages (per W3C SC 3.2.6)
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

function renderIssues() {
  if (!lastAudit) return;
  issuesList.replaceChildren();

  const filtered = lastAudit.issues
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'fail') return item.severity === 'fail';
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
    head.textContent = `#${idx + 1} · SC ${item.criterion} (${item.severity.toUpperCase()})`;

    const title = document.createElement('div');
    title.className = 'issue-title';
    title.textContent = item.title;

    const sel = document.createElement('div');
    sel.className = 'issue-sel';
    sel.textContent = `${item.selector} — ${item.actual}`;

    card.append(head, title, sel);

    if (isPro || cardPos < 3) {
      const fix = document.createElement('div');
      fix.className = 'issue-fix';
      fix.textContent = item.fixCode;
      card.appendChild(fix);
    } else {
      const locked = document.createElement('div');
      locked.className = 'issue-locked';
      locked.textContent = 'Fix snippet & screenshot crop included in Pro Client Report';
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

async function captureTopIssueCrops(audit, maxCrops = 10) {
  const enriched = structuredClone(audit);
  if (!currentTabId) return enriched;

  // Capture screenshot for unique component groups first so every distinct failure gets a crisp visual proof
  const seenGroupKeys = new Set();
  const targets = [];
  enriched.issues.forEach((issue, idx) => {
    if (issue.severity !== 'fail' || !issue.bbox) return;
    const gKey = issue.componentGroupKey || issue.selector;
    if (seenGroupKeys.has(gKey)) return;
    seenGroupKeys.add(gKey);
    if (targets.length < maxCrops) {
      targets.push({ issue, idx });
    }
  });

  for (const { issue, idx } of targets) {
    try {
      const pos = await chrome.tabs.sendMessage(currentTabId, { type: 'SCROLL_FOR_CROP', index: idx });
      if (!pos || !pos.ok) continue;
      // Give sticky headers & smooth layouts 180ms to settle before capturing visible tab
      await new Promise(r => setTimeout(r, 180));
      const shot = await chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB', windowId: currentWindowId });
      if (!shot || !shot.dataUrl) continue;

      issue.cropDataUrl = await cropDataUrl(shot.dataUrl, pos.viewportRect);
    } catch (_) {}
  }

  try {
    await chrome.tabs.sendMessage(currentTabId, { type: 'RESTORE_HUD_AFTER_CROP' });
  } catch (_) {}

  return enriched;
}

function cropDataUrl(dataUrl, rect) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const dpr = rect.dpr || 1;
      const pad = 34;
      const desiredW = Math.max(160, Math.round((rect.w + pad * 2) * dpr));
      const desiredH = Math.max(92, Math.round((rect.h + pad * 2) * dpr));
      const sx = Math.max(0, Math.min(img.width - desiredW, Math.round((rect.x - pad) * dpr)));
      const sy = Math.max(0, Math.min(img.height - desiredH, Math.round((rect.y - pad) * dpr)));
      const sw = Math.max(40, Math.min(img.width - sx, desiredW));
      const sh = Math.max(30, Math.min(img.height - sy, desiredH));

      const canvas = document.createElement('canvas');
      canvas.width = Math.min(480, sw);
      canvas.height = Math.round((canvas.width / sw) * sh);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

btnScan.addEventListener('click', async () => {
  showStatus('Scanning WCAG 2.2 AA geometry, focus rings & EAA layers...');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id || !tab.url || /^(chrome|edge|about|moz-extension):/i.test(tab.url)) {
    showStatus('Open any HTTP/HTTPS webpage to run a WCAG 2.2 AA audit.');
    return;
  }
  currentTabId = tab.id;
  currentWindowId = tab.windowId;

  try {
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
    document.getElementById('cnt-score').textContent = `${lastAudit.readinessScore ?? 100}%`;

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
  showStatus('Capturing crisp visual evidence & preparing report...');
  const enriched = await captureTopIssueCrops(lastAudit);
  await chrome.storage.local.set({ latestAuditReport: enriched, reportAutoAction: mode });
  chrome.tabs.create({ url: chrome.runtime.getURL(`src/report/report.html?mode=${encodeURIComponent(mode)}`) });
}

document.getElementById('btn-export-pdf').addEventListener('click', () => openReportTab('pdf'));
document.getElementById('btn-export-md').addEventListener('click', () => openReportTab('tickets'));

function openAccountOrPaywallTab() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/report/report.html?paywall=1') });
}

document.getElementById('btn-open-paywall').addEventListener('click', openAccountOrPaywallTab);
planPill.addEventListener('click', openAccountOrPaywallTab);

document.getElementById('btn-dev-unlock').addEventListener('click', async () => {
  const nextDev = !isDevOverride;
  await chrome.runtime.sendMessage({ type: 'SET_DEV_PRO_OVERRIDE', paid: nextDev });
  await refreshProStatus();
  updateProBadges();
  renderIssues();
  showStatus(isPro ? 'Dev Mode: Pro unlocked locally.' : 'Dev Mode: Switched back to Free tier.');
});

refreshProStatus();
loadBrandingInputs();
