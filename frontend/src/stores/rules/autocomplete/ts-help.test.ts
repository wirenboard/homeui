// @vitest-environment happy-dom
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { createDefaultMapFromNodeModules, createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { withCompletionDetails, buildSignatureTooltip } from './ts-help';

// A tiny real language service over a hand-written d.ts, so the enrichment
// is exercised against actual getCompletionEntryDetails/getSignatureHelpItems
// output rather than a mock.
const DTS = `
interface Device {
  /** Writes one channel through the driver: \`writeChannel("K1", 1)\`. */
  writeChannel(name: string, value: any): Promise<void>;
}
declare const device: Device;
`;

function makeEnv(source: string) {
  const path = '/rule.ts';
  // the real lib.*.d.ts, so globals resolve (Array, Promise, ...)
  const fsMap = createDefaultMapFromNodeModules({ target: ts.ScriptTarget.ESNext }, ts);
  fsMap.set('/wb-rules.d.ts', DTS);
  fsMap.set(path, source);
  const system = createSystem(fsMap);
  const env = createVirtualTypeScriptEnvironment(system, [path, '/wb-rules.d.ts'], ts, {
    target: ts.ScriptTarget.ESNext,
    lib: ['lib.esnext.d.ts'],
    allowJs: true,
    checkJs: true,
    noEmit: true,
    module: ts.ModuleKind.ESNext,
    moduleDetection: ts.ModuleDetectionKind.Force,
  });
  return { env, path };
}

describe('withCompletionDetails', () => {
  it('adds the signature and JSDoc to a member completion', async () => {
    const source = 'device.';
    const { env, path } = makeEnv(source);
    const base = vi.fn(async () => ({
      from: source.length,
      options: [{ label: 'writeChannel' }],
    }));
    const enriched = withCompletionDetails(base as any, env, path, ts);
    const state = EditorState.create({ doc: source });
    const result = await enriched(new CompletionContext(state, source.length, true));
    expect(result).not.toBeNull();
    const [option] = result!.options;
    expect(option.detail).toContain('writeChannel');
    expect(option.detail).toContain('name: string');
    const info = (option.info as (c: any) => Node)(option);
    const text = (info as HTMLElement).textContent ?? '';
    expect(text).toContain('writeChannel');
    // the JSDoc reaches the panel
    expect(text).toContain('Writes one channel');
  });

  it('leaves an entry that already has info untouched', async () => {
    const { env, path } = makeEnv('device.');
    const base = vi.fn(async () => ({ from: 0, options: [{ label: 'x', info: 'kept' }] }));
    const enriched = withCompletionDetails(base as any, env, path, ts);
    const state = EditorState.create({ doc: 'device.' });
    const result = await enriched(new CompletionContext(state, 7, true));
    expect(result!.options[0].info).toBe('kept');
  });
});

describe('buildSignatureTooltip', () => {
  it('shows the parameters with the active one emphasised', () => {
    const source = 'device.writeChannel(';
    const { env, path } = makeEnv(source);
    const tooltip = buildSignatureTooltip(env, path, ts, source.length);
    expect(tooltip).not.toBeNull();
    const { dom } = tooltip!.create({} as any);
    const text = (dom as HTMLElement).textContent ?? '';
    expect(text).toContain('name: string');
    expect(text).toContain('value: any');
    const active = (dom as HTMLElement).querySelector('.cm-signatureHelp-active');
    expect(active?.textContent).toContain('name: string');
  });

  it('is null outside a call', () => {
    const source = 'const x = 1;';
    const { env, path } = makeEnv(source);
    expect(buildSignatureTooltip(env, path, ts, source.length)).toBeNull();
  });
});
