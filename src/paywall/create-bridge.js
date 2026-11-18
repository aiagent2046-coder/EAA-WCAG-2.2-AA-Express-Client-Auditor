import { PAYWALL_CONFIG } from './config.js';

export function attachGlobalPaywallBridge() {
  const accessListeners = new Set();
  const openModalListeners = new Set();

  function formatError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    if (err.message === 'Failed to fetch' || /NetworkError/i.test(String(err.message))) {
      const isLocal = /127\.0\.0\.1|localhost/.test(PAYWALL_CONFIG.workerOrigin);
      return isLocal
        ? 'Платежный прокси пока настроен на локальный адрес (127.0.0.1:8787). Для продакшн-работы выполните ./deploy_cloud_worker.sh либо запустите локальный прокси (npm run start:proxy).'
        : 'Не удалось связаться с сервером оплаты. Проверьте подключение к интернету и повторите попытку через несколько секунд.';
    }
    return err.message || err.error || String(err);
  }

  function notifyAccess(granted, detail = {}) {
    accessListeners.forEach(fn => {
      try { fn(Boolean(granted), detail); } catch (_) {}
    });
  }

  async function getStoredBillingState() {
    const local = await chrome.storage.local.get(['billing_email', 'monetize_paid_verified']);
    let syncEmail = null;
    try {
      if (chrome.storage.sync) {
        const s = await chrome.storage.sync.get(['billing_email']);
        syncEmail = s?.billing_email || null;
      }
    } catch (_) {}
    return {
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
    const state = await getStoredBillingState();
    const emailToCheck = String(opts.email || state.email || '').trim().toLowerCase();
    if (!emailToCheck) {
      return { granted: false, source: 'no_email', email: '' };
    }

    try {
      const status = await fetchWorkerJson(`/status?email=${encodeURIComponent(emailToCheck)}`, { method: 'GET' });
      const isPaid = Boolean(status?.paid === true);
      await saveBillingState(emailToCheck, isPaid);
      if (isPaid) {
        notifyAccess(true, { source: 'worker_status', email: emailToCheck });
      }
      return { granted: isPaid, source: 'worker_status', email: emailToCheck };
    } catch (err) {
      if (opts.throwOnError) throw err;
      if (!opts.skipCacheFallback && state.cachedPaid) {
        return { granted: true, source: 'verified_cache', email: emailToCheck };
      }
      return { granted: false, source: 'offline_unpaid', email: emailToCheck };
    }
  }

  async function startStripeCheckout(email, priceId) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error('Введите корректный Email адрес для квитанции и привязки подписки.');
    }
    if (!priceId) {
      throw new Error('Тариф не выбран.');
    }

    await saveBillingState(cleanEmail, false);

    const data = await fetchWorkerJson('/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, priceId })
    });

    if (data?.alreadyPurchased || data?.paid) {
      await saveBillingState(cleanEmail, true);
      notifyAccess(true, { event: 'already_purchased', email: cleanEmail });
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
    notifyAccess(res.granted, { event: 'restore_check', email: cleanEmail });
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
    await chrome.storage.local.remove(['billing_email', 'monetize_paid_verified', 'dev_pro_override_v23']);
    try {
      if (chrome.storage.sync) await chrome.storage.sync.remove(['billing_email']);
    } catch (_) {}
    notifyAccess(false, { event: 'signout' });
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
      if (area === 'local' && changes.monetize_paid_verified) {
        checkAccess().then(res => notifyAccess(res.granted, { event: 'storage' }));
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
