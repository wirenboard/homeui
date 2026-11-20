import { recipeModels, recipeModelTitle, recipeRows } from './recipes';

describe('WB-UPS recipe', () => {
  it('makes numeric sensors of the readings the device has', () => {
    const controls = ['battery_charge_level', 'output_voltage', 'battery_temperature', 'serial'];
    const rows = recipeRows('wb_ups_v3_183', controls, new Set());

    expect(rows.map(({ row, byControl }) => [row.type, Object.values(row.bind)[0], byControl])).toEqual([
      ['number_sensor', 'wb_ups_v3_183/battery_charge_level', true],
      ['number_sensor', 'wb_ups_v3_183/output_voltage', true],
      ['temperature_sensor', 'wb_ups_v3_183/battery_temperature', true],
    ]);
  });

  it('is shown with its channel types under a readable title', () => {
    expect(recipeModelTitle('wb_ups_v3_183')).toBe('WB-UPS v.3');
    expect(recipeModels().find(({ title }) => title === 'WB-UPS v.3')).toEqual({
      title: 'WB-UPS v.3', types: ['number_sensor', 'temperature_sensor'], count: 1,
    });
  });
});
