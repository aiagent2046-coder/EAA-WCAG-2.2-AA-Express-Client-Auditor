/**
 * Unified Lava.top API v3 + Shared Cloudflare KV Billing Proxy
 * Compatible out-of-the-box with published Chrome Web Store extensions:
 *   - EAA & WCAG 2.2 AA Express Client Auditor (v1.1.6, febjnnmdgkocmamecnmcggcnfdpopmfi)
 *   - EU E-Commerce 2026 Compliance Auditor (v1.0.1, lfffiblanidlhjcioehmnbnghpkhoadn)
 */

const LAVA_API_ORIGIN = 'https://gate.lava.top';
const DEFAULT_OFFERS = [{"offerId": "b67dc1e1-0a63-4fc0-86be-dd9e53d6c2bf", "name": "Agency Pro Suite", "currency": "USD", "amount": 10, "periodicity": "ONE_TIME"}, {"offerId": "b67dc1e1-0a63-4fc0-86be-dd9e53d6c2bf", "name": "Agency Pro Suite", "currency": "EUR", "amount": 10, "periodicity": "ONE_TIME"}, {"offerId": "b67dc1e1-0a63-4fc0-86be-dd9e53d6c2bf", "name": "Agency Pro Suite", "currency": "RUB", "amount": 950, "periodicity": "ONE_TIME"}];
const SERVICE_NAME = 'wcag22-paywall-proxy';
const SUPPORT_EMAIL = 'aiagent2046@gmail.com';

const EURO_COUNTRIES = new Set([
  'AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK'
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
  'Access-Control-Max-Age': '86400'
};

const ipBuckets = new Map();
function checkRateLimit(ip, limit = 40, windowMs = 60_000) {
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

function htmlResp(title, badgeColor, heading, bodyHtml) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f172a; color:#f8fafc; font:400 15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:20px; }
    .card { max-width:500px; width:100%; background:#1e293b; border:1px solid #334155; border-radius:14px; padding:28px 30px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.4); }
    .dot { display:inline-block; width:12px; height:12px; border-radius:50%; background:${badgeColor}; margin-bottom:12px; }
    h1 { margin:0 0 10px; font-size:21px; }
    p { margin:0 0 12px; color:#cbd5e1; font-size:14px; }
    a.btn, button.btn { display:inline-block; margin-top:8px; padding:10px 18px; border-radius:8px; border:1px solid #475569; background:#0f172a; color:#f8fafc; text-decoration:none; font-weight:600; font-size:14px; cursor:pointer; }
    button.btn-danger { border-color:#ef4444; color:#fca5a5; }
    .meta { font-family:monospace; font-size:12.5px; color:#94a3b8; background:#0f172a; padding:8px 12px; border-radius:8px; margin:12px 0; word-break:break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="dot"></div>
    <h1>${heading}</h1>
    ${bodyHtml}
  </div>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function timingSafeEqualStr(a, b) {
  const sa = String(a || '');
  const sb = String(b || '');
  if (!sa || !sb || sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i++) {
    diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isRecordActive(rec) {
  if (!rec || typeof rec !== 'object') return false;
  if (rec.paid === true) {
    if (rec.willExpireAt) {
      const exp = Date.parse(rec.willExpireAt);
      if (!Number.isNaN(exp) && exp < Date.now()) return false;
    }
    return true;
  }
  return false;
}

async function verifyInvoiceAtLava(apiKey, invoiceId) {
  if (!apiKey || !invoiceId) return null;
  for (const ver of ['v2', 'v1']) {
    try {
      const r = await fetch(`${LAVA_API_ORIGIN}/api/${ver}/invoices/${encodeURIComponent(invoiceId)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
      });
      if (!r.ok) continue;
      const d = await r.json().catch(() => ({}));
      const st = String(d?.status || d?.invoiceStatus || '').toLowerCase();
      if (['completed', 'paid', 'success', 'succeeded', 'active'].includes(st)) {
        return {
          paid: true,
          email: String(d?.buyer?.email || d?.email || d?.customerEmail || '').trim().toLowerCase(),
          contractId: d?.id || d?.contractId || invoiceId
        };
      }
    } catch (_) {}
  }
  return null;
}

function buildSortedPrices(countryCode) {
  const cc = String(countryCode || '').toUpperCase();
  const preferred = (cc === 'RU' || cc === 'BY') ? 'RUB' : (EURO_COUNTRIES.has(cc) ? 'EUR' : 'USD');

  const mapped = DEFAULT_OFFERS.map(o => {
    const isSub = o.periodicity && o.periodicity !== 'ONE_TIME';
    const interval = o.periodicity === 'PERIOD_YEAR' || o.periodicity === 'YEARLY' ? 'year' : (isSub ? 'month' : 'license');
    const curLabel = o.currency === 'RUB' ? 'Карты РФ и СБП' : (o.currency === 'EUR' ? 'EU Cards & PayPal' : 'International Cards & PayPal');
    return {
      id: `${o.currency}::${o.periodicity || 'ONE_TIME'}::${o.offerId}`,
      offerId: o.offerId,
      name: `${o.name} (${curLabel})`,
      currency: o.currency,
      amount: o.amount,
      interval
    };
  });

  mapped.sort((a, b) => {
    const score = x => (x.currency === preferred ? 0 : (x.currency === 'USD' ? 1 : (x.currency === 'EUR' ? 2 : 3)));
    return score(a) - score(b);
  });
  return mapped;
}

export default {
  async fetch(request, env = {}) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const apiKey = String(env.LAVA_API_KEY || '').trim();
    const webhookSecret = String(env.LAVA_WEBHOOK_SECRET || '').trim();
    const clientIp = request.headers.get('CF-Connecting-IP') || 'local';
    const country = request.cf?.country || '';

    // 0. Post-payment redirect pages (Lava appends ?invoiceId=...&status=...)
    if (request.method === 'GET' && path === '/paid-success') {
      const invoiceId = String(url.searchParams.get('invoiceId') || '').trim();
      if (invoiceId && env.SUBS_KV && apiKey) {
        const invMeta = await env.SUBS_KV.get(`inv:${invoiceId}`, 'json').catch(() => null);
        const verified = await verifyInvoiceAtLava(apiKey, invoiceId);
        const targetEmail = verified?.email || invMeta?.email || '';
        if (verified?.paid && isValidEmail(targetEmail)) {
          await env.SUBS_KV.put(`sub:${targetEmail}`, JSON.stringify({
            email: targetEmail,
            paid: true,
            status: 'active',
            contractId: verified.contractId || invoiceId,
            invoiceId,
            updatedAt: new Date().toISOString(),
            source: 'return_verified_api'
          }));
        }
      }
      return htmlResp(
        'Payment Confirmed — Agency Pro',
        '#10b981',
        'Оплата получена / Payment Confirmed',
        '<p>Вернитесь на открытую вкладку отчёта расширения в браузере — функции <strong>Agency Pro</strong> разблокируются автоматически по вашему Email в течение пары секунд.</p><p>Return to your open Chrome extension report tab — Pro exports unlock automatically.</p>'
      );
    }

    if (request.method === 'GET' && path === '/paid-cancel') {
      return htmlResp(
        'Checkout Cancelled',
        '#f59e0b',
        'Оплата не завершена / Checkout Cancelled',
        '<p>Средства не были списаны. Вы можете закрыть эту вкладку и вернуться к отчёту расширения в любой момент.</p>'
      );
    }

    // 1. Health & Normative Registry
    if (request.method === 'GET' && (path === '/' || path === '/health')) {
      return jsonResp({
        ok: true,
        service: SERVICE_NAME,
        billingProvider: 'lava.top',
        hasApiKey: Boolean(apiKey),
        hasWebhookSecret: Boolean(webhookSecret),
        hasSubsKv: Boolean(env.SUBS_KV),
        offersCount: DEFAULT_OFFERS.length
      });
    }

    if (request.method === 'GET' && path === '/normative-registry') {
      return jsonResp({
        ok: true,
        registryVersion: '2026.11.2',
        enStandard: 'ETSI EN 301 549 V4.1.1 (2026-09)',
        eaaDirective: 'Directive (EU) 2019/882 (CELEX:32019L0882)',
        wcagStandard: 'W3C WCAG 2.2 (ISO/IEC 40500:2025)',
        checkedAt: new Date().toISOString(),
        overrides: {}
      });
    }

    // 2. Incoming Lava.top Webhook Receiver (POST /webhook/lava)
    if (request.method === 'POST' && path === '/webhook/lava') {
      if (!webhookSecret) {
        return jsonResp({ ok: false, error: 'LAVA_WEBHOOK_SECRET not configured' }, 500);
      }
      const headerKey = request.headers.get('X-Api-Key') || request.headers.get('x-api-key') || '';
      if (!timingSafeEqualStr(headerKey, webhookSecret)) {
        return jsonResp({ ok: false, error: 'Unauthorized webhook key' }, 401);
      }

      const payload = await request.json().catch(() => ({}));
      const eventId = String(payload?.event_id || payload?.eventId || '').trim();
      if (eventId && env.SUBS_KV) {
        const seen = await env.SUBS_KV.get(`evt:${eventId}`);
        if (seen) return jsonResp({ ok: true, deduplicated: true });
        await env.SUBS_KV.put(`evt:${eventId}`, '1', { expirationTtl: 604800 });
      }

      // Normalize both camelCase (payment.*, subscription.*) and snake_case envelope (refund.success, chargeback.initiated)
      const rawType = String(payload?.event_type || payload?.eventType || payload?.type || '').trim();
      const dataObj = (payload?.data && typeof payload.data === 'object') ? payload.data : payload;
      const buyerEmail = String(
        dataObj?.customer_email ||
        dataObj?.buyer?.email ||
        dataObj?.client?.email ||
        dataObj?.email ||
        payload?.buyer?.email ||
        payload?.email ||
        ''
      ).trim().toLowerCase();

      if (isValidEmail(buyerEmail) && env.SUBS_KV) {
        const prev = (await env.SUBS_KV.get(`sub:${buyerEmail}`, 'json').catch(() => null)) || {};
        const contractId = String(
          dataObj?.parentContractId ||
          dataObj?.contractId ||
          dataObj?.id ||
          prev.contractId ||
          ''
        );

        if (rawType === 'payment.success' || rawType === 'subscription.recurring.payment.success') {
          await env.SUBS_KV.put(`sub:${buyerEmail}`, JSON.stringify({
            email: buyerEmail,
            paid: true,
            status: 'active',
            contractId,
            willExpireAt: dataObj?.willExpireAt || null,
            lastEventType: rawType,
            updatedAt: new Date().toISOString()
          }));
        } else if (rawType === 'subscription.cancelled') {
          const willExp = dataObj?.willExpireAt || prev.willExpireAt || null;
          const stillValid = willExp && !Number.isNaN(Date.parse(willExp)) && Date.parse(willExp) > Date.now();
          await env.SUBS_KV.put(`sub:${buyerEmail}`, JSON.stringify({
            ...prev,
            email: buyerEmail,
            paid: Boolean(stillValid),
            status: 'cancelled',
            contractId,
            willExpireAt: willExp,
            lastEventType: rawType,
            updatedAt: new Date().toISOString()
          }));
        } else if (
          rawType === 'refund.success' ||
          rawType === 'chargeback.initiated' ||
          rawType === 'subscription.recurring.payment.failed'
        ) {
          const isPartialRefund = rawType === 'refund.success' && String(dataObj?.refund_type || '').toLowerCase() === 'partial';
          if (!isPartialRefund) {
            await env.SUBS_KV.put(`sub:${buyerEmail}`, JSON.stringify({
              ...prev,
              email: buyerEmail,
              paid: false,
              status: rawType,
              contractId,
              lastEventType: rawType,
              updatedAt: new Date().toISOString()
            }));
          }
        }
      }

      // Always return 200 OK on unknown/informational events so Lava.top never retry-loops
      return jsonResp({ ok: true, received: rawType || 'unknown' }, 200);
    }

    // 3. Self-Serve Subscription Management Page & One-Click Cancel
    if ((request.method === 'GET' || request.method === 'POST') && path === '/manage-subscription') {
      const cleanEmail = String(url.searchParams.get('email') || '').trim().toLowerCase();
      const exp = Number(url.searchParams.get('exp') || '0');
      const sig = String(url.searchParams.get('sig') || '');
      if (!isValidEmail(cleanEmail) || !webhookSecret || Date.now() > exp) {
        return htmlResp('Session Expired', '#ef4444', 'Ссылка устарела / Link Expired', '<p>Откройте управление подпиской заново из вкладки отчёта в расширении Chrome.</p>');
      }
      const expectedSig = await hmacHex(webhookSecret, `portal:${cleanEmail}:${exp}`);
      if (!timingSafeEqualStr(sig, expectedSig)) {
        return htmlResp('Access Denied', '#ef4444', 'Неверная подпись / Invalid Signature', '<p>Пожалуйста, откройте эту страницу заново из расширения.</p>');
      }

      const rec = env.SUBS_KV ? await env.SUBS_KV.get(`sub:${cleanEmail}`, 'json').catch(() => null) : null;

      if (request.method === 'POST' && url.searchParams.get('action') === 'cancel') {
        let apiCancelled = false;
        if (rec?.contractId && apiKey) {
          try {
            const delUrl = `${LAVA_API_ORIGIN}/api/v1/subscriptions?contractId=${encodeURIComponent(rec.contractId)}&email=${encodeURIComponent(cleanEmail)}`;
            const delRes = await fetch(delUrl, {
              method: 'DELETE',
              headers: { 'Accept': 'application/json', 'X-Api-Key': apiKey }
            });
            apiCancelled = delRes.ok;
          } catch (_) {}
        }
        return htmlResp(
          'Subscription Updated',
          '#10b981',
          apiCancelled ? 'Автопродление отключено / Auto-Renewal Cancelled' : 'Управление в личном кабинете Lava.top',
          apiCancelled
            ? `<p>Автоматические списания для <strong>${cleanEmail}</strong> отключены. Ваш доступ Pro продолжит работать до конца оплаченного периода.</p>`
            : `<p>Для отключения автосписания или скачивания чеков откройте раздел «Мои покупки» на Lava.top под почтой <strong>${cleanEmail}</strong> или напишите нам на <a style="color:#5eead4" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p><a class="btn" href="https://app.lava.top" target="_blank" rel="noopener">Открыть Мои покупки на Lava.top</a>`
        );
      }

      const statusLabel = isRecordActive(rec) ? 'ACTIVE PRO' : (rec?.status || 'NO ACTIVE SUBSCRIPTION');
      const actionUrl = `${url.origin}/manage-subscription?email=${encodeURIComponent(cleanEmail)}&exp=${exp}&sig=${sig}&action=cancel`;
      return htmlResp(
        'Manage Agency Pro Subscription',
        '#0d9488',
        'Управление лицензией Agency Pro',
        `<div class="meta">Email: ${cleanEmail}<br>Status: ${statusLabel}${rec?.contractId ? `<br>Contract: ${rec.contractId}` : ''}</div>
         <p>Вы можете управлять покупками и чеками в личном кабинете Lava.top либо отключить автопродление одной кнопкой ниже.</p>
         <a class="btn" href="https://app.lava.top" target="_blank" rel="noopener">Личный кабинет Lava.top (Чеки / Покупки)</a>
         ${rec?.contractId ? `<form method="POST" action="${actionUrl}" style="margin-top:10px;"><button type="submit" class="btn btn-danger">Отключить автопродление / Cancel Renewal</button></form>` : ''}
         <p style="margin-top:16px;font-size:13px;">Поддержка и возвраты (14 дней): <a style="color:#5eead4" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>`
      );
    }

    if (!checkRateLimit(clientIp)) {
      return jsonResp({ ok: false, error: 'Too many requests, please wait a minute.' }, 429);
    }

    // 4. Public Plan Selector (GET /prices)
    if (request.method === 'GET' && path === '/prices') {
      const prices = buildSortedPrices(country);
      return jsonResp({
        ok: true,
        prices,
        name: 'EU Compliance Auditor — Agency Pro'
      });
    }

    // 5. Built-in Extension Support Desk (POST /support-ticket -> stored safely in KV)
    if (request.method === 'POST' && path === '/support-ticket') {
      const body = await request.json().catch(() => ({}));
      const cleanEmail = String(body?.email || body?.customer_email || '').trim().toLowerCase();
      const subject = String(body?.subject || '').trim();
      const content = String(body?.content || '').trim();

      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Please enter a valid email address.' }, 400);
      }
      if (subject.length < 3 || content.length < 3) {
        return jsonResp({ ok: false, error: 'Please enter both subject and message.' }, 400);
      }

      const ticketId = Math.floor(10000 + Math.random() * 90000);
      if (env.SUBS_KV) {
        await env.SUBS_KV.put(`ticket:${Date.now()}:${ticketId}`, JSON.stringify({
          ticketId,
          email: cleanEmail,
          subject: subject.slice(0, 200),
          content: content.slice(0, 5000),
          service: SERVICE_NAME,
          createdAt: new Date().toISOString()
        }), { expirationTtl: 7776000 });
      }
      return jsonResp({
        ok: true,
        ticketId,
        ticket: { id: ticketId, status: 'open' }
      });
    }

    // 6. Create Lava.top Checkout Session (POST /checkout)
    if (request.method === 'POST' && path === '/checkout') {
      if (!apiKey) {
        return jsonResp({ ok: false, error: 'Server LAVA_API_KEY is not configured.' }, 500);
      }
      const body = await request.json().catch(() => ({}));
      const cleanEmail = String(body?.email || '').trim().toLowerCase();
      const rawPriceId = String(body?.priceId || '').trim();

      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Please enter a valid email address.' }, 400);
      }

      if (env.SUBS_KV) {
        const existing = await env.SUBS_KV.get(`sub:${cleanEmail}`, 'json').catch(() => null);
        if (isRecordActive(existing)) {
          return jsonResp({ ok: true, alreadyPurchased: true, paid: true });
        }
      }

      const prices = buildSortedPrices(country);
      let chosen = prices.find(p => p.id === rawPriceId) || prices[0];
      let offerId = chosen?.offerId || rawPriceId;
      let currency = chosen?.currency || 'USD';
      let periodicity = 'ONE_TIME';

      if (rawPriceId.includes('::')) {
        const parts = rawPriceId.split('::');
        currency = parts[0] || currency;
        periodicity = parts[1] || 'ONE_TIME';
        offerId = parts[2] || offerId;
      } else {
        const matchOff = DEFAULT_OFFERS.find(o => o.offerId === offerId && o.currency === currency) || DEFAULT_OFFERS[0];
        if (matchOff) {
          offerId = matchOff.offerId;
          currency = matchOff.currency;
          periodicity = matchOff.periodicity || 'ONE_TIME';
        }
      }

      const isHttps = url.protocol === 'https:';
      const successUrl = isHttps ? `${url.origin}/paid-success` : 'https://comparetwotexts.pro/?pro_paid=1';
      const cancelUrl = isHttps ? `${url.origin}/paid-cancel` : 'https://comparetwotexts.pro/?pro_cancel=1';

      const reqPayload = {
        email: cleanEmail,
        offerId,
        currency,
        buyerLanguage: currency === 'RUB' ? 'RU' : 'EN',
        successful_return_url: successUrl,
        failure_return_url: cancelUrl,
        cancel_return_url: cancelUrl
      };
      if (periodicity && periodicity !== 'ONE_TIME') {
        reqPayload.periodicity = periodicity;
      }

      let coRes = await fetch(`${LAVA_API_ORIGIN}/api/v3/invoice`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify(reqPayload)
      });

      // Fallback: if periodicity caused a 400 on a one-time product (or vice versa), retry cleanly
      if (coRes.status === 400 && reqPayload.periodicity) {
        delete reqPayload.periodicity;
        coRes = await fetch(`${LAVA_API_ORIGIN}/api/v3/invoice`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey
          },
          body: JSON.stringify(reqPayload)
        });
      }

      const coData = await coRes.json().catch(() => ({}));
      if (!coRes.ok) {
        const detailMsg = coData?.message || coData?.error || JSON.stringify(coData?.details || {});
        return jsonResp({ ok: false, error: `Lava.top checkout error (${coRes.status}): ${detailMsg}` }, coRes.status);
      }

      const checkoutUrl = coData?.paymentUrl || coData?.url || coData?.checkoutUrl;
      const invoiceId = coData?.id || coData?.invoiceId || coData?.contractId || '';
      if (!checkoutUrl) {
        return jsonResp({ ok: false, error: 'Lava.top did not return paymentUrl.' }, 502);
      }

      if (env.SUBS_KV && invoiceId) {
        await env.SUBS_KV.put(`inv:${invoiceId}`, JSON.stringify({
          email: cleanEmail,
          offerId,
          currency,
          createdAt: new Date().toISOString()
        }), { expirationTtl: 2592000 });
        await env.SUBS_KV.put(`last_inv:${cleanEmail}`, String(invoiceId), { expirationTtl: 7200 });
      }

      return jsonResp({
        ok: true,
        checkoutUrl,
        invoiceId,
        acquiring: 'lava.top'
      });
    }

    // 7. Check Paid Entitlement by Email (GET /status?email=...)
    if (request.method === 'GET' && path === '/status') {
      const cleanEmail = String(url.searchParams.get('email') || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Invalid email address.' }, 400);
      }

      if (env.SUBS_KV) {
        const rec = await env.SUBS_KV.get(`sub:${cleanEmail}`, 'json').catch(() => null);
        if (isRecordActive(rec)) {
          return jsonResp({ ok: true, paid: true, purchases: [rec] });
        }

        // Fast fallback if buyer just paid seconds ago and webhook is still in flight
        const recentInvId = await env.SUBS_KV.get(`last_inv:${cleanEmail}`);
        if (recentInvId && apiKey) {
          const verified = await verifyInvoiceAtLava(apiKey, recentInvId);
          if (verified?.paid) {
            const newRec = {
              email: cleanEmail,
              paid: true,
              status: 'active',
              contractId: verified.contractId || recentInvId,
              invoiceId: recentInvId,
              updatedAt: new Date().toISOString(),
              source: 'status_live_poll'
            };
            await env.SUBS_KV.put(`sub:${cleanEmail}`, JSON.stringify(newRec));
            return jsonResp({ ok: true, paid: true, purchases: [newRec] });
          }
        }
      }

      return jsonResp({ ok: true, paid: false, purchases: [] });
    }

    // 8. Customer Subscription Management Link (POST /portal)
    if (request.method === 'POST' && path === '/portal') {
      const body = await request.json().catch(() => ({}));
      const cleanEmail = String(body?.email || '').trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return jsonResp({ ok: false, error: 'Invalid email address.' }, 400);
      }
      if (!webhookSecret) {
        return jsonResp({ ok: true, url: 'https://app.lava.top' });
      }
      const exp = Date.now() + 15 * 60 * 1000;
      const sig = await hmacHex(webhookSecret, `portal:${cleanEmail}:${exp}`);
      const portalUrl = `${url.origin}/manage-subscription?email=${encodeURIComponent(cleanEmail)}&exp=${exp}&sig=${sig}`;
      return jsonResp({ ok: true, url: portalUrl });
    }

    return jsonResp({ ok: false, error: `Route not found: ${request.method} ${path}` }, 404);
  }
};
