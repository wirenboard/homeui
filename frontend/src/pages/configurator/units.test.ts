// @vitest-environment happy-dom
import { plainUnits } from './units';

const CLASSES: Record<string, string> = {
  K1: 'bin_rw', K2: 'bin_rw', Input: 'bin_r', state: 'bin_rw', brightness: 'level', color_temp: 'level',
  temperature: 'temp', humidity: 'hum', battery: 'battery', offset: 'setting',
};

vi.mock('./utils', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  deviceTitle: (id: string) => id.toUpperCase(),
  classifyCell: ({ controlId }: { controlId: string }) => ({ cls: CLASSES[controlId] ?? 'none' }),
}));

const cellsOf = (id: string, controlIds: string[]) =>
  controlIds.map((controlId) => ({ id: `${id}/${controlId}`, controlId, name: controlId })) as any[];
const summary = (id: string, controlIds: string[], used: string[] = []) =>
  plainUnits(id, cellsOf(id, controlIds), new Set(used))
    .map((unit) => [unit.name, unit.rows.map((row) => [row.type, row.bind])]);

describe('plainUnits', () => {
  it('makes a device of every output and one of the sensors, skipping used channels and settings', () => {
    expect(summary('gpio', ['K1', 'K2', 'Input', 'temperature', 'offset'], ['gpio/K2'])).toEqual([
      ['K1', [['switch', { on_off: 'gpio/K1' }]]],
      ['GPIO', [
        ['contact_sensor', { contact: 'gpio/Input' }],
        ['temperature_sensor', { temperature: 'gpio/temperature' }],
      ]],
    ]);
  });

  it('takes one switch with level channels for one lamp and gives the battery to the sensors', () => {
    expect(summary('bulb', ['state', 'brightness', 'color_temp'])).toEqual([
      ['BULB', [['light', {
        on_off: 'bulb/state', brightness: 'bulb/brightness', color_temperature: 'bulb/color_temp',
      }]]],
    ]);
    expect(summary('sensor', ['temperature', 'humidity', 'battery'])).toEqual([
      ['SENSOR', [
        ['temperature_sensor', { temperature: 'sensor/temperature', battery: 'sensor/battery' }],
        ['humidity_sensor', { humidity: 'sensor/humidity', battery: 'sensor/battery' }],
      ]],
    ]);
  });
});
