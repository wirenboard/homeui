// Screenshots of pages on every check size from docs/breakpoints.md.
// Usage: npm run screens -- /settings/dali /settings/logs. Procedure: docs/breakpoints.md.
// Needs `npm run dev` against a controller. Env: SCREENS_BASE_URL (http://localhost:8080),
// SCREENS_LOGIN / SCREENS_PASSWORD (if the controller has users), SCREENS_OUT (.tmp/screens),
// SCREENS_WAIT ms after load (3000), CHROME_PATH (system Chromium/Chrome is detected).
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const SIZES = [
  [360, 600], [767, 600],
  [768, 600], [1023, 600],
  [1024, 600], [1365, 600],
  [1366, 600], [1920, 600],
];

const routes = process.argv.slice(2);
if (!routes.length) {
  console.error('Pass page routes, e.g. /settings/dali');
  process.exit(1);
}

const baseUrl = process.env.SCREENS_BASE_URL || 'http://localhost:8080';
const outDir = path.resolve(process.env.SCREENS_OUT || '.tmp/screens');
const wait = Number(process.env.SCREENS_WAIT || 3000);
const executablePath = process.env.CHROME_PATH
  || ['/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => existsSync(p));

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', '--disable-gpu'] });
const context = await browser.newContext();

if (process.env.SCREENS_LOGIN) {
  const res = await context.request.post(`${baseUrl}/auth/login`, {
    data: { login: process.env.SCREENS_LOGIN, password: process.env.SCREENS_PASSWORD || '' },
  });
  if (!res.ok()) {
    console.error(`Login failed: ${res.status()}`);
    await browser.close();
    process.exit(1);
  }
}

// One page at a time: heavy pages on a small machine kill the renderer when opened in parallel.
for (const route of routes) {
  const name = route.replace(/^\/+/, '').replace(/[^\w-]+/g, '_') || 'root';
  for (const [width, height] of SIZES) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(wait);
    try {
      await page.locator('.loader-container').first().waitFor({ state: 'hidden', timeout: 20000 });
    } catch {
      console.error(`Loader still visible: ${route} ${width}x${height}`);
    }
    if (page.url().includes('#/login')) {
      console.error('Redirected to login: set SCREENS_LOGIN / SCREENS_PASSWORD');
      await browser.close();
      process.exit(1);
    }
    const file = path.join(outDir, `${name}-${width}x${height}.png`);
    await page.screenshot({ path: file });
    console.log(file);
    await page.close();
  }
}

await browser.close();
