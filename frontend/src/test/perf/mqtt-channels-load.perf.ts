import { expect, test } from '@playwright/test';
import { startMockBroker } from '../mock-broker.mjs';
import { startMockDevices } from '../mock-devices.mjs';
import budget from './budget.json';
import { MOCK_BROKER_PORT } from './ports';
import { type FrameMetrics } from './types';

const DEVICE_COUNT = 400;
const CELLS_PER_DEVICE = 5;
const UPDATES_PER_SEC = 300;
const TOTAL_CELLS = DEVICE_COUNT * CELLS_PER_DEVICE;

const MEASURE_DURATION_MS = 5000;

test.describe('MQTT channels page performance', () => {
  test('stays within budget under realistic load', async ({ page }) => {
    const broker = await startMockBroker({ port: MOCK_BROKER_PORT });
    const devices = await startMockDevices({
      broker: broker.url,
      deviceCount: DEVICE_COUNT,
      cellsPerDevice: CELLS_PER_DEVICE,
      updatesPerSec: UPDATES_PER_SEC,
    });

    try {
      await page.route('**/auth/who_am_i', (route) => route.fulfill({ status: 404, body: '' }));

      const navigateStart = Date.now();
      await page.goto('/#/settings/mqtt-channels');

      await page.waitForFunction(
        (count) => document.querySelectorAll('.wb-tableBody tr').length >= count,
        TOTAL_CELLS,
        { timeout: budget.maxTimeToStableMs + 10000 },
      );
      const timeToStableMs = Date.now() - navigateStart;

      const { frames, elapsedMs, maxLongTaskMs } = await page.evaluate(async (durationMs) => {
        return await new Promise<FrameMetrics>((resolve) => {
          let frameCount = 0;
          let longestTaskMs = 0;
          const start = performance.now();

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              longestTaskMs = Math.max(longestTaskMs, entry.duration);
            }
          });
          observer.observe({ type: 'longtask' });

          const tick = () => {
            frameCount++;
            const elapsed = performance.now() - start;
            if (elapsed < durationMs) {
              requestAnimationFrame(tick);
            } else {
              observer.disconnect();
              resolve({ frames: frameCount, elapsedMs: elapsed, maxLongTaskMs: longestTaskMs });
            }
          };
          requestAnimationFrame(tick);
        });
      }, MEASURE_DURATION_MS);

      const fps = frames / (elapsedMs / 1000);

      console.log(
        `MQTT channels page perf: timeToStable=${timeToStableMs}ms fps=${fps.toFixed(1)} `
        + `maxLongTask=${maxLongTaskMs.toFixed(1)}ms (budget: ${JSON.stringify(budget)})`,
      );

      expect(timeToStableMs).toBeLessThanOrEqual(budget.maxTimeToStableMs);
      expect(fps).toBeGreaterThanOrEqual(budget.minFps);
      expect(maxLongTaskMs).toBeLessThanOrEqual(budget.maxLongTaskMs);
    } finally {
      await page.close();
      await devices.stop();
      await broker.stop();
    }
  });
});
