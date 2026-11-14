import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Root-relative, resolved by Vite; mirrors `paths` in tsconfig.json.
    alias: { '@': '/src' },
  },
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
  },
});
