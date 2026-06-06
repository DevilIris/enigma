# Running Enigma on a Fire TV Stick

A Fire Stick runs **Fire OS (Android)**, so this is an Android APK you **sideload**.
The Android project lives in `android/` (Capacitor 8) and is already configured for Fire TV:
- `android.hardware.touchscreen` is **not required** (so it installs on the remote-only Fire TV).
- The launcher activity declares **`LEANBACK_LAUNCHER`** (shows on the Fire TV home).
- Cleartext HTTP is allowed (video streams) and the `enigma://` deep link is registered.

## 1. Build the APK
You don't have the Android SDK locally, so build it in the cloud:

**Option A — Ionic Appflow (recommended, no local setup)**
1. Connect the repo (see `APPFLOW.md`).
2. **Build → Android** → build type **Capacitor**, target **Debug** (installable directly) or **Release**.
   - *Release* needs an Android **keystore** — Appflow can generate one or you upload it. *Debug* needs no signing and installs fine for personal use.
3. Download the resulting `.apk`.

**Option B — locally with Android Studio (free)**
1. Install Android Studio, open the `android/` folder, let it sync Gradle.
2. **Build → Build Bundle(s)/APK(s) → Build APK** → find it under
   `android/app/build/outputs/apk/debug/app-debug.apk`.

## 2. Prepare the Fire Stick
On the Fire TV: **Settings → My Fire TV → Developer options** →
- Turn **ON** "Apps from Unknown Sources" (and "ADB debugging" if you'll use a PC).

## 3. Sideload the APK
**Easiest (no PC) — the Downloader app:**
1. Install **Downloader** from the Amazon Appstore on the Fire TV.
2. Host the APK at a URL (the Appflow build download link, or any file host / your LAN).
3. In Downloader, enter that URL → it downloads and prompts to **Install**.

**Via PC with adb:**
1. Fire TV IP: **Settings → My Fire TV → About → Network**.
2. On the PC: `adb connect <fire-tv-ip>:5555` then `adb install Enigma.apk`.

## 4. Launch
"Enigma" appears in the Fire TV apps list (and under "Your Apps & Channels"). Open it with the remote.

## Notes
- **No proxy needed** on Fire TV — the native app uses `CapacitorHttp` (no CORS) to scrape, and the in-player auto source-fallback picks a stream that plays.
- **Remote navigation**: the UI is touch-designed; the Fire remote's D-pad moves focus and Select acts as tap (Android default focus). It's usable but not yet TV-optimized (no custom focus order). Full leanback/D-pad polish is a follow-up.
- After changing web code: `npm run build && npx cap sync android`, commit, rebuild the APK.
