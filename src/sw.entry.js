import { PAYWALL_CONFIG } from './paywall/config.js';

const NORMATIVE_CHECK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days automatic regulatory check
const BUNDLED_REGISTRY_VERSION = '2026.11.1';

try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.remove('dev_pro_override_v23');
  }
} catch (_) {}

async function checkNormativeUpdates(force = false) {
  try {
    const store = await chrome.storage.local.get('normativeRegistryState');
    const prev = store.normativeRegistryState || null;
    const now = Date.now();

    if (!force && prev && prev.lastCheckedMs && (now - prev.lastCheckedMs) < NORMATIVE_CHECK_INTERVAL_MS) {
      return { ok: true, cached: true, state: prev };
    }

    let remoteData = null;
    const workerBase = (PAYWALL_CONFIG.workerOrigin || '').replace(/\/+$/, '');
    if (workerBase && !/127\.0\.0\.1|localhost/.test(workerBase)) {
      try {
        const wRes = await fetch(`${workerBase}/normative-registry`, { cache: 'no-store' });
        if (wRes.ok) {
          remoteData = await wRes.json();
        }
      } catch (_) {}
    }

    const nextState = {
      registryVersion: remoteData?.registryVersion || prev?.registryVersion || BUNDLED_REGISTRY_VERSION,
      enStandard: remoteData?.enStandard || 'ETSI EN 301 549 V4.1.1 (2026-09)',
      eaaDirective: remoteData?.eaaDirective || 'Directive (EU) 2019/882',
      wcagStandard: remoteData?.wcagStandard || 'W3C WCAG 2.2 (ISO/IEC 40500:2025)',
      upstreamLastModified: remoteData?.upstreamLastModified || null,
      overrides: remoteData?.overrides || prev?.overrides || {},
      lastCheckedAt: new Date(now).toISOString(),
      lastCheckedMs: now,
      source: remoteData ? 'cloud_registry' : 'embedded_verified_baseline'
    };

    await chrome.storage.local.set({ normativeRegistryState: nextState });
    return { ok: true, cached: false, state: nextState };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    try { chrome.storage.local.remove('dev_pro_override_v23'); } catch (_) {}
    checkNormativeUpdates(false);
  });
}

// Trigger silent 7-day periodic check when service worker wakes up
checkNormativeUpdates(false);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'CHECK_NORMATIVE_UPDATES') {
    checkNormativeUpdates(Boolean(msg.force)).then(res => sendResponse(res));
    return true;
  }

  if (msg.type === 'CAPTURE_VISIBLE_TAB') {
    const winId = msg.windowId ?? (sender.tab ? sender.tab.windowId : null);
    chrome.tabs.captureVisibleTab(winId, { format: 'png' }, dataUrl => {
      if (chrome.runtime.lastError) {
        sendResponse({ dataUrl: null, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl: dataUrl || null });
      }
    });
    return true;
  }

  if (msg.type === 'OPEN_REPORT_FROM_PAGE') {
    const mode = msg.mode || 'pdf';
    const savePromise = msg.audit
      ? chrome.storage.local.set({ latestAuditReport: msg.audit, reportAutoAction: mode })
      : Promise.resolve();
    savePromise.then(() => {
      const targetUrl = mode === 'paywall'
        ? chrome.runtime.getURL('src/report/report.html?paywall=1')
        : chrome.runtime.getURL(`src/report/report.html?mode=${encodeURIComponent(mode)}`);
      chrome.tabs.create({ url: targetUrl });
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
