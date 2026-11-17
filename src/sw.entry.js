import { installRouter } from '@monetize.software/sdk-extension/sw';

installRouter({
  offscreenUrl: chrome.runtime.getURL('src/offscreen/offscreen.html')
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'SET_DEV_PRO_OVERRIDE') {
    const enabled = Boolean(msg.paid);
    chrome.storage.local.set({ dev_pro_override: enabled })
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

  return false;
});
