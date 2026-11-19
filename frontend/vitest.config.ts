import path from 'path';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svgr({ include: '**/*.svg' }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: false,
  test: {
    globals: true,
    setupFiles: ['./src/test/setup-components.ts'],
    // Isolated like threads, but node_modules and happy-dom load once per worker instead of once per file
    pool: 'vmThreads',
    vmMemoryLimit: '300MB',
    // On CI the tests run alongside eslint, tsc and pylint, all workers on every core starve each other
    maxWorkers: '50%',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**'],
    },
  },
});
