// Drift guard: regenerating from wb-rules.d.ts must reproduce the committed file byte
// for byte, otherwise the declarations changed without npm run generate:completions
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));

describe('generated completions', () => {
  test('regenerating globals-generated.ts from wb-rules.d.ts reproduces the committed file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-completions-'));
    const out = path.join(dir, 'globals-generated.ts');
    try {
      execFileSync(
        process.execPath,
        [path.join(here, '../../../../scripts/generate-wb-rules-completions.mjs'), out],
        { stdio: 'pipe' },
      );
      const regenerated = fs.readFileSync(out, 'utf8');
      const committed = fs.readFileSync(path.join(here, 'globals-generated.ts'), 'utf8');
      expect(regenerated).toBe(committed);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    // generous cap: the child process imports the full typescript package
  }, 30000);
});
