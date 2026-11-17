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
  logLevel: 'info',
};

await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/sw.entry.js')],
  outfile: resolve(outDir, 'sw.js'),
  format: 'esm',
});

await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/sw-firefox.entry.js')],
  outfile: resolve(outDir, 'sw-firefox.js'),
  format: 'iife',
});

await esbuild.build({
  ...common,
  entryPoints: [resolve(root, 'src/paywall/bridge.entry.js')],
  outfile: resolve(outDir, 'paywall-bridge.js'),
  format: 'iife',
});

console.log('[OK] Bundled @monetize.software/sdk/core bridge into dist-sdk/');
