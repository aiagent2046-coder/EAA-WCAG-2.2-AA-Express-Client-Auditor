import { PAYWALL_CONFIG } from './config.js';

export function attachGlobalPaywallBridge(PaywallUIClass) {
  let instance = null;
  const listeners = new Set();

  function getPaywall() {
    if (!instance) {
      instance = new PaywallUIClass(PAYWALL_CONFIG);
      bindEvents(instance);
    }
    return instance;
  }

  function notify(granted, detail = {}) {
    listeners.forEach(fn => {
      try { fn(granted, detail); } catch (_) {}
    });
  }

  function extractStateGranted(pw) {
    try {
      if (typeof pw.getState === 'function') {
        const st = pw.getState();
        if (!st) return null;
        if (typeof st.access?.granted === 'boolean') return st.access.granted;
        if (st.user?.hasActiveSubscription || st.user?.paid || st.user?.isSubscribed) return true;
        if (Array.isArray(st.user?.subscriptions) && st.user.subscriptions.some(s => s.status === 'active' || s.status === 'trialing')) {
          return true;
        }
        if (Array.isArray(st.purchases) && st.purchases.length > 0) return true;
      }
    } catch (_) {}
    return null;
  }

  async function queryRemoteAccess(pw) {
    try {
      if (typeof pw.getAccess === 'function') {
        const acc = await pw.getAccess({});
        if (acc && typeof acc.granted === 'boolean') return acc;
      }
    } catch (_) {}

    try {
      if (pw.billing && typeof pw.billing.getAccess === 'function') {
        const acc = await pw.billing.getAccess({});
        if (acc && typeof acc.granted === 'boolean') return acc;
      }
    } catch (_) {}

    const fromState = extractStateGranted(pw);
    if (typeof fromState === 'boolean') {
      return { granted: fromState };
    }
    return null;
  }

  function bindEvents(pw) {
    if (typeof pw.on !== 'function') return;

    pw.on('purchase_completed', async payload => {
      await chrome.storage.local.set({
        monetize_pro_unlocked: true,
        monetize_last_purchase: payload || { completedAt: Date.now() }
      });
      notify(true, { event: 'purchase_completed', payload });
    });

    pw.on('userChange', async user => {
      const res = await checkAccess({ skipCacheFallback: true });
      notify(res.granted, { event: 'userChange', user });
    });

    pw.on('authChange', async session => {
      const res = await checkAccess({ skipCacheFallback: true });
      notify(res.granted, { event: 'authChange', session });
    });
  }

  async function checkAccess(opts = {}) {
    const manifest = chrome.runtime.getManifest();
    const stored = await chrome.storage.local.get(['dev_pro_override', 'monetize_pro_unlocked']);

    if (!manifest.update_url && stored.dev_pro_override) {
      return { granted: true, source: 'dev_override' };
    }

    const pw = getPaywall();
    const remote = await queryRemoteAccess(pw);
    if (remote && typeof remote.granted === 'boolean') {
      await chrome.storage.local.set({ monetize_pro_unlocked: remote.granted });
      return { granted: remote.granted, source: 'sdk' };
    }

    if (!opts.skipCacheFallback && stored.monetize_pro_unlocked) {
      return { granted: true, source: 'cache' };
    }

    return { granted: false, source: 'default' };
  }

  function openPaywall(openOpts) {
    const pw = getPaywall();
    return pw.open(openOpts);
  }

  function onAccessChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.monetize_pro_unlocked || changes.dev_pro_override)) {
        checkAccess().then(res => notify(res.granted, { event: 'storage' }));
      }
    });
  }

  window.MonetizeBridge = {
    config: PAYWALL_CONFIG,
    getPaywall,
    openPaywall,
    checkAccess,
    onAccessChange
  };
}
