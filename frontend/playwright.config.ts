import { defineConfig } from '@playwright/test';
import { MOCK_BROKER_PORT } from './src/test/perf/ports';

const PREVIEW_PORT = 4317;

export default defineConfig({
  testDir: './src/test/perf',
  testMatch: '**/*.perf.ts',
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PREVIEW_PORT}`,
  },
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    port: PREVIEW_PORT,
    // @ts-ignore
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      MQTT_BROKER_URI: `http://127.0.0.1:${MOCK_BROKER_PORT}`,
    },
  },
});
