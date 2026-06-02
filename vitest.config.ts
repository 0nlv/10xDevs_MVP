import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.astro/**'],
    timeout: 10000,
  },
});
