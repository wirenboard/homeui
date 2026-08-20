import { buildControlsRegistry } from './registry';

const cell = (id: string, type: string) => ({ id, type, isSystem: id.startsWith('system__') });
const store = (cells: ReturnType<typeof cell>[]) =>
  ({ cells: new Map(cells.map((c) => [c.id, c])) }) as any;

describe('buildControlsRegistry', () => {
  it('emits a WbControls interface mapping each device/control to its type', () => {
    const dts = buildControlsRegistry(store([
      cell('climate/temperature', 'temperature'),
      cell('living/light', 'switch'),
    ]));
    expect(dts).toContain('interface WbControls {');
    expect(dts).toContain('"climate/temperature": "temperature";');
    expect(dts).toContain('"living/light": "switch";');
  });

  it('skips system controls and cells whose type is not yet known', () => {
    const dts = buildControlsRegistry(store([
      cell('system__networking/ip', 'text'),
      cell('sensor/pending', 'incomplete'),
      cell('sensor/temp', 'temperature'),
    ]));
    expect(dts).not.toContain('system__');
    expect(dts).not.toContain('pending');
    expect(dts).toContain('"sensor/temp": "temperature";');
  });

  it('escapes special characters in ids/types safely', () => {
    const dts = buildControlsRegistry(store([cell('a"b/c', 'value')]));
    expect(dts).toContain('"a\\"b/c": "value";');
  });

  it('returns an empty string when there is nothing to declare', () => {
    expect(buildControlsRegistry(store([]))).toBe('');
    expect(buildControlsRegistry(store([cell('system__x/y', 'value')]))).toBe('');
  });
});
