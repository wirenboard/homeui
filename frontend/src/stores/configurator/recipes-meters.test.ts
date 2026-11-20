import { recipeModels, recipeModelTitle, recipeRows, serialDeviceId } from './recipes';

const binds = (deviceId: string, controls: string[]) =>
  recipeRows(deviceId, controls, new Set()).map(({ row }) => Object.values(row.bind)[0].split('/')[1]);

describe('WB-MAP12E recipe', () => {
  it('takes the total power and energy of a channel when the meter publishes them', () => {
    const controls = [
      'Ch 1 Total P', 'Ch 1 Total AP energy', 'Ch 1 P L1', 'Ch 1 AP energy L1', 'Ch 1 Total Q', 'Urms L1',
    ];

    expect(binds('wb-map12e_35', controls)).toEqual(['Ch 1 Total P', 'Ch 1 Total AP energy']);
  });

  it('falls back to the phases of a channel that has no totals, as on the test stand', () => {
    const controls = [
      'Ch 3 P L1', 'Ch 3 AP energy L1', 'Ch 3 P L2', 'Ch 3 AP energy L2', 'Ch 3 Total N', 'Ch 3 Irms L1',
      'Ch 4 P L1', 'Ch 4 AP energy L1', 'Frequency',
    ];

    expect(binds('wb-map12e_35', controls)).toEqual([
      'Ch 3 P L1', 'Ch 3 AP energy L1', 'Ch 3 P L2', 'Ch 3 AP energy L2', 'Ch 4 P L1', 'Ch 4 AP energy L1',
    ]);
  });

  it('is found by the type of the config under a renamed id', () => {
    const serial = { deviceType: 'WB-MAP12E fw2', params: {} };

    expect(recipeModelTitle('WB-MAP12', serial)).toBe('WB-MAP12E');
    expect(recipeRows('WB-MAP12', ['Ch 2 Total P'], new Set(), () => true, serial)).toHaveLength(1);
  });
});

describe('WB-MAP3E and WB-MAP3ET recipe', () => {
  it('takes the totals, or the three phases when there are none', () => {
    expect(binds('wb-map3e_8', ['Total P', 'Total AP energy', 'P L1', 'AP energy L1'])).toEqual([
      'Total P', 'Total AP energy',
    ]);
    expect(binds('wb-map3et_8', ['P L1', 'AP energy L1', 'P L3', 'AP energy L3', 'Urms L1'])).toEqual([
      'P L1', 'AP energy L1', 'P L3', 'AP energy L3',
    ]);
  });

  it('serves the legacy template of WB-MAP3E too', () => {
    expect(serialDeviceId('WB-MAP3E', '8')).toBe('wb-map3e_8');
  });
});

describe('WB-MAP6S recipe', () => {
  it('makes a power sensor and an energy meter for each of the six inputs it has', () => {
    expect(binds('wb-map6s_3', ['P 1', 'AP energy 1', 'P 6', 'AP energy 6', 'Irms 1'])).toEqual([
      'P 1', 'AP energy 1', 'P 6', 'AP energy 6',
    ]);
  });
});

describe('meters in the list of supported models', () => {
  it('shows each meter once with power and energy types', () => {
    const meters = recipeModels().filter(({ title }) => title.startsWith('WB-MAP'));

    expect(meters.map(({ title }) => title)).toEqual(['WB-MAP12E', 'WB-MAP3E', 'WB-MAP3ET', 'WB-MAP6S']);
    expect(meters.every(({ types }) => types.join() === 'power_sensor,energy_meter')).toBe(true);
  });
});
