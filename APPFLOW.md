# Building Enigma for iPhone with Ionic Appflow

The native iOS project lives in `ios/` (Capacitor 8, Swift Package Manager — no CocoaPods).
Appflow builds it in the cloud on a Mac, so you don't need your own Mac.

## What you need
- An **Apple Developer Program** membership ($99/yr) — required to sign/install iOS apps.
- A free **Ionic account** → https://ionic.io (Appflow).
- This repo on GitHub (branch pushed).

## One-time setup
1. **Push the repo** (from the project folder):
   ```
   git push -u origin enigma-app
   ```
   Then merge `enigma-app` into `main` on GitHub (Appflow builds a branch you choose).
2. **Apple signing assets** (in your Apple Developer account):
   - Register the App ID **`ionic.enigma`** (matches `capacitor.config.ts` → `appId`).
   - Create an **iOS Distribution (or Development) certificate** (`.p12`) and a **Provisioning Profile** for that App ID.
   - For installing on *your* iPhone without the App Store, use an **Ad Hoc** profile and add your iPhone's UDID, or a **Development** profile.

## In Appflow
1. **Apps → Connect a repo** → pick `DevilIris/enigma`.
2. **Build → Native configs** isn't needed; **Build → iOS**:
   - Build type: **Capacitor**.
   - Web build: Appflow auto-runs `npm ci` + `npm run build` (webDir is `dist`).
3. **Signing certificates → Add** → upload your `.p12` + provisioning profile (or connect your Apple account for automatic signing).
4. **Builds → New build → iOS** → pick the branch, the signing cert, and target:
   - **Development / Ad Hoc** → installs directly on registered devices.
   - **App Store** → upload to TestFlight.
5. **Install on your iPhone**:
   - Ad Hoc: download the `.ipa` / scan the QR from the build page on the phone, or use Apple Configurator.
   - TestFlight: submit the build, then install via the TestFlight app.

## Notes specific to this app
- **No proxy needed on native.** The browser dev proxy (`/__proxy`) is dev-only; the native app uses `CapacitorHttp` (no CORS) to scrape sources directly, and the in-player **auto source-fallback** picks a stream that plays.
- **Deep link** `enigma://anilist` (AniList login) and **arbitrary HTTP loads** (video streams) are already configured in `ios/App/App/Info.plist`.
- **App icon / splash**: drop a 1024×1024 `resources/icon.png` (and `resources/splash.png`) and run `npx @capacitor/assets generate --ios`, then commit `ios/`. (Optional; ships with the default Capacitor icon otherwise.)
- After changing web code: `npm run build && npx cap sync ios`, commit, rebuild in Appflow.
