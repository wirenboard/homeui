import { expect, test } from '@playwright/test';
import type { DashboardsConfig, WidgetBase } from '@/stores/dashboards/types';
import { startMockBroker } from '../mock-broker.mjs';
import { DEFAULT_PREFIX, startMockDevices } from '../mock-devices.mjs';
import budget from './budget.json';
import { MOCK_BROKER_PORT } from './ports';
import { type FrameMetrics } from './types';

const DASHBOARD_ID = 'perf-test-dashboard';

const WIDGET_COUNT = 40;
const CELLS_PER_WIDGET = 4;
const UPDATES_PER_SEC = 100;

const MEASURE_DURATION_MS = 5000;

function buildDashboardsConfig(): DashboardsConfig {
  const widgetIds: string[] = [];
  const widgets: WidgetBase[] = [];

  for (let w = 1; w <= WIDGET_COUNT; w++) {
    const widgetId = `widget-${w}`;
    widgetIds.push(widgetId);
    widgets.push({
      id: widgetId,
      name: `Widget ${w}`,
      compact: false,
      description: '',
      cells: Array.from({ length: CELLS_PER_WIDGET }, (_, i) => ({
        id: `${DEFAULT_PREFIX}${w}/cell_${i + 1}`,
        name: `Cell ${i + 1}`,
        extra: {},
      })),
    });
  }

  return {
    dashboards: [{
      id: DASHBOARD_ID,
      name: 'Perf test dashboard',
      isSvg: false,
      widgets: widgetIds,
    }],
    widgets,
  };
}

test.describe('Dashboard page performance', () => {
  test('stays within budget under realistic load', async ({ page }) => {
    const broker = await startMockBroker({ port: MOCK_BROKER_PORT });
    const devices = await startMockDevices({
      broker: broker.url,
      deviceCount: WIDGET_COUNT,
      cellsPerDevice: CELLS_PER_WIDGET,
      updatesPerSec: UPDATES_PER_SEC,
    });

    try {
      await page.route('**/auth/who_am_i', (route) => route.fulfill({ status: 404, body: '' }));
      await page.route('**/api/dashboards', (route) => route.fulfill({ json: buildDashboardsConfig() }));

      const navigateStart = Date.now();
      await page.goto(`/#/dashboards/${DASHBOARD_ID}`);

      await page.waitForFunction(
        (count) => document.querySelectorAll('.dashboard-container article.card').length >= count,
        WIDGET_COUNT,
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
        `Dashboard page perf: timeToStable=${timeToStableMs}ms fps=${fps.toFixed(1)} `
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
