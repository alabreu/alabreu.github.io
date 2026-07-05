import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

let sha = process.env.GITHUB_SHA?.slice(0, 7) ?? '';
if (!sha) {
  try {
    sha = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    sha = 'dev';
  }
}
const buildTime = new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ sha, buildTime }),
        });
      },
    },
  ],
  base: '/mtg-deck-builder/',
  define: {
    __BUILD_SHA__: JSON.stringify(sha),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
});
