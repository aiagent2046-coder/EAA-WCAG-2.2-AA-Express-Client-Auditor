/**
 * Direct 1-Click Stripe Checkout Proxy for Monetize.software SDK v3 (Headless API).
 * Eliminates client-side AuthClient registration & broken Default-domain confirmation emails:
 * Buyer enters email -> POST /checkout -> straight to Stripe Checkout -> GET /status unlocks Pro!
 */

const DEFAULT_PAYWALL_ID = '926';
const DEFAULT_API_ORIGIN = 'https://appbox.space';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

// Lightweight in-memory per-IP rate limiter for /status & /checkout (30 req / 60s per IP)
const ipBuckets = new Map();
function checkRateLimit(ip, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const entry = ipBuckets.get(ip);
  if (!entry || now - entry.start > windowMs) {
    ipBuckets.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function htmlResp(title, badgeColor, heading, bodyText) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#f8fafc; font:400 15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:20px; }
    .card { max-width:460px; background:#1e293b; border:1px solid #334155; border-radius:14px; padding:28px 30px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
    .dot { display:inline-block; width:12px; height:12px; border-radius:50%; background:${badgeColor}; margin-bottom:12px; }
    h1 { margin:0 0 10px; font-size:21px; }
    p { margin:0; color:#cbd5e1; font-size:14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="dot"></div>
    <h1>${heading}</h1>
    <p>${bodyText}</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function queryMonetizeUser(apiOrigin, paywallId, apiKey, email, clientIp) {
  const headers = {
    'X-Api-Key': apiKey,
    'X-Paywall-Id': String(paywallId)
  };
  if (clientIp) headers['X-Client-Ip'] = clientIp;

  const url = `${apiOrigin}/api/v1/paywall/${encodeURIComponent(paywallId)}/user?email=${encodeURIComponent(email)}`;
  const res = await fetch(url, { method: 'GET', headers });

  if (res.status === 404) {
    return { ok: true, paid: false, purchases: [] };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, status: res.status, error: data?.message || data?.error || `HTTP ${res.status}` };
  }

  const purchases = Array.isArray(data?.purchases) ? data.purchases : [];
  const hasActiveSub = purchases.some(p => p && ['active', 'trialing', 'paid'].includes(String(p.status).toLowerCase()));
  return {
    ok: true,
    paid: Boolean(data?.paid === true || hasActiveSub),
    purchases
  };
}

export default {
  async fetch(request, env = {}) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const paywallId = String(env.PAYWALL_ID || DEFAULT_PAYWALL_ID);
    const apiOrigin = String(env.MONETIZE_API_ORIGIN || DEFAULT_API_ORIGIN).replace(/\/+$/, '');
    const apiKey = String(env.MONETIZE_API_KEY || '').trim();
    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Real-IP') || 'local';

    if (request.method === 'GET' && path === '/paid-success') {
      return htmlResp(
        'Payment Confirmed — WCAG 2.2 AA Auditor',
        '#10b981',
        'Оплата подтверждена / Payment Confirmed',
        'Вернитесь на открытую вкладку отчета WCAG 2.2 AA & EAA Express Client Auditor — Pro-экспорт разблокируется автоматически в течение пары секунд. Эту вкладку можно закрыть.'
      );
    }

    if (request.method === 'GET' && path === '/paid-cancel') {
      return htmlResp(
        'Checkout Cancelled',
        '#f59e0b',
        'Оплата отменена / Checkout Cancelled',
        'Платеж не был списан. Вы можете закрыть эту вкладку и вернуться к отчету в любой момент.'
      );
    }

    if (request.method === 'GET' && (path === '/' || path === '/health')) {
      return jsonResp({
        ok: true,
        service: 'wcag22-monetize-direct-proxy',
        paywallId,
        apiOrigin,
        hasApiKey: Boolean(apiKey)
      });
    }

    if (request.method === 'GET' && path === '/normative-registry') {
      let upstreamLastModified = null;
      try {
        const w3Res = await fetch('https://www.w3.org/TR/WCAG22/', { method: 'HEAD' });
        upstreamLastModified = w3Res.headers.get('last-modified') || null;
      } catch (_) {}
      return jsonResp({
        ok: true,
        registryVersion: '2026.11.1',
        enStandard: 'ETSI EN 301 549 V4.1.1 (2026-09)',
        eaaDirective: 'Directive (EU) 2019/882 (CELEX:32019L0882)',
        wcagStandard: 'W3C WCAG 2.2 (ISO/IEC 40500:2025)',
        upstreamLastModified,
        checkedAt: new Date().toISOString(),
        overrides: {}
      });
    }

    if (!checkRateLimit(clientIp)) {
      return jsonResp({ ok: false, error: 'Too many requests, please wait a minute.' }, 429);
    }

    // 1. Public bootstrap prices (works even before MONETIZE_API_KEY is set)
    if (request.method === 'GET' && path === '/prices') {
      const bootRes = await fetch(`${apiOrigin}/api/v1/paywall/${encodeURIComponent(paywallId)}/bootstrap`, {
        method: 'GET',
        headers: { 'X-Paywall-Id': paywallId }
      });
      const boot = await bootRes.json().catch(() => ({}));
      if (!bootRes.ok) {
        return jsonResp({ ok: false, error: boot?.message || boot?.error || `Bootstrap HTTP ${bootRes.status}` }, bootRes.status);
      }
      const prices = Array.isArray(boot?.prices) && boot.prices.length > 0
        ? boot.prices
        : (Array.isArray(boot?.offers) ? boot.offers.flatMap(o => (Array.isArray(o?.prices) ? o.prices : [])) : []);
      return jsonResp({ ok: true, prices, name: boot?.settings?.name || 'Express Client Auditor Pro' });
    }

    // All user-scoped endpoints below require server-side MONETIZE_API_KEY
    if (!apiKey) {
      return jsonResp({
        ok: false,
        code: 'MISSING_API_KEY',
        error: 'На сервере прокси не задан MONETIZE_API_KEY. Добавьте ключ из Monetize.software → Settings → API keys в paywall-worker/.env (локально) или wrangler secret put MONETIZE_API_KEY (Cloudflare).'
      }, 500);
    }

    // 2. Direct 1-Click Stripe Checkout (NO email confirmation link required!)
    if (request.method === 'POST' && path === '/checkout') {
      const body = await request.json().catch(() => ({}));
      const cleanEmail = String(body?.email || '').trim().toLowerCase();
      const priceId = String(body?.priceId || '').trim();

      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Введите корректный Email адрес.' }, 400);
      }
      if (!priceId) {
        return jsonResp({ ok: false, error: 'Не выбран тариф (priceId).' }, 400);
      }

      // First check if this email ALREADY has an active subscription so we never double-charge!
      const existing = await queryMonetizeUser(apiOrigin, paywallId, apiKey, cleanEmail, clientIp);
      if (existing.ok && existing.paid) {
        return jsonResp({ ok: true, alreadyPurchased: true, paid: true });
      }

      // Stripe / Monetize start-checkout requires https:// URLs in production; use Worker's own /paid-success when https, or fallback https URL on local http
      const isHttpsWorker = url.protocol === 'https:';
      const successUrl = isHttpsWorker ? `${url.origin}/paid-success` : 'https://comparetwotexts.pro/?wcag_pro_paid=1';
      const errorUrl = isHttpsWorker ? `${url.origin}/paid-cancel` : 'https://comparetwotexts.pro/?wcag_pro_cancelled=1';
      const idemKey = crypto.randomUUID();

      const coRes = await fetch(`${apiOrigin}/api/v1/paywall/${encodeURIComponent(paywallId)}/start-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Paywall-Id': paywallId,
          'Idempotency-Key': idemKey
        },
        body: JSON.stringify({
          email: cleanEmail,
          priceId,
          successUrl,
          errorUrl,
          ignoreActivePurchase: false,
          userMeta: { source: 'wcag22_extension_direct' }
        })
      });

      const coData = await coRes.json().catch(() => ({}));
      if (coRes.status === 409 || coData?.hasActivePurchase) {
        return jsonResp({ ok: true, alreadyPurchased: true, paid: true });
      }
      if (!coRes.ok) {
        return jsonResp({
          ok: false,
          error: coData?.message || coData?.error || `start-checkout HTTP ${coRes.status}`
        }, coRes.status);
      }

      const checkoutUrl = coData?.checkoutUrl || coData?.url;
      if (!checkoutUrl) {
        return jsonResp({ ok: false, error: 'Monetize.software не вернул checkoutUrl.' }, 502);
      }
      return jsonResp({
        ok: true,
        checkoutUrl,
        userId: coData?.userId || null,
        acquiring: coData?.acquiring || 'stripe'
      });
    }

    // 3. Check Paid Status by Email
    if (request.method === 'GET' && path === '/status') {
      const cleanEmail = String(url.searchParams.get('email') || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Введите корректный Email адрес.' }, 400);
      }
      const status = await queryMonetizeUser(apiOrigin, paywallId, apiKey, cleanEmail, clientIp);
      if (!status.ok) {
        return jsonResp({ ok: false, error: status.error }, status.status || 502);
      }
      return jsonResp({ ok: true, paid: status.paid, purchases: status.purchases });
    }

    // 4. Customer Portal URL by Email
    if (request.method === 'POST' && path === '/portal') {
      const body = await request.json().catch(() => ({}));
      const cleanEmail = String(body?.email || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Введите корректный Email адрес.' }, 400);
      }
      const pRes = await fetch(`${apiOrigin}/api/v1/paywall/${encodeURIComponent(paywallId)}/get-customer-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Paywall-Id': paywallId
        },
        body: JSON.stringify({ email: cleanEmail })
      });
      const pData = await pRes.json().catch(() => ({}));
      if (!pRes.ok || !pData?.url) {
        return jsonResp({ ok: false, error: pData?.message || pData?.error || `Portal HTTP ${pRes.status}` }, pRes.status);
      }
      return jsonResp({ ok: true, url: pData.url });
    }

    return jsonResp({ ok: false, error: `Route not found: ${request.method} ${path}` }, 404);
  }
};
