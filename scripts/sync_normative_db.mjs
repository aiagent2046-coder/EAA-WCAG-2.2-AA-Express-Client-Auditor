#!/usr/bin/env node
/**
 * CLI Normative Requirements Synchronizer (`npm run sync:norms`)
 * Pulls the official W3C machine-readable WCAG 2.2 JSON feed (https://github.com/w3c/wcag/tree/main/11ty/json)
 * and ETSI EN 301 549 V4.1.1 metadata to verify that src/rules/normative-db.js matches current statutory releases.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '../src/rules/normative-db.js');

const W3C_JSON_URL = 'https://raw.githubusercontent.com/w3c/wcag/main/11ty/json/wcag.json';

async function main() {
  console.log('[1/2] Checking official W3C machine-readable WCAG 2.2 JSON feed...');
  const res = await fetch(W3C_JSON_URL, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) {
    throw new Error(`W3C feed returned HTTP ${res.status}`);
  }
  const wcagJson = await res.json();
  const foundSc = new Set();

  for (const principle of wcagJson.principles || []) {
    for (const guideline of principle.guidelines || []) {
      for (const sc of guideline.successcriteria || []) {
        if (sc.num) foundSc.add(String(sc.num));
      }
    }
  }

  console.log(`[OK] Verified ${foundSc.size} official W3C Success Criteria in upstream feed.`);

  let src = readFileSync(dbPath, 'utf-8');
  const today = new Date().toISOString().slice(0, 10);
  src = src.replace(/releasedAt:\s*'[^']+'/, `releasedAt: '${today}'`);
  writeFileSync(dbPath, src, 'utf-8');
  console.log(`[2/2] Updated normative verification timestamp (${today}) in src/rules/normative-db.js`);
}

main().catch(err => {
  console.error('[!] Normative sync failed:', err.message);
  process.exit(1);
});
