import * as esbuild from 'esbuild';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'dist-sdk');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const common = {
  bundle: true,
  platform: 'browser',
  target: ['chrome116', 'firefox115'],
  define: { 'process.env.NODE_ENV': '"production"' },
  jsx: 'automatic',
  jsxImportSource: 'preact',
  logLevel: 'info',
};

// 1. Service Worker (ESM) for Chrome / Edge
await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/sw.entry.js')],
  outfile: resolve(outDir, 'sw.js'),
  format: 'esm',
});

// 2. Service Worker / Background script for Firefox (no offscreen router needed)
await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/sw-firefox.entry.js')],
  outfile: resolve(outDir, 'sw-firefox.js'),
  format: 'iife',
});

// 3. Offscreen server bundle (ESM) for Chrome / Edge
await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/offscreen/offscreen.entry.js')],
  outfile: resolve(outDir, 'offscreen.js'),
  format: 'esm',
});

// 4. UI Paywall Bridge for Chrome / Edge (@monetize.software/sdk-extension)
await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/paywall/bridge.entry.js')],
  outfile: resolve(outDir, 'paywall-bridge.js'),
  format: 'iife',
});

// 5. UI Paywall Bridge for Firefox (@monetize.software/sdk direct)
await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/paywall/bridge-web.entry.js')],
  outfile: resolve(outDir, 'paywall-bridge-web.js'),
  format: 'iife',
});

console.log('[OK] Bundled @monetize.software SDK 3.0 into dist-sdk/');
