import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  cacheDir: '/private/tmp/mnemix-audit-vite-cache',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
