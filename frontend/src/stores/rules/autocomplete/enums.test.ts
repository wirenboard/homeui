// @vitest-environment happy-dom
// enums.ts imports the devices store, whose module graph (i18n, auth) reads
// localStorage/window at import time; happy-dom provides them.
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { getEnums } from './enums';

// minimal DevicesStore stand-in: one device with two controls, plus the
// flat topic list used by the global-reference completions
function fakeStore() {
  const device = { getControls: () => ['temperature', 'status'] };
  return {
    devices: new Map([['ts_demo', device]]),
    topicsWithoutSystem: [
      { options: [{ value: 'ts_demo/temperature' }, { value: 'relay/k1' }] },
    ],
  } as any;
}

// mimic mergeSources over just the enum sources: first non-empty wins
async function enumsResult(doc: string) {
  const sources = getEnums(fakeStore());
  const state = EditorState.create({ doc });
  const ctx = new CompletionContext(state, doc.length, true);
  for (const s of sources) {
    const r = await s(ctx);
    if (r && r.options.length > 0) return r;
  }
  return null;
}

describe('getControl completions', () => {
  it('defers vdev.getControl(" to the type service instead of dumping the global list', async () => {
    // a method call on a variable: TS knows the variable's device type and
    // offers only that device's controls, so the live-list source stays out
    const r = await enumsResult('const vdev = defineVirtualDevice("ts_demo", {});\nvdev.getControl("');
    expect(r).toBeNull();
  });

  it('offers full "device/control" references for the global getControl(', async () => {
    const r = await enumsResult('getControl("');
    expect(r?.options.map((o) => o.label)).toContain('ts_demo/temperature');
  });

  it('offers a device\'s own controls for getDevice("X").getControl(', async () => {
    const r = await enumsResult('getDevice("ts_demo").getControl("');
    expect(r?.options.map((o) => o.label).sort()).toEqual(['status', 'temperature']);
  });
});
