import { PAYWALL_CONFIG } from './config.js';

export function attachGlobalPaywallBridge() {
  const accessListeners = new Set();
  const openModalListeners = new Set();

  function formatError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message === 'Failed to fetch' || /NetworkError/i.test(String(err.message))) {
      return `Нет связи с платежным прокси (${PAYWALL_CONFIG.workerOrigin}). Запустите в терминале: npm run start:proxy (предварительно указав MONETIZE_API_KEY в paywall-worker/.env) либо задеплойте Cloudflare Worker.`;
    }
    return err.message || err.error || String(err);
  }

  function notifyAccess(granted, detail = {}) {
    accessListeners.forEach(fn => {
      try { fn(Boolean(granted), detail); } catch (_) {}
    });
  }

  async function getStoredBillingState() {
    const local = await chrome.storage.local.get(['dev_pro_override_v23', 'billing_email', 'monetize_paid_verified']);
    let syncEmail = null;
    try {
      if (chrome.storage.sync) {
        const s = await chrome.storage.sync.get(['billing_email']);
        syncEmail = s?.billing_email || null;
      }
    } catch (_) {}
    return {
      devOverride: Boolean(local.dev_pro_override_v23),
      email: local.billing_email || syncEmail || '',
      cachedPaid: Boolean(local.monetize_paid_verified)
    };
  }

  async function saveBillingState(email, paid) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const payload = { monetize_paid_verified: Boolean(paid) };
    if (cleanEmail) payload.billing_email = cleanEmail;
    await chrome.storage.local.set(payload);
    if (cleanEmail) {
      try {
        if (chrome.storage.sync) await chrome.storage.sync.set({ billing_email: cleanEmail });
      } catch (_) {}
    }
  }

  async function fetchWorkerJson(path, opts = {}) {
    const base = PAYWALL_CONFIG.workerOrigin.replace(/\/+$/, '');
    const res = await fetch(`${base}${path}`, {
      ...opts,
      cache: 'no-store',
      credentials: 'omit'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      const e = new Error(data?.error || `HTTP ${res.status}`);
      e.code = data?.code || `HTTP_${res.status}`;
      throw e;
    }
    return data;
  }

  // Loads live prices from Worker (/prices), falling back directly to public appbox.space bootstrap so $10/month card renders even before proxy starts!
  async function loadPrices() {
    try {
      const data = await fetchWorkerJson('/prices', { method: 'GET' });
      if (Array.isArray(data?.prices) && data.prices.length > 0) return data.prices;
    } catch (_) {}

    const bootUrl = `${PAYWALL_CONFIG.apiOrigin.replace(/\/+$/, '')}/api/v1/paywall/${encodeURIComponent(PAYWALL_CONFIG.paywallId)}/bootstrap`;
    const res = await fetch(bootUrl, {
      method: 'GET',
      headers: { 'X-Paywall-Id': String(PAYWALL_CONFIG.paywallId) },
      cache: 'no-store',
      credentials: 'omit'
    });
    const boot = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(boot?.message || boot?.error || `Bootstrap HTTP ${res.status}`);
    }
    if (Array.isArray(boot?.prices) && boot.prices.length > 0) return boot.prices;
    if (Array.isArray(boot?.offers)) {
      return boot.offers.flatMap(o => (Array.isArray(o?.prices) ? o.prices : []));
    }
    return [];
  }

  async function checkAccess(opts = {}) {
    const manifest = chrome.runtime.getManifest();
    const state = await getStoredBillingState();

    if (!manifest.update_url && state.devOverride) {
      return { granted: true, devOverride: true, source: 'dev_override', email: state.email };
    }

    const emailToCheck = String(opts.email || state.email || '').trim().toLowerCase();
    if (!emailToCheck) {
      return { granted: false, devOverride: false, source: 'no_email', email: '' };
    }

    try {
      const status = await fetchWorkerJson(`/status?email=${encodeURIComponent(emailToCheck)}`, { method: 'GET' });
      const isPaid = Boolean(status?.paid === true);
      await saveBillingState(emailToCheck, isPaid);
      if (isPaid) {
        notifyAccess(true, { source: 'worker_status', email: emailToCheck, devOverride: false });
      }
      return { granted: isPaid, devOverride: false, source: 'worker_status', email: emailToCheck };
    } catch (err) {
      if (opts.throwOnError) throw err;
      if (!opts.skipCacheFallback && state.cachedPaid) {
        return { granted: true, devOverride: false, source: 'verified_cache', email: emailToCheck };
      }
      return { granted: false, devOverride: false, source: 'offline_unpaid', email: emailToCheck };
    }
  }

  // 1-Click Direct Stripe Checkout — ZERO confirmation emails!
  async function startStripeCheckout(email, priceId) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Введите корректный Email адрес для квитанции и привязки подписки.');
    }
    if (!priceId) {
      throw new Error('Тариф не выбран.');
    }

    // Save email right away so auto-polling knows which email is checking out
    await saveBillingState(cleanEmail, false);

    const data = await fetchWorkerJson('/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, priceId })
    });

    if (data?.alreadyPurchased || data?.paid) {
      await saveBillingState(cleanEmail, true);
      notifyAccess(true, { event: 'already_purchased', email: cleanEmail, devOverride: false });
      return { alreadyPurchased: true, email: cleanEmail };
    }

    return {
      checkoutUrl: data.checkoutUrl,
      email: cleanEmail,
      acquiring: data.acquiring || 'stripe'
    };
  }

  async function restorePurchaseByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Введите Email, на который оформлялась подписка.');
    }
    const res = await checkAccess({ email: cleanEmail, skipCacheFallback: true, throwOnError: true });
    notifyAccess(res.granted, { event: 'restore_check', email: cleanEmail, devOverride: res.devOverride });
    return res;
  }

  async function openCustomerPortal() {
    const state = await getStoredBillingState();
    if (!state.email) throw new Error('Email подписки не найден.');
    const data = await fetchWorkerJson('/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: state.email })
    });
    return data.url;
  }

  async function signOut() {
    await chrome.storage.local.remove(['billing_email', 'monetize_paid_verified']);
    try {
      if (chrome.storage.sync) await chrome.storage.sync.remove(['billing_email']);
    } catch (_) {}
    notifyAccess(false, { event: 'signout', devOverride: false });
  }

  function openPaywall(opts = {}) {
    openModalListeners.forEach(fn => {
      try { fn(opts); } catch (_) {}
    });
  }

  function onAccessChange(cb) {
    accessListeners.add(cb);
    return () => accessListeners.delete(cb);
  }

  function onOpenModal(cb) {
    openModalListeners.add(cb);
    return () => openModalListeners.delete(cb);
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.monetize_paid_verified || changes.dev_pro_override_v23)) {
        checkAccess().then(res => notifyAccess(res.granted, { event: 'storage', devOverride: res.devOverride }));
      }
    });
  }

  window.MonetizeBridge = {
    config: PAYWALL_CONFIG,
    formatError,
    getStoredBillingState,
    checkAccess,
    loadPrices,
    startStripeCheckout,
    restorePurchaseByEmail,
    openCustomerPortal,
    signOut,
    openPaywall,
    onAccessChange,
    onOpenModal
  };
}
