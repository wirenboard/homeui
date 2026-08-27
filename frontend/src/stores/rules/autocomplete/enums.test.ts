// @vitest-environment happy-dom
// happy-dom: the devices store's module graph reads localStorage/window at import time
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { getEnums } from './enums';

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
    // a call on a variable is left to the TS service (it knows the device type)
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
