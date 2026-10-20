import { expect, test } from '@playwright/test';
import { mockHistoryRpc, startMockBroker } from '../mock-broker.mjs';
import { startMockDevices } from '../mock-devices.mjs';
import budget from './budget.json';
import { MOCK_BROKER_PORT } from './ports';
import { type FrameMetrics } from './types';

const DEVICE_COUNT = 400;
const CELLS_PER_DEVICE = 5;
const UPDATES_PER_SEC = 300;

const CHANNEL_DEVICE_NUMBERS = [1, 100, 200, 300];
const POINTS_PER_CHANNEL = 1000;
const EXPECTED_TRACE_COUNT = CHANNEL_DEVICE_NUMBERS.length * 2;

const MEASURE_DURATION_MS = 5000;

test.describe('History page performance', () => {
  test('stays within budget under realistic load', async ({ page }) => {
    const broker = await startMockBroker({ port: MOCK_BROKER_PORT });
    const devices = await startMockDevices({
      broker: broker.url,
      deviceCount: DEVICE_COUNT,
      cellsPerDevice: CELLS_PER_DEVICE,
      updatesPerSec: UPDATES_PER_SEC,
      cellType: (deviceNum, cellNum) =>
        (cellNum === 1 && CHANNEL_DEVICE_NUMBERS.includes(deviceNum) ? 'value' : 'text'),
    });
    const stopHistoryRpc = mockHistoryRpc(broker.aedes, { pointsPerChannel: POINTS_PER_CHANNEL });

    try {
      await page.route('**/auth/who_am_i', (route) => route.fulfill({ status: 404, body: '' }));
      await page.route('**/api/dashboards', (route) => route.fulfill({ json: { dashboards: [], widgets: [] } }));

      await page.goto('/#/history');

      await page.waitForFunction(
        () => !!document.querySelector('#history-control-0'),
        { timeout: budget.maxTimeToStableMs + 10000 },
      );

      for (let i = 0; i < CHANNEL_DEVICE_NUMBERS.length; i++) {
        if (i > 0) {
          await page.locator('.history-addChannel').click();
        }
        const label = `Stress Device ${CHANNEL_DEVICE_NUMBERS[i]} / cell_1`;
        const input = page.locator(`#history-control-${i}`);
        await input.click();
        await input.pressSequentially(label);
        await page.locator('.dropdown__option', { hasText: label }).first().click();
      }

      const loadStart = Date.now();
      await page.locator('.history-loadActions button[type="submit"]').click();

      await page.waitForFunction(
        (count) => document.querySelectorAll('.js-plotly-plot .scatterlayer .trace').length >= count,
        EXPECTED_TRACE_COUNT,
        { timeout: budget.maxTimeToStableMs + 10000 },
      );
      const timeToStableMs = Date.now() - loadStart;

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
        `History page perf: timeToStable=${timeToStableMs}ms fps=${fps.toFixed(1)} `
        + `maxLongTask=${maxLongTaskMs.toFixed(1)}ms (budget: ${JSON.stringify(budget)})`,
      );

      expect(timeToStableMs).toBeLessThanOrEqual(budget.maxTimeToStableMs);
      expect(fps).toBeGreaterThanOrEqual(budget.minFps);
      expect(maxLongTaskMs).toBeLessThanOrEqual(budget.maxLongTaskMs);
    } finally {
      await page.close();
      stopHistoryRpc();
      await devices.stop();
      await broker.stop();
    }
  });
});
