import { recipeModels, recipeModelTitle, recipeRows, serialDeviceId } from './recipes';

const binds = (deviceId: string, controls: string[]) =>
  recipeRows(deviceId, controls, new Set()).map(({ row }) => [row.type, row.bind]);

describe('WB-MS v.2 recipe', () => {
  it('makes the three built-in sensors and leaves the 1-Wire ones out', () => {
    const controls = [
      'Temperature', 'Humidity', 'Illuminance', 'Air Quality (VOC)', 'Temperature 1:1', 'External Sensor 1',
    ];

    expect(binds('wb-ms_15', controls)).toEqual([
      ['temperature_sensor', { temperature: 'wb-ms_15/Temperature' }],
      ['humidity_sensor', { humidity: 'wb-ms_15/Humidity' }],
      ['illuminance_sensor', { illuminance: 'wb-ms_15/Illuminance' }],
    ]);
  });

  it.each(['tpl1_wb_ms_v2', 'WB-MS-v2-since-fw-4.36', 'WB-MS v.2'])('serves the %s template', (deviceType) => {
    expect(serialDeviceId(deviceType, '15')).toBe('wb-ms_15');
    expect(recipeModelTitle('sensor', { deviceType, params: {} })).toBe('WB-MS v.2');
  });
});

describe('WB-M1W2 recipe', () => {
  it('takes the sensor of each input in the template with two external sensors', () => {
    expect(binds('wb-m1w2_30', ['External Sensor 1', 'External Sensor 2', 'Input 1'])).toEqual([
      ['temperature_sensor', { temperature: 'wb-m1w2_30/External Sensor 1' }],
      ['temperature_sensor', { temperature: 'wb-m1w2_30/External Sensor 2' }],
    ]);
  });

  it('takes only the first sensor of each bus in the template with many sensors per bus', () => {
    const controls = ['Temperature 1:1', 'Temperature 1:2', 'Temperature 1:20', 'Temperature 2:1', 'Temperature 2:2'];

    expect(binds('wb-m1w2_30', controls).map(([, bind]) => Object.values(bind)[0])).toEqual([
      'wb-m1w2_30/Temperature 1:1', 'wb-m1w2_30/Temperature 2:1',
    ]);
    expect(recipeModelTitle('w1', { deviceType: 'WB-M1W2 BUTTONS', params: {} })).toBe('WB-M1W2 v.3');
  });
});

describe('WB-MAO4 recipe', () => {
  it('makes a dimmable light of the switch and the dimming level of each output', () => {
    const controls = [1, 2, 3, 4].flatMap((index) => [
      `Channel ${index} Switch`, `Channel ${index} Dimming Level`, `Channel ${index}`,
    ]);
    const rows = recipeRows('wb-mao4_55', controls, new Set(), () => true, {
      deviceType: 'WB-MAO4-since-fw-2.9', params: {},
    });

    expect(rows.map(({ row, index }) => [row.bind, index])).toEqual([1, 2, 3, 4].map((index) => [
      { on_off: `wb-mao4_55/Channel ${index} Switch`, brightness: `wb-mao4_55/Channel ${index} Dimming Level` },
      index,
    ]));
  });
});

describe('list of supported models', () => {
  it('shows the three new models once each', () => {
    const models = recipeModels().filter(({ title }) => ['WB-MS v.2', 'WB-M1W2 v.3', 'WB-MAO4'].includes(title));

    expect(models).toEqual([
      { title: 'WB-MS v.2', types: ['temperature_sensor', 'humidity_sensor', 'illuminance_sensor'], count: 1 },
      { title: 'WB-M1W2 v.3', types: ['temperature_sensor'], count: 2 },
      { title: 'WB-MAO4', types: ['light'], count: 4 },
    ]);
  });
});
