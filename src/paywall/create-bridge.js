import { PAYWALL_CONFIG } from './config.js';

export function attachGlobalPaywallBridge({ AuthClient, BillingClient }) {
  const auth = new AuthClient({
    paywallId: PAYWALL_CONFIG.paywallId,
    apiOrigin: PAYWALL_CONFIG.apiOrigin
  });

  const billing = new BillingClient({
    paywallId: PAYWALL_CONFIG.paywallId,
    apiOrigin: PAYWALL_CONFIG.apiOrigin,
    auth
  });

  const accessListeners = new Set();
  const openModalListeners = new Set();

  function formatError(err) {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    const parts = [];
    if (err.status || err.statusCode) parts.push(`HTTP ${err.status || err.statusCode}`);
    if (err.code) parts.push(`[${err.code}]`);
    if (err.message) parts.push(err.message);
    else if (err.error) parts.push(typeof err.error === 'string' ? err.error : JSON.stringify(err.error));
    return parts.length ? parts.join(' ') : String(err);
  }

  function withTimeout(promise, ms, fallbackValue) {
    return Promise.race([
      Promise.resolve(promise),
      new Promise(resolve => setTimeout(() => resolve(fallbackValue), ms))
    ]);
  }

  function notifyAccess(granted, detail = {}) {
    accessListeners.forEach(fn => {
      try { fn(Boolean(granted), detail); } catch (_) {}
    });
  }

  async function ensureAuthReady() {
    try {
      if (typeof auth.ready === 'function') {
        await withTimeout(auth.ready(), 3000, null);
      }
    } catch (_) {}
  }

  function getCurrentUser() {
    try {
      if (typeof auth.getCachedUser === 'function') {
        const u = auth.getCachedUser();
        if (u && (u.email || u.id)) return u;
      }
      if (typeof auth.getCachedSession === 'function') {
        const s = auth.getCachedSession();
        if (s && s.user) return s.user;
      }
    } catch (_) {}
    return null;
  }

  // Direct uncached check against GET /api/v1/paywall/{id}/user so Stripe test payments unlock in <2s without 5-min bootstrap cache delay
  async function fetchLiveUserPaidStatus() {
    try {
      await ensureAuthReady();
      if (typeof auth.getAccessToken !== 'function') return null;
      const token = await withTimeout(auth.getAccessToken(), 4000, null);
      if (!token) return null;

      const url = `${PAYWALL_CONFIG.apiOrigin.replace(/\/+$/, '')}/api/v1/paywall/${encodeURIComponent(PAYWALL_CONFIG.paywallId)}/user`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Paywall-Id': String(PAYWALL_CONFIG.paywallId)
        },
        cache: 'no-store',
        credentials: 'omit'
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data?.paid === 'boolean') {
        const hasActiveSub = Array.isArray(data.purchases) && data.purchases.some(
          p => p && (p.status === 'active' || p.status === 'trialing' || p.status === 'paid')
        );
        return {
          granted: Boolean(data.paid || hasActiveSub),
          user: data.user || getCurrentUser(),
          purchases: data.purchases || []
        };
      }
    } catch (_) {}
    return null;
  }

  async function checkAccess(opts = {}) {
    const manifest = chrome.runtime.getManifest();
    const stored = await chrome.storage.local.get(['dev_pro_override', 'monetize_pro_unlocked']);

    if (!manifest.update_url && stored.dev_pro_override) {
      return { granted: true, source: 'dev_override', user: getCurrentUser() };
    }

    await ensureAuthReady();

    // 1. Live /user check when Bearer session exists (zero cache lag after checkout!)
    const liveUser = await fetchLiveUserPaidStatus();
    if (liveUser && typeof liveUser.granted === 'boolean') {
      await chrome.storage.local.set({ monetize_pro_unlocked: liveUser.granted });
      if (liveUser.granted) {
        notifyAccess(true, { source: 'live_user_api' });
      }
      return { granted: liveUser.granted, source: 'live_user_api', user: liveUser.user };
    }

    // 2. Fallback to BillingClient.getAccess({}) (covers active trials & SDK state)
    try {
      if (typeof billing.getAccess === 'function') {
        const acc = await withTimeout(billing.getAccess({}), 3500, null);
        if (acc && typeof acc.granted === 'boolean') {
          await chrome.storage.local.set({ monetize_pro_unlocked: acc.granted });
          return { granted: acc.granted, source: 'sdk_access', user: getCurrentUser() };
        }
      }
    } catch (_) {}

    if (!opts.skipCacheFallback && stored.monetize_pro_unlocked && getCurrentUser()) {
      return { granted: true, source: 'cache', user: getCurrentUser() };
    }

    return { granted: false, source: 'default', user: getCurrentUser() };
  }

  async function loadPrices(force = false) {
    const prices = await billing.getPrices({ force });
    if (Array.isArray(prices) && prices.length > 0) return prices;
    const boot = await billing.bootstrap();
    if (Array.isArray(boot?.prices) && boot.prices.length > 0) return boot.prices;
    if (Array.isArray(boot?.offers)) {
      return boot.offers.flatMap(o => (Array.isArray(o?.prices) ? o.prices : []));
    }
    return [];
  }

  async function sendEmailOtp(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Введите корректный Email адрес.');
    }
    await auth.sendOtp({ email: cleanEmail, createUser: true });
    return { ok: true, email: cleanEmail };
  }

  async function verifyEmailOtp(email, code) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanToken = String(code || '').trim().replace(/\s+/g, '');
    if (!cleanToken) {
      throw new Error('Введите одноразовый код из письма.');
    }
    let session;
    try {
      session = await auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'email' });
    } catch (firstErr) {
      // Fallback if first-time signup OTP requires type: 'signup'
      try {
        session = await auth.verifyOtp({ email: cleanEmail, token: cleanToken, type: 'signup' });
      } catch (_) {
        throw firstErr;
      }
    }
    const access = await checkAccess({ skipCacheFallback: true });
    notifyAccess(access.granted, { event: 'otp_verified', user: session?.user });
    return { session, access };
  }

  async function startStripeCheckout(priceId) {
    if (!priceId) {
      throw new Error('Тариф не выбран.');
    }
    await ensureAuthReady();
    const user = getCurrentUser();
    if (!user) {
      const err = new Error('AUTH_REQUIRED');
      err.code = 'AUTH_REQUIRED';
      throw err;
    }

    const idempotencyKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
      // Pass explicit https:// successUrl because chrome-extension:// URLs are rejected with HTTP 400 by /start-checkout
      const res = await billing.createCheckout({
        priceId,
        successUrl: PAYWALL_CONFIG.successRedirectUrl,
        idempotencyKey
      });
      const checkoutUrl = res?.url || res?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Сервер не вернул ссылку на оплату (checkoutUrl).');
      }
      return { checkoutUrl, sessionId: res?.sessionId, acquiring: res?.acquiring };
    } catch (err) {
      // HTTP 409 / already_purchased means user ALREADY owns an active subscription on Paywall #926!
      if (err?.status === 409 || err?.code === 'already_purchased' || err?.hasActivePurchase) {
        await chrome.storage.local.set({ monetize_pro_unlocked: true });
        notifyAccess(true, { event: 'already_purchased' });
        return { alreadyPurchased: true };
      }
      throw err;
    }
  }

  async function openCustomerPortal() {
    await ensureAuthReady();
    const token = typeof auth.getAccessToken === 'function' ? await auth.getAccessToken() : null;
    if (!token) throw new Error('Сначала войдите по Email.');

    const url = `${PAYWALL_CONFIG.apiOrigin.replace(/\/+$/, '')}/api/v1/paywall/${encodeURIComponent(PAYWALL_CONFIG.paywallId)}/get-customer-portal`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Paywall-Id': String(PAYWALL_CONFIG.paywallId)
      },
      body: '{}',
      credentials: 'omit'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) {
      throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    }
    return data.url;
  }

  async function signOut() {
    try {
      if (typeof auth.signOut === 'function') await auth.signOut();
      else if (typeof auth.logout === 'function') await auth.logout();
    } catch (_) {}
    await chrome.storage.local.set({ monetize_pro_unlocked: false });
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
      if (area === 'local' && (changes.monetize_pro_unlocked || changes.dev_pro_override)) {
        checkAccess().then(res => notifyAccess(res.granted, { event: 'storage' }));
      }
    });
  }

  window.MonetizeBridge = {
    config: PAYWALL_CONFIG,
    auth,
    billing,
    formatError,
    getCurrentUser,
    checkAccess,
    loadPrices,
    sendEmailOtp,
    verifyEmailOtp,
    startStripeCheckout,
    openCustomerPortal,
    signOut,
    openPaywall,
    onAccessChange,
    onOpenModal
  };
}
