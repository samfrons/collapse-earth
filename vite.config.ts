import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const page = (name: string) => resolve(__dirname, 'src/pages', name, 'index.html');

export default defineConfig({
  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'),
        'core-sample': page('core-sample'),
        'the-seam': page('the-seam'),
      },
    },
  },
  server: { open: '/index.html' },
});
