/* global ExtPay, importScripts */
if (typeof importScripts === 'function') {
  importScripts('../vendor/ExtPay.js');
}

const EXTPAY_ID = 'wcag22-express-auditor';
const extpayRoot = ExtPay(EXTPAY_ID);
extpayRoot.startBackground();

extpayRoot.onPaid.addListener(user => {
  chrome.storage.local.set({
    proStatus: {
      paid: true,
      email: user.email || null,
      plan: (user.plan && user.plan.nickname) || 'agency_monthly',
      checkedAt: Date.now()
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'GET_PRO_STATUS') {
    const client = ExtPay(EXTPAY_ID);
    client.getUser()
      .then(async user => {
        const devFlag = await chrome.storage.local.get('extpay_dev_paid');
        const paid = Boolean(user.paid || devFlag.extpay_dev_paid);
        const status = {
          paid,
          email: user.email || null,
          plan: (user.plan && user.plan.nickname) || (paid ? 'dev_override' : null),
          checkedAt: Date.now()
        };
        await chrome.storage.local.set({ proStatus: status });
        sendResponse(status);
      })
      .catch(async () => {
        const cached = await chrome.storage.local.get('proStatus');
        sendResponse(cached.proStatus || { paid: false, offlineFallback: true });
      });
    return true;
  }

  if (msg.type === 'SET_DEV_PRO_OVERRIDE') {
    const enabled = Boolean(msg.paid);
    chrome.storage.local.set({
      extpay_dev_paid: enabled,
      proStatus: {
        paid: enabled,
        plan: enabled ? 'dev_override' : null,
        checkedAt: Date.now()
      }
    }).then(() => sendResponse({ ok: true, paid: enabled }));
    return true;
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
