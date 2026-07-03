import { ChartTraits } from './chart-traits';
import { ChartType } from './types';

const makeControl = (overrides = {}) => ({
  name: 'Test',
  group: 'All',
  deviceId: 'dev1',
  controlId: 'ctrl1',
  valueType: 'number' as const,
  ...overrides,
});

describe('ChartTraits', () => {
  test('defaults to Number type', () => {
    const t = new ChartTraits(makeControl());
    expect(t.type).toBe(ChartType.Number);
    expect(t.hasErrors).toBe(true);
    expect(t.hasBooleanValues).toBe(false);
  });

  test('boolean valueType sets Boolean chart type', () => {
    const t = new ChartTraits(makeControl({ valueType: 'boolean' }));
    expect(t.type).toBe(ChartType.Boolean);
    expect(t.hasBooleanValues).toBe(true);
    expect(t.hasErrors).toBe(false);
  });

  test('pushbutton valueType sets Boolean chart type', () => {
    const t = new ChartTraits(makeControl({ valueType: 'pushbutton' }));
    expect(t.type).toBe(ChartType.Boolean);
  });

  test('system uptime sets UpTime type', () => {
    const t = new ChartTraits(makeControl({
      deviceId: 'system',
      controlId: 'Current uptime',
    }));
    expect(t.type).toBe(ChartType.UpTime);
  });

  test('string valueType sets String chart type', () => {
    const t = new ChartTraits(makeControl({ valueType: 'string' }));
    expect(t.type).toBe(ChartType.String);
  });

  test('rgb valueType sets String chart type', () => {
    const t = new ChartTraits(makeControl({ valueType: 'rgb' }));
    expect(t.type).toBe(ChartType.String);
  });

  test('initializes with empty arrays', () => {
    const t = new ChartTraits(makeControl());
    expect(t.xValues).toEqual([]);
    expect(t.yValues).toEqual([]);
    expect(t.channelName).toBe('Test');
  });
});
