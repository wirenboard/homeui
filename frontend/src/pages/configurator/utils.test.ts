// @vitest-environment happy-dom
import i18n from '@/i18n/config';
import type { Cell } from '@/stores/devices';
import { defaultName, formatValue } from './utils';

const cell = (fields: Partial<Cell>) => fields as Cell;

beforeAll(async () => {
  await i18n.changeLanguage('en');
});

describe('defaultName', () => {
  it('uses the channel name without a type and for numeric classes', () => {
    expect(defaultName('', cell({ name: 'K1' }), 'bin_rw')).toBe('K1');
    expect(defaultName('number_setting', cell({ name: 'LED Period' }), 'setting')).toBe('LED Period');
  });

  it('uses the role for a class with a single type', () => {
    expect(defaultName('temperature_sensor', cell({ name: 'Temp 1' }), 'temp')).toBe('Temperature');
  });

  it('prefixes the channel name with the type for an ambiguous class', () => {
    expect(defaultName('light', cell({ name: 'K1' }), 'bin_rw')).toBe('Light K1');
  });
});

describe('formatValue', () => {
  it('shows a dash for a missing cell or an empty value', () => {
    expect(formatValue(undefined)).toBe('—');
    expect(formatValue(cell({ type: 'value', value: '-' }))).toBe('—');
  });

  it('shows pushbuttons and booleans as words', () => {
    expect(formatValue(cell({ type: 'pushbutton' }))).toBe('button');
    expect(formatValue(cell({ type: 'switch', valueType: 'boolean', value: true }))).toBe('on');
  });

  it('appends translated units', () => {
    expect(formatValue(cell({ type: 'value', valueType: 'number', value: 21.5, units: 'deg C' }))).toBe('21.5 °C');
  });
});
