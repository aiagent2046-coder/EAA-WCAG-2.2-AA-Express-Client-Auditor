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
const chkHud = document.getElementById('chk-hud');
const chkWarnHud = document.getElementById('chk-warn-hud');
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
    empty.textContent = 'Zero violations in this filter.';
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
      if (currentTabId) {
        chrome.tabs.sendMessage(currentTabId, { type: 'HIGHLIGHT_ISSUE', index: idx });
      }
    });

    issuesList.appendChild(card);
  });
}

async function captureTopIssueCrops(audit, maxCrops = 10) {
  const enriched = structuredClone(audit);
  if (!currentTabId) return enriched;

  const targets = enriched.issues
    .map((issue, idx) => ({ issue, idx }))
    .filter(x => x.issue.severity === 'fail')
    .slice(0, maxCrops);

  for (const { issue, idx } of targets) {
    try {
      const pos = await chrome.tabs.sendMessage(currentTabId, { type: 'SCROLL_FOR_CROP', index: idx });
      if (!pos || !pos.ok) continue;
      await new Promise(r => setTimeout(r, 110));
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
      const pad = 28;
      const sx = Math.max(0, Math.round((rect.x - pad) * dpr));
      const sy = Math.max(0, Math.round((rect.y - pad) * dpr));
      const sw = Math.min(img.width - sx, Math.max(140, Math.round((rect.w + pad * 2) * dpr)));
      const sh = Math.min(img.height - sy, Math.max(84, Math.round((rect.h + pad * 2) * dpr)));

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
  showStatus('Scanning DOM geometry & focus layers...');

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
    lastAudit = injected && injected[0] && injected[0].result;
    if (!lastAudit) throw new Error('Scanner returned empty result');

    if (chkWarnHud.checked) {
      chrome.tabs.sendMessage(tab.id, { type: 'SET_HUD_WARNINGS', showWarnings: true });
    }

    await chrome.storage.local.set({ latestAuditReport: lastAudit });

    document.getElementById('cnt-fail').textContent = String(lastAudit.counts.fail);
    document.getElementById('cnt-warn').textContent = String(lastAudit.counts.warning);
    document.getElementById('cnt-manual').textContent = String(lastAudit.counts.manual);
    document.getElementById('cnt-nodes').textContent = String(lastAudit.counts.checkedNodes);

    showStatus(`Scanned in ${lastAudit.durationMs} ms · ${lastAudit.viewport}`);
    resultsPanel.hidden = false;
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

// Open full-tab report preview; if user is Free, report.html opens PaywallUI #926 in full desktop Shadow DOM (survives OTP/OAuth tab switching!)
async function openReportTab(mode) {
  if (!lastAudit) return;
  showStatus('Preparing client report...');
  const enriched = await captureTopIssueCrops(lastAudit);
  await chrome.storage.local.set({ latestAuditReport: enriched, reportAutoAction: mode });
  chrome.tabs.create({ url: chrome.runtime.getURL(`src/report/report.html?mode=${encodeURIComponent(mode)}`) });
}

document.getElementById('btn-export-pdf').addEventListener('click', () => openReportTab('pdf'));
document.getElementById('btn-export-md').addEventListener('click', () => openReportTab('tickets'));

// Opening Paywall / Account in a full tab ensures Email OTP & OAuth popups never close the extension UI
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
