import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// This file is ESM (`"type": "module"`), so `__dirname` does not exist. Deriving it
// from `import.meta.url` is the portable form and does not depend on how the bundler
// happens to transpile the config.
const root = dirname(fileURLToPath(import.meta.url));

const page = (name: string) => resolve(root, 'src/pages', name, 'index.html');

export default defineConfig({
  root: resolve(root, 'src'),
  publicDir: resolve(root, 'public'),
  resolve: {
    alias: { '@': resolve(root, 'src') },
  },
  build: {
    outDir: resolve(root, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      // Deliberately no root index.html: Vercel resolves the filesystem before it
      // applies rewrites, so a real file at "/" would shadow the rewrite to the lead
      // page. "/" is a rewrite, and the only thing that serves it is Core Sample.
      input: {
        'core-sample': page('core-sample'),
        'the-seam': page('the-seam'),
      },
    },
  },
  server: { open: '/pages/core-sample/index.html' },
});
