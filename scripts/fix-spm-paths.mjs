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

// Capacitor native runtime pin. The capacitor-swift-pm 8.4.0 prebuilt
// xcframework dropped the older iOS API (color(fromHex:), PluginConfig.getString,
// CAPBridgeProtocol.webView/viewController) that the installed plugins
// (@capacitor/status-bar 8.0.2, screen-orientation 8.0.1, browser, etc.) still
// call, so the app won't compile against 8.4.0. 8.1.0's xcframework still has
// that API (verified), so pin to it. `cap sync` rewrites this to match the
// @capacitor/ios version (8.4.0), which re-breaks the build — so re-pin here.
const SWIFT_PM_PIN = '8.1.0';

let fixed = src
  // POSIX-ify Windows backslash node_modules paths.
  .split('\n')
  .map((line) => (line.includes('node_modules') ? line.replace(/\\/g, '/') : line))
  .join('\n')
  // Force the capacitor-swift-pm version back to the compatible pin.
  .replace(
    /(capacitor-swift-pm\.git",\s*exact:\s*")[^"]+(")/,
    `$1${SWIFT_PM_PIN}$2`
  );

if (fixed !== src) {
  writeFileSync(manifest, fixed);
  console.log(`[fix-spm-paths] normalised Package.swift (POSIX paths + capacitor-swift-pm ${SWIFT_PM_PIN})`);
} else {
  console.log(`[fix-spm-paths] Package.swift already POSIX + pinned to ${SWIFT_PM_PIN} — no change.`);
}
