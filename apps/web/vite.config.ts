import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Map @sound/shared imports to shared package source
      '@sound/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  // Online-first: no emulator proxy in this config.
  // Emulator usage is controlled via VITE_USE_FIREBASE_EMULATOR env var.
  server: {
    port: 3000,
    strictPort: false,
  },
});
