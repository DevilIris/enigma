# Sideload Enigma onto your iPhone (Windows + USB, no paid Apple account)

This installs the **native** app (unlocks the English scraper sources that a
browser can't reach) using a **free Apple ID**. The app is valid for **7 days**;
re-run Sideloadly to refresh it.

## What you need
- Windows PC + your iPhone + a USB cable.
- **iTunes** installed from apple.com (NOT the Microsoft Store version) — provides
  the Apple Mobile Device USB driver Sideloadly needs.
- **Sideloadly** — https://sideloadly.io (free).
- A free **Apple ID** (your normal one works; a throwaway is safer since it gets a
  dev cert).

## 1. Get the .ipa (built for you in the cloud)
1. Go to the repo **Actions** tab → workflow **“Build unsigned iOS .ipa (sideload)”**.
2. Open the latest **successful** run (green check).
3. Under **Artifacts**, download **`Enigma-unsigned-ipa`** (a `.zip`).
4. Unzip it → you get **`Enigma-unsigned.ipa`**.

A fresh `.ipa` is built automatically on every push to `main`, or trigger one
manually with **Run workflow** on that Actions page.

## 2. Install with Sideloadly
1. Install + open **Sideloadly**. Install **iTunes** first if the device doesn't appear.
2. Plug in the iPhone via USB; on the phone tap **Trust** if asked.
3. In Sideloadly: pick your **device**, drag **`Enigma-unsigned.ipa`** into the window.
4. Enter your **Apple ID** in the “Apple account” field → click **Start**.
   (Enter your Apple ID password / app-specific password when prompted.)
5. Sideloadly signs it with a free cert and installs it.

## 3. Trust the cert + launch
1. On the iPhone: **Settings → General → VPN & Device Management**.
2. Tap your Apple ID under “Developer App” → **Trust**.
3. Open **Enigma** from the home screen.

## Notes
- **7-day limit:** free certs expire after a week and max 3 sideloaded apps. To
  refresh, just run Sideloadly again with the same `.ipa` (or a newer build).
- The native app needs **no proxy** — it uses CapacitorHttp to scrape sources
  directly, and cleartext/ATS + the `enigma://` deep link are already configured.
- If an app-store-grade, no-expiry install is wanted later, that's the Apple
  Developer ($99/yr) + Appflow/TestFlight route (see APPFLOW.md).
