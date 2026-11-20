import { recipeModels, recipeModelTitle, recipeRows } from './recipes';

const controls = [
  'P1 Volume', 'P2 Volume', 'Input F1', 'Input F1 Counter', 'Input F2', 'Input F3', 'Input F4', 'Input F5', 'Input S6',
  'Output K1', 'Output K2', 'Leakage Mode', 'Leakage Mode Reset', 'Cleaning Mode', 'Buzzer', 'Serial',
];
const made = (params: Record<string, unknown>) =>
  recipeRows('WB-MWAC', controls, new Set(), () => true, { deviceType: 'WB-MWAC-v2 ver2', params })
    .map(({ row }) => `${row.type} ${Object.values(row.bind)[0].split('/')[1]}`);

describe('WB-MWAC v.2 recipe', () => {
  it('makes the leak flag, the leak inputs, the valves, the cleaning mode and the water meters, in groups', () => {
    expect(made({})).toEqual([
      'leak_sensor Leakage Mode',
      'leak_sensor Input F1', 'leak_sensor Input F2', 'leak_sensor Input F3', 'leak_sensor Input F4',
      'leak_sensor Input F5',
      'switch Output K1', 'switch Output K2',
      'switch Cleaning Mode',
      'number_sensor P1 Volume', 'number_sensor P2 Volume',
    ]);
  });

  it('takes only the inputs that the config sets as leak sensors, the sixth one included', () => {
    const leaks = made({ in1_mode: 6, in2_mode: 3, in3_mode: 5, in6_mode: 5 })
      .filter((row) => row.startsWith('leak_sensor Input'));

    expect(leaks).toEqual([
      'leak_sensor Input F3', 'leak_sensor Input F4', 'leak_sensor Input F5', 'leak_sensor Input S6',
    ]);
  });

  it('serves the old template too and is shown once without a counter', () => {
    expect(recipeModelTitle('valves', { deviceType: 'WB-MWAC-v2', params: {} })).toBe('WB-MWAC v.2');
    expect(recipeModels().filter(({ title }) => title === 'WB-MWAC v.2')).toEqual([
      { title: 'WB-MWAC v.2', types: ['leak_sensor', 'switch', 'number_sensor'], count: 1 },
    ]);
  });
});
