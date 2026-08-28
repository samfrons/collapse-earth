import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Deliberately separate from vite.config.ts: the build roots at `src/` so that
// Vite's multi-page inputs stay relative, while tests root at the repo so they can
// reach `tests/` and the fixtures beside it.
export default defineConfig({
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    root: __dirname,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
