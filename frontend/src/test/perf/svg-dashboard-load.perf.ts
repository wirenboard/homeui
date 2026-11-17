import { expect, test } from '@playwright/test';
import type { DashboardsConfig, SvgDashboardConstructor } from '@/stores/dashboards/types';
import { startMockBroker } from '../mock-broker.mjs';
import { DEFAULT_PREFIX, startMockDevices } from '../mock-devices.mjs';
import budget from './budget.json';
import { MOCK_BROKER_PORT } from './ports';
import { type FrameMetrics } from './types';

const DASHBOARD_ID = 'perf-test-svg-dashboard';

const ELEMENT_COUNT = 150;
const UPDATES_PER_SEC = 100;

const MEASURE_DURATION_MS = 5000;

function buildSvgMarkup(): string {
  const elements = Array.from({ length: ELEMENT_COUNT }, (_, i) => {
    const n = i + 1;
    const x = (n % 15) * 80;
    const y = Math.floor(n / 15) * 80;
    return `<g id="el-${n}">`
      + `<rect x="${x}" y="${y}" width="60" height="60" fill="#888888"/>`
      + `<text x="${x + 30}" y="${y + 35}" text-anchor="middle">${n}</text>`
      + '</g>';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">${elements}</svg>`;
}

function buildParams(): Partial<SvgDashboardConstructor>[] {
  return Array.from({ length: ELEMENT_COUNT }, (_, i) => {
    const n = i + 1;
    return {
      id: `el-${n}`,
      style: {
        enable: true,
        channel: `${DEFAULT_PREFIX}${n}/cell_1`,
        value: '\'fill:\' + (val > 5000 ? \'#e74c3c\' : \'#2ecc71\')',
      },
    };
  });
}

function buildDashboardsConfig(): DashboardsConfig {
  return {
    dashboards: [{
      id: DASHBOARD_ID,
      name: 'Perf test SVG dashboard',
      isSvg: true,
      widgets: [],
      svg: {
        current: '',
        original: {},
        params: buildParams(),
      },
    }],
    widgets: [],
  };
}

test.describe('SVG dashboard page performance', () => {
  test('stays within budget under realistic load', async ({ page }) => {
    const broker = await startMockBroker({ port: MOCK_BROKER_PORT });
    const devices = await startMockDevices({
      broker: broker.url,
      deviceCount: ELEMENT_COUNT,
      cellsPerDevice: 1,
      updatesPerSec: UPDATES_PER_SEC,
    });

    try {
      await page.route('**/auth/who_am_i', (route) => route.fulfill({ status: 404, body: '' }));
      await page.route('**/api/dashboards', (route) => route.fulfill({ json: buildDashboardsConfig() }));
      await page.route(`**/api/dashboards/${DASHBOARD_ID}/svg`, (route) => route.fulfill({
        contentType: 'image/svg+xml',
        body: buildSvgMarkup(),
      }));
      await page.route('**/api/fonts', (route) => route.fulfill({ json: [] }));

      const navigateStart = Date.now();
      await page.goto(`/#/dashboards/svg/view/${DASHBOARD_ID}`);

      await page.waitForFunction(
        (count) => document.querySelectorAll('.svgDashboard svg [id^="el-"]').length >= count,
        ELEMENT_COUNT,
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
        `SVG dashboard page perf: timeToStable=${timeToStableMs}ms fps=${fps.toFixed(1)} `
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
