import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ionic.enigma',
  appName: 'Enigma',
  webDir: 'dist',
  plugins: {
    // Use the native HTTP layer so source scraping bypasses browser CORS and
    // can set arbitrary headers (User-Agent / Referer) on native platforms.
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
