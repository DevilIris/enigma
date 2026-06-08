// Generates the Enigma app-icon + splash SOURCE images into assets/.
// Run `npx capacitor-assets generate` afterwards to fan these out into every
// iOS / Android size. Re-run this script any time the brand mark changes.
//
//   node scripts/gen-assets.mjs
//
// Design: dark teal-black field, a teal->cyan gradient "E" monogram whose
// middle stroke is a play triangle (anime streaming). Accent #21C7C7.

import sharp from 'sharp';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets');
mkdirSync(out, { recursive: true });

const TEAL = '#21C7C7';

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B2025"/>
      <stop offset="0.55" stop-color="#071316"/>
      <stop offset="1" stop-color="#03080A"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.43" r="0.58">
      <stop offset="0" stop-color="${TEAL}" stop-opacity="0.38"/>
      <stop offset="0.6" stop-color="${TEAL}" stop-opacity="0.08"/>
      <stop offset="1" stop-color="${TEAL}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="teal" x1="0" y1="0" x2="0.25" y2="1">
      <stop offset="0" stop-color="#6FF0E2"/>
      <stop offset="0.5" stop-color="#2FD0CC"/>
      <stop offset="1" stop-color="#13A7B0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>`;

// The "E" monogram, centred on a 1024 canvas. `s` scales it about the centre.
function glyph(s = 1) {
  const bars = `
    <rect x="360" y="300" width="92" height="424" rx="34" fill="url(#teal)"/>
    <rect x="360" y="300" width="300" height="92" rx="34" fill="url(#teal)"/>
    <rect x="360" y="632" width="300" height="92" rx="34" fill="url(#teal)"/>
    <path d="M470 432 L470 592 L612 512 Z" fill="url(#teal)"/>`;
  return `<g filter="url(#soft)" transform="translate(512 512) scale(${s}) translate(-512 -512)">${bars}</g>`;
}

const wordmark = (y) =>
  `<text x="512" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="150" font-weight="700"
        letter-spacing="14" fill="#EAFBFA" text-anchor="middle">ENIGMA</text>`;

function svg(w, h, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 1024">${defs}${inner}</svg>`;
}

const fullIcon = svg(1024, 1024,
  `<rect width="1024" height="1024" fill="url(#bg)"/>
   <rect width="1024" height="1024" fill="url(#glow)"/>
   ${glyph(1)}`);

const iconBackground = svg(1024, 1024,
  `<rect width="1024" height="1024" fill="url(#bg)"/>
   <rect width="1024" height="1024" fill="url(#glow)"/>`);

// Foreground for Android adaptive icons: glyph must live inside the central
// safe zone (~66% of the canvas) so the launcher mask never crops it, but
// should fill that zone for visual weight. scale(1.35) keeps the bounding box
// within ~24%..76% of the canvas — comfortably inside the 16.7%..83.3% safe band.
const iconForeground = svg(1024, 1024, glyph(1.35));

// Splash: 2732x2732, logo + wordmark, centred on the dark field.
function splashSvg() {
  const inner =
    `<rect width="1024" height="1024" fill="url(#bg)"/>
     <rect width="1024" height="1024" fill="url(#glow)"/>
     <g transform="translate(0 -70)">${glyph(0.62)}</g>
     ${wordmark(880)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 1024 1024">${defs}${inner}</svg>`;
}

const tasks = [
  ['icon.png', fullIcon, 1024],
  ['icon-only.png', fullIcon, 1024],
  ['icon-background.png', iconBackground, 1024],
  ['icon-foreground.png', iconForeground, 1024],
  ['splash.png', splashSvg(), 2732],
  ['splash-dark.png', splashSvg(), 2732],
];

for (const [name, markup, size] of tasks) {
  const png = await sharp(Buffer.from(markup)).resize(size, size).png().toBuffer();
  writeFileSync(join(out, name), png);
  console.log(`[gen-assets] wrote assets/${name} (${size}x${size})`);
}

// Web extras written straight into public/ (shipped by Vite): a PNG
// apple-touch-icon for iOS "Add to Home Screen", plus a refreshed favicon.
const pub = join(root, 'public');
const appleTouch = await sharp(Buffer.from(fullIcon)).resize(180, 180).png().toBuffer();
writeFileSync(join(pub, 'apple-touch-icon.png'), appleTouch);
console.log('[gen-assets] wrote public/apple-touch-icon.png (180x180)');
const favicon = await sharp(Buffer.from(fullIcon)).resize(196, 196).png().toBuffer();
writeFileSync(join(pub, 'favicon.png'), favicon);
console.log('[gen-assets] wrote public/favicon.png (196x196)');

// Fan the sources out into every iOS / Android / PWA size.
console.log('[gen-assets] running capacitor-assets generate …');
execSync('npx capacitor-assets generate', { cwd: root, stdio: 'inherit' });

// capacitor-assets drops PWA icons into ./icons (repo root); Vite only ships
// public/, so relocate them to public/icons where the manifest expects them.
const stray = join(root, 'icons');
if (existsSync(stray)) {
  const dest = join(pub, 'icons');
  mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(stray)) renameSync(join(stray, f), join(dest, f));
  rmSync(stray, { recursive: true, force: true });
  console.log('[gen-assets] moved PWA icons -> public/icons');
}

// capacitor-assets rewrites public/manifest.json on every run, pointing icons
// at `../icons/*.webp` with type image/png. Vite serves from public/, so fix
// the paths to `/icons/...`, set the correct webp MIME, and lock the brand
// colours. This runs AFTER the tool so the one-command pipeline stays correct.
const manifestPath = join(pub, 'manifest.json');
if (existsSync(manifestPath)) {
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (Array.isArray(m.icons)) {
    m.icons = m.icons.map((ic) => ({
      ...ic,
      // Relative to the manifest URL so icons resolve under any base path
      // (root, capacitor://localhost, or the GitHub Pages /enigma/ subpath).
      src: ic.src.replace(/^(\.{0,2}\/)?icons\//, 'icons/'),
      type: ic.src.endsWith('.webp') ? 'image/webp' : ic.type,
    }));
  }
  m.theme_color = '#071316';
  m.background_color = '#071316';
  writeFileSync(manifestPath, JSON.stringify(m, null, 2) + '\n');
  console.log('[gen-assets] normalised public/manifest.json icon paths');
}

console.log('[gen-assets] done.');
