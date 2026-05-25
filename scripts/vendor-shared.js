/**
 * vendor-shared.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Copies packages/shared/dist → functions/vendor/sound-shared/
 * so that the Firebase functions upload is self-contained.
 *
 * Why this is needed:
 *   Firebase deploy uploads only what is listed in functions/package.json
 *   "dependencies". Local workspace symlinks are not followed by the uploader.
 *   This script creates a real, copyable vendor directory that npm links as
 *   a file: dependency — which IS included in the upload artifact.
 *
 * Run: node scripts/vendor-shared.js
 * Triggered automatically via firebase.json predeploy hook.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT        = path.resolve(__dirname, '..');
const SRC_DIST    = path.join(ROOT, 'packages', 'shared', 'dist');
const VENDOR_DIR  = path.join(ROOT, 'functions', 'vendor', 'sound-shared');
const VENDOR_DIST = path.join(VENDOR_DIR, 'dist');

// ── Verify source exists ───────────────────────────────────────────────────
if (!fs.existsSync(SRC_DIST)) {
  console.error('[vendor-shared] ERROR: packages/shared/dist not found.');
  console.error('  Run: npm run build --workspace=packages/shared  first.');
  process.exit(1);
}

// ── Ensure target directories exist ───────────────────────────────────────
fs.mkdirSync(VENDOR_DIST, { recursive: true });

// ── Write vendor package.json ──────────────────────────────────────────────
const vendorPkg = {
  name:    '@sound/shared',
  version: '1.0.0',
  main:    'dist/index.js',
  private: true
};
fs.writeFileSync(
  path.join(VENDOR_DIR, 'package.json'),
  JSON.stringify(vendorPkg, null, 2) + '\n'
);
console.log('[vendor-shared] wrote functions/vendor/sound-shared/package.json');

// ── Copy compiled dist files ───────────────────────────────────────────────
const files = fs.readdirSync(SRC_DIST);
let copied = 0;
for (const file of files) {
  const src  = path.join(SRC_DIST, file);
  const dest = path.join(VENDOR_DIST, file);
  if (fs.statSync(src).isFile()) {
    fs.copyFileSync(src, dest);
    console.log(`[vendor-shared]   copied: dist/${file}`);
    copied++;
  }
}

console.log(`[vendor-shared] done — ${copied} files in functions/vendor/sound-shared/dist/`);
