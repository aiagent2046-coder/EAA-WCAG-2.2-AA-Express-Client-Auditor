#!/usr/bin/env node
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import worker from './worker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[k] = v;
  }
  return out;
}

const fileEnv = {
  ...loadDotEnv(resolve(__dirname, '../.env')),
  ...loadDotEnv(resolve(__dirname, '.env')),
  ...loadDotEnv(resolve(__dirname, '.dev.vars'))
};

const env = {
  PAYWALL_ID: process.env.PAYWALL_ID || fileEnv.PAYWALL_ID || '926',
  MONETIZE_API_ORIGIN: process.env.MONETIZE_API_ORIGIN || fileEnv.MONETIZE_API_ORIGIN || 'https://appbox.space',
  MONETIZE_API_KEY: process.env.MONETIZE_API_KEY || fileEnv.MONETIZE_API_KEY || ''
};

const PORT = Number(process.env.PORT || 8787);

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const bodyBuf = Buffer.concat(chunks);

    const fullUrl = `http://127.0.0.1:${PORT}${req.url || '/'}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) headers.set(k, v.join(', '));
      else if (typeof v === 'string') headers.set(k, v);
    }

    const webReq = new Request(fullUrl, {
      method: req.method || 'GET',
      headers,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method || 'GET') ? undefined : bodyBuf
    });

    const webRes = await worker.fetch(webReq, env);
    res.statusCode = webRes.status;
    webRes.headers.forEach((val, key) => res.setHeader(key, val));
    const arrBuf = await webRes.arrayBuffer();
    res.end(Buffer.from(arrBuf));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(JSON.stringify({ ok: false, error: err.message || String(err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n[OK] Direct Stripe Paywall Proxy running on http://127.0.0.1:${PORT}`);
  console.log(`     Paywall ID : ${env.PAYWALL_ID} (${env.MONETIZE_API_ORIGIN})`);
  console.log(`     API Key    : ${env.MONETIZE_API_KEY ? 'LOADED (' + env.MONETIZE_API_KEY.slice(0, 7) + '...)' : 'MISSING! Put MONETIZE_API_KEY=... in paywall-worker/.env'}\n`);
});
