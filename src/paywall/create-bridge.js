import { PAYWALL_CONFIG } from './config.js';

export function attachGlobalPaywallBridge(sdkModule) {
  const PaywallUIClass = sdkModule?.PaywallUI || sdkModule?.default?.PaywallUI;
  const BillingClientClass = sdkModule?.BillingClient || sdkModule?.default?.BillingClient;

  let instance = null;
  let needsFreshInstance = false;
  let lastDiag = null;

  const accessListeners = new Set();
  const diagListeners = new Set();

  function formatError(err) {
    if (!err) return 'Unknown SDK error';
    if (typeof err === 'string') return err;
    const parts = [];
    if (err.status || err.statusCode) parts.push(`HTTP ${err.status || err.statusCode}`);
    if (err.code) parts.push(`[${err.code}]`);
    if (err.message) parts.push(err.message);
    else if (err.error) parts.push(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
    if (parts.length === 0) {
      try { return JSON.stringify(err); } catch (_) { return String(err); }
    }
    return parts.join(' ');
  }

  function emitDiag(diag) {
    lastDiag = { ...diag, timestamp: Date.now() };
    diagListeners.forEach(fn => {
      try { fn(lastDiag); } catch (_) {}
    });
  }

  function notifyAccess(granted, detail = {}) {
    accessListeners.forEach(fn => {
      try { fn(granted, detail); } catch (_) {}
    });
  }

  function withTimeout(promise, ms, fallbackValue) {
    return Promise.race([
      Promise.resolve(promise),
      new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
    ]);
  }

  function resetInstance() {
    if (instance) {
      try {
        if (typeof instance.destroy === 'function') instance.destroy();
      } catch (_) {}
      instance = null;
    }
    needsFreshInstance = false;
  }

  function getPaywall() {
    if (needsFreshInstance) {
      resetInstance();
    }
    if (!instance && PaywallUIClass) {
      instance = new PaywallUIClass(PAYWALL_CONFIG);
      bindEvents(instance);
    }
    return instance;
  }

  function extractStateGranted(pw) {
    try {
      if (pw && typeof pw.getState === 'function') {
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
    if (!pw) return null;
    try {
      if (typeof pw.getAccess === 'function') {
        const acc = await withTimeout(pw.getAccess({}), 3500, null);
        if (acc && typeof acc.granted === 'boolean') return acc;
      }
    } catch (_) {}

    try {
      if (pw.billing && typeof pw.billing.getAccess === 'function') {
        const acc = await withTimeout(pw.billing.getAccess({}), 3500, null);
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
    if (!pw || typeof pw.on !== 'function') return;

    pw.on('purchase_completed', async payload => {
      await chrome.storage.local.set({
        monetize_pro_unlocked: true,
        monetize_last_purchase: payload || { completedAt: Date.now() }
      });
      emitDiag({ level: 'ok', code: 'PURCHASE_COMPLETED' });
      notifyAccess(true, { event: 'purchase_completed', payload });
    });

    pw.on('userChange', async user => {
      const res = await checkAccess({ skipCacheFallback: true });
      notifyAccess(res.granted, { event: 'userChange', user });
    });

    pw.on('authChange', async session => {
      const res = await checkAccess({ skipCacheFallback: true });
      notifyAccess(res.granted, { event: 'authChange', session });
    });

    pw.on('close', () => {
      emitDiag({ level: 'idle', code: 'CLOSED' });
    });

    pw.on('error', err => {
      console.error('[MonetizeBridge PaywallUI error]', err);
      needsFreshInstance = true;
      emitDiag({
        level: 'error',
        code: 'SDK_ERROR',
        detail: formatError(err)
      });
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

  async function diagnosePaywall() {
    if (!BillingClientClass) return null;
    try {
      const probe = new BillingClientClass({
        paywallId: PAYWALL_CONFIG.paywallId,
        apiOrigin: PAYWALL_CONFIG.apiOrigin
      });
      const boot = await withTimeout(probe.bootstrap(), 6000, '__TIMEOUT__');
      if (boot === '__TIMEOUT__') {
        needsFreshInstance = true;
        const d = {
          level: 'error',
          code: 'TIMEOUT',
          detail: 'Timeout 6s waiting for https://appbox.space'
        };
        emitDiag(d);
        return d;
      }

      const directPrices = Array.isArray(boot?.prices) ? boot.prices : null;
      const offerPrices = Array.isArray(boot?.offers)
        ? boot.offers.flatMap(o => (Array.isArray(o?.prices) ? o.prices : [o]))
        : null;
      const count = (directPrices ? directPrices.length : 0) || (offerPrices ? offerPrices.length : 0);

      if ((directPrices !== null || offerPrices !== null) && count === 0) {
        needsFreshInstance = true;
        const d = {
          level: 'warn',
          code: 'NO_PRICES',
          pricesCount: 0
        };
        emitDiag(d);
        return d;
      }

      const d = {
        level: 'ok',
        code: 'READY',
        pricesCount: count
      };
      // Only overwrite loading state (do not overwrite an explicit SDK_ERROR if one already fired)
      if (!lastDiag || lastDiag.level === 'loading' || lastDiag.level === 'idle') {
        emitDiag(d);
      }
      return d;
    } catch (err) {
      console.error('[MonetizeBridge bootstrap diagnostic error]', err);
      needsFreshInstance = true;
      const d = {
        level: 'error',
        code: 'BOOTSTRAP_ERROR',
        detail: formatError(err)
      };
      emitDiag(d);
      return d;
    }
  }

  function openPaywall(openOpts) {
    if (!PaywallUIClass) {
      emitDiag({
        level: 'error',
        code: 'MISSING_CLASS',
        detail: 'PaywallUI export missing in @monetize.software/sdk'
      });
      return;
    }

    emitDiag({ level: 'loading', code: 'OPENING' });

    try {
      const pw = getPaywall();
      // Invoke pw.open() synchronously first to preserve Chrome transient user gesture activation!
      const maybePromise = pw.open(openOpts);
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(err => {
          console.error('[MonetizeBridge pw.open rejected]', err);
          needsFreshInstance = true;
          emitDiag({
            level: 'error',
            code: 'OPEN_REJECTED',
            detail: formatError(err)
          });
        });
      }
    } catch (err) {
      console.error('[MonetizeBridge pw.open threw]', err);
      needsFreshInstance = true;
      emitDiag({
        level: 'error',
        code: 'OPEN_THREW',
        detail: formatError(err)
      });
    }

    // Run parallel bootstrap check so empty Offers ('Цены') or unsaved Paywall #926 settings surface clearly
    diagnosePaywall();
  }

  function onAccessChange(cb) {
    accessListeners.add(cb);
    return () => accessListeners.delete(cb);
  }

  function onDiagnostic(cb) {
    diagListeners.add(cb);
    if (lastDiag) {
      try { cb(lastDiag); } catch (_) {}
    }
    return () => diagListeners.delete(cb);
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.monetize_pro_unlocked || changes.dev_pro_override)) {
        checkAccess().then(res => notifyAccess(res.granted, { event: 'storage' }));
      }
    });
  }

  window.MonetizeBridge = {
    config: PAYWALL_CONFIG,
    getPaywall,
    openPaywall,
    diagnosePaywall,
    checkAccess,
    onAccessChange,
    onDiagnostic
  };
}
