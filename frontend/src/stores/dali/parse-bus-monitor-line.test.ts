import { describe, expect, it } from 'vitest';
import { parseBusMonitorLine } from './parse-bus-monitor-line';

describe('parseBusMonitorLine', () => {
  it('request with a value response', () => {
    const f = parseBusMonitorLine('12:34:56.812 >> a3fa QueryActualLevel(A5) - 00fe 254');
    expect(f.time).toBe('12:34:56.812');
    expect(f.direction).toBe('out');
    expect(f.hex).toBe('a3fa');
    expect(f.command).toBe('QueryActualLevel(A5)');
    expect(f.response).toEqual({ kind: 'value', text: '00fe 254', hex: '00fe', value: '254' });
    expect(f.badges).toEqual({});
  });

  it('request expecting no response', () => {
    const f = parseBusMonitorLine('12:34:56.900 >> a3a0 Off(A5)');
    expect(f.direction).toBe('out');
    expect(f.command).toBe('Off(A5)');
    expect(f.response.kind).toBe('none');
  });

  it('request with an error response', () => {
    const f = parseBusMonitorLine('12:34:56.950 >> a3fa QueryActualLevel(A5) - no power on bus');
    expect(f.command).toBe('QueryActualLevel(A5)');
    expect(f.response).toEqual({ kind: 'error', text: 'no power on bus' });
  });

  it('command from the Lunatone emulator', () => {
    const f = parseBusMonitorLine('12:34:57.000 >> a3a0 Off(A5) (from lunatone)');
    expect(f.command).toBe('Off(A5)');
    expect(f.response.kind).toBe('none');
    expect(f.badges).toEqual({ fromLunatone: true });
  });

  it('unexpected command from the bus (with fc counter)', () => {
    const f = parseBusMonitorLine('12:34:57.001 << a380 DAPC(A3, 128) (fc: 42)');
    expect(f.direction).toBe('in');
    expect(f.hex).toBe('a380');
    expect(f.command).toBe('DAPC(A3, 128)');
    expect(f.response.kind).toBe('none');
    expect(f.badges).toEqual({ fc: 42 });
  });

  it('unexpected unrecognized forward packet', () => {
    const f = parseBusMonitorLine('12:34:57.050 << ff93 FF16 (fc: 43)');
    expect(f.command).toBe('FF16');
    expect(f.badges).toEqual({ fc: 43 });
  });

  it('unexpected unrecognized backward packet', () => {
    const f = parseBusMonitorLine('12:34:57.100 << 002a BF8 (fc: 44)');
    expect(f.command).toBe('BF8');
    expect(f.badges).toEqual({ fc: 44 });
  });

  it('unexpected packet received with a framing error (status appended without " - ")', () => {
    const f = parseBusMonitorLine('12:34:57.150 << ff93 FF16 framing error (fc: 45)');
    expect(f.direction).toBe('in');
    expect(f.hex).toBe('ff93');
    expect(f.command).toBe('FF16');
    expect(f.response).toEqual({ kind: 'error', text: 'framing error' });
    expect(f.badges).toEqual({ fc: 45 });
  });

  it('does not split a command that contains a hyphen-free argument list', () => {
    const f = parseBusMonitorLine('12:34:57.200 >> a380 DAPC(A3, 128)');
    expect(f.command).toBe('DAPC(A3, 128)');
    expect(f.response.kind).toBe('none');
  });
});
