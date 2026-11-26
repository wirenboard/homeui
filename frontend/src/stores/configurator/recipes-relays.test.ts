import { recipeModels, recipeRows } from './recipes';

describe('WB-MRWM2 recipe', () => {
  const controls = ['K1', 'K2', 'P L1', 'P L2', 'AP energy L1', 'AP energy L2', 'Urms L1', 'Input 1'];

  it('makes a relay, a power sensor and an energy meter for each of the two outputs', () => {
    const rows = recipeRows('wb-mrwm2_21', controls, new Set());

    expect(rows.map(({ row, index, byControl }) => [row.type, Object.values(row.bind)[0], index, byControl])).toEqual([
      ['switch', 'wb-mrwm2_21/K1', 1, true],
      ['power_sensor', 'wb-mrwm2_21/P L1', 1, true],
      ['energy_meter', 'wb-mrwm2_21/AP energy L1', 1, true],
      ['switch', 'wb-mrwm2_21/K2', 2, true],
      ['power_sensor', 'wb-mrwm2_21/P L2', 2, true],
      ['energy_meter', 'wb-mrwm2_21/AP energy L2', 2, true],
    ]);
  });

  it('is shown with its three channel types for two outputs', () => {
    expect(recipeModels().find(({ title }) => title === 'WB-MRWM2')).toEqual({
      title: 'WB-MRWM2', types: ['switch', 'power_sensor', 'energy_meter'], count: 2,
    });
  });
});

describe('WB-MR3LV recipe of the old template', () => {
  it('makes three relays and stays out of the list of models', () => {
    const rows = recipeRows('wb-mr3lv_9', ['K1', 'K2', 'K3', 'Input 0'], new Set());

    expect(rows.map(({ row, index }) => [row.type, row.bind.on_off, index])).toEqual(
      [1, 2, 3].map((index) => ['switch', `wb-mr3lv_9/K${index}`, index]),
    );
    expect(recipeModels().map(({ title }) => title)).not.toContain('WB-MR3LV');
  });
});

describe('list of supported models', () => {
  it('leaves out old templates and discontinued devices, their recipes still work', () => {
    const titles = recipeModels().map(({ title }) => title);

    expect(titles).toEqual(expect.not.arrayContaining(['WB-MR6LV', 'WB-MR3LV', 'WB-MR6C-NC', 'WB-MS-THLS v.2']));
    expect(titles).toEqual(expect.arrayContaining(['WB-MR6C v.2, WB-MR6LV/HV', 'WB-MR3LV/HV, WB-MRWL3', 'WB-MRPS6']));
    expect(recipeRows('wb-mr6lv_4', ['K1'], new Set())).toHaveLength(1);
    expect(recipeRows('wb-ms-thls-v2_8', ['Temperature'], new Set())).toHaveLength(1);
  });
});
