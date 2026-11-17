#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const rawUrl = (process.argv[2] || '').trim().replace(/\/+$/, '');

if (!rawUrl || !/^https:\/\//i.test(rawUrl)) {
  console.error('Usage: npm run set-worker -- https://wcag22-paywall-proxy.<your-subdomain>.workers.dev');
  process.exit(1);
}

const origin = new URL(rawUrl).origin;

// 1. Update src/paywall/config.js
const cfg = `export const PAYWALL_CONFIG = {
  paywallId: '926',
  apiOrigin: 'https://appbox.space',
  workerOrigin: '${origin}'
};
`;
writeFileSync(resolve(root, 'src/paywall/config.js'), cfg, 'utf-8');

// 2. Narrow host_permissions in manifest.json & manifest.firefox.json for fast Chrome Web Store review
for (const mfName of ['manifest.json', 'manifest.firefox.json']) {
  const mfPath = resolve(root, mfName);
  const mf = JSON.parse(readFileSync(mfPath, 'utf-8'));
  mf.host_permissions = [`${origin}/*`, 'https://appbox.space/*'];
  writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n', 'utf-8');
}

console.log(`[OK] Configured production Worker URL: ${origin}`);
console.log('     Run "npm run package" next to rebuild dist-sdk/ and store zip files.');
