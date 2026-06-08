/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { enigmaDevProxy } from './vite-dev-proxy'

// https://vitejs.dev/config/
export default defineConfig({
  // Served from root for dev/native/Capacitor; the GitHub Pages build sets
  // VITE_BASE=/enigma/ (project site lives under that subpath).
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    legacy(),
    enigmaDevProxy()
  ],
  server: {
    watch: {
      // Don't watch native build outputs or generated artifacts. `cap sync`
      // and asset generation delete-and-recreate ios/android public dirs,
      // which crashes Vite's file watcher (scandir UNKNOWN) and also fires
      // pointless full-page reloads. None of these are app source.
      ignored: [
        '**/ios/**',
        '**/android/**',
        '**/dist/**',
        '**/cypress/screenshots/**',
        '**/cypress/videos/**',
      ],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
