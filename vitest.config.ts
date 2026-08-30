import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = dirname(fileURLToPath(import.meta.url));

// Deliberately separate from vite.config.ts: the build roots at `src/` so that Vite's
// multi-page inputs stay relative, while tests root at the repo so they can reach
// `tests/` and the fixtures beside it.
export default defineConfig({
  resolve: { alias: { '@': resolve(root, 'src') } },
  test: {
    root,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
