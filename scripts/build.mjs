import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'dist-sdk');

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let esbuildMod = null;
try {
  esbuildMod = await import('esbuild');
} catch (_) {
  esbuildMod = null;
}

if (esbuildMod) {
  const common = {
    bundle: true,
    platform: 'browser',
    target: ['chrome116', 'firefox115'],
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'info',
  };

  await esbuildMod.build({
    ...common,
    entryPoints: [resolve(root, 'src/sw.entry.js')],
    outfile: resolve(outDir, 'sw.js'),
    format: 'esm',
  });

  await esbuildMod.build({
    ...common,
    entryPoints: [resolve(root, 'src/sw-firefox.entry.js')],
    outfile: resolve(outDir, 'sw-firefox.js'),
    format: 'iife',
  });

  await esbuildMod.build({
    ...common,
    entryPoints: [resolve(root, 'src/paywall/bridge.entry.js')],
    outfile: resolve(outDir, 'paywall-bridge.js'),
    format: 'iife',
  });

  console.log('[OK] Bundled paywall bridge & service workers via esbuild into dist-sdk/');
} else {
  // Zero-dependency deterministic bundler fallback when node_modules is absent
  const swSrc = readFileSync(resolve(root, 'src/sw.entry.js'), 'utf8');
  const swFfSrc = readFileSync(resolve(root, 'src/sw-firefox.entry.js'), 'utf8');
  const cfgSrc = readFileSync(resolve(root, 'src/paywall/config.js'), 'utf8')
    .replace(/^\s*export\s+/gm, '');
  const bridgeSrc = readFileSync(resolve(root, 'src/paywall/create-bridge.js'), 'utf8')
    .replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
    .replace(/^\s*export\s+/gm, '');

  writeFileSync(resolve(outDir, 'sw.js'), swSrc, 'utf8');
  writeFileSync(resolve(outDir, 'sw-firefox.js'), `(() => {\n${swFfSrc}\n})();\n`, 'utf8');
  writeFileSync(
    resolve(outDir, 'paywall-bridge.js'),
    `(() => {\n${cfgSrc}\n${bridgeSrc}\nattachGlobalPaywallBridge();\n})();\n`,
    'utf8'
  );
  console.log('[OK] Bundled paywall bridge & service workers via zero-dep Node builder into dist-sdk/');
}
