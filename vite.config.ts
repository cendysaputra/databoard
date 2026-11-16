import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * Writes the built files and a build version into `dist/sw.js`, so the installed web app
 * caches every route up front and drops the previous build's cache after an update.
 */
function precache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'precache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const assets = readdirSync(join(outDir, 'assets')).map((file) => `/assets/${file}`);
      const version = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);
      const file = join(outDir, 'sw.js');
      const source = readFileSync(file, 'utf8')
        .replace("const VERSION = 'dev';", `const VERSION = '${version}';`)
        .replace('const ASSETS = [];', `const ASSETS = ${JSON.stringify(assets)};`);
      writeFileSync(file, source);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), precache()],
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
