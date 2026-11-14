import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Root-relative, resolved by Vite; mirrors `paths` in tsconfig.json.
    alias: { '@': '/src' },
  },
  // Lets the app code see whether the Tauri CLI is building it (see src/data/index.ts).
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  // Tauri expects a fixed port and prints its own logs.
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**', '**/crates/**', '**/mcp-server/**', '**/target/**'] },
  },
  build: {
    // WebView2 is an evergreen Chromium, so no legacy transforms are needed.
    target: 'chrome120',
    // The target supports module preload natively.
    modulePreload: { polyfill: false },
  },
});
