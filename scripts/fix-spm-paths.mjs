// Fixes Capacitor's Swift Package Manager manifest after `cap sync` on Windows.
//
// On Windows, the Capacitor CLI writes node_modules dependency paths into
// ios/App/CapApp-SPM/Package.swift using BACKSLASH separators, e.g.
//   .package(name: "CapacitorApp", path: "..\..\..\node_modules\@capacitor\app")
// A backslash is a literal filename character on macOS/Linux, so SPM cannot
// resolve the packages and the Appflow (or any macOS) build fails with
// "could not find package". This rewrites those paths to POSIX forward slashes,
// which are valid on every platform. Idempotent — safe to run repeatedly.
//
// Wired into `npm run cap:sync` / `npm run cap:sync:ios` so it runs right after
// `cap sync`. Run it manually any time you've synced on Windows.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = join(root, 'ios', 'App', 'CapApp-SPM', 'Package.swift');

let src;
try {
  src = readFileSync(manifest, 'utf8');
} catch {
  // No iOS project (e.g. android-only checkout) — nothing to fix.
  console.log('[fix-spm-paths] no iOS Package.swift found, skipping.');
  process.exit(0);
}

// Only touch backslashes inside lines that reference node_modules paths, so we
// never disturb anything else in the manifest.
const fixed = src
  .split('\n')
  .map((line) => (line.includes('node_modules') ? line.replace(/\\/g, '/') : line))
  .join('\n');

if (fixed !== src) {
  writeFileSync(manifest, fixed);
  console.log('[fix-spm-paths] rewrote Windows backslash paths to POSIX in Package.swift');
} else {
  console.log('[fix-spm-paths] Package.swift already POSIX — no change.');
}
