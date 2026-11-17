chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'SET_DEV_PRO_OVERRIDE') {
    const enabled = Boolean(msg.paid);
    chrome.storage.local.set({ dev_pro_override_v23: enabled })
      .then(() => sendResponse({ ok: true, paid: enabled }));
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
