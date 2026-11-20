import {
  recipeModels, recipeModelTitle, recipeRows, recipeSkipped, serialDeviceId,
} from './recipes';

const binds = (deviceId: string, controlIds: string[], used: string[] = []) =>
  recipeRows(deviceId, controlIds, new Set(used))?.map(({ row, index }) => [row.type, row.bind, index]);

describe('recipeRows', () => {
  it('has no recipe for a model with modes or for a device that is not WB over Modbus', () => {
    expect(recipeRows('wb-led_42', ['Channel 1'], new Set())).toBeNull();
    expect(recipeRows('wb-gpio', ['A1_OUT'], new Set())).toBeNull();
  });

  it('makes WB-MSW v.4 sensors only of the controls the device really has', () => {
    expect(binds('wb-msw-v4_90', ['Temperature', 'Humidity', 'Illuminance', 'Buzzer'])).toEqual([
      ['temperature_sensor', { temperature: 'wb-msw-v4_90/Temperature' }, null],
      ['humidity_sensor', { humidity: 'wb-msw-v4_90/Humidity' }, null],
      ['illuminance_sensor', { illuminance: 'wb-msw-v4_90/Illuminance' }, null],
    ]);
  });

  it('numbers the relays and skips the ones already used in another device', () => {
    const controls = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'Input 1'];

    expect(binds('wb-mrps6_12', controls, ['wb-mrps6_12/K2'])?.map(([, bind, index]) => [bind, index])).toEqual(
      [1, 3, 4, 5, 6].map((index) => [{ on_off: `wb-mrps6_12/K${index}` }, index]),
    );
  });

  it('joins the switch and the level of a WB-MDM3 channel into one light, brightness being optional', () => {
    expect(binds('wb-mdm3_7', ['K1', 'Channel 1', 'K2', 'Channel 3'])).toEqual([
      ['light', { on_off: 'wb-mdm3_7/K1', brightness: 'wb-mdm3_7/Channel 1' }, 1],
      ['light', { on_off: 'wb-mdm3_7/K2' }, 2],
    ]);
  });

  it('takes only the outputs of a WB-MR6C that fit the role: a pair in the curtain mode is read-only', () => {
    const controls = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'Curtain 1 Open', 'Curtain 1 Close'];
    const isWritable = (controlId: string) => !['K1', 'K2'].includes(controlId);

    const rows = recipeRows('wb-mr6cv3_137', controls, new Set(), isWritable);

    expect(rows.map(({ row, index }) => [row.bind.on_off, index])).toEqual(
      [3, 4, 5, 6].map((index) => [`wb-mr6cv3_137/K${index}`, index]),
    );
    expect(recipeSkipped('wb-mr6cv3_137', controls)).toBe(1);
  });

  it('reports nothing skipped for a relay without curtains and for a model without that mode', () => {
    expect(recipeSkipped('wb-mr3_5', ['K1', 'K2', 'K3'])).toBe(0);
    expect(recipeSkipped('wb-msw-v4_90', ['Temperature'])).toBe(0);
  });
});

describe('recipes with the wb-mqtt-serial config', () => {
  const relay = (params: Record<string, unknown>) => ({ deviceType: 'WB-MR6C v.3', params });
  const controls = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6'];
  const outputs = (deviceId: string, serial: ReturnType<typeof relay>) =>
    recipeRows(deviceId, controls, new Set(), () => true, serial)?.map(({ index }) => index);

  it('finds the recipe by the device type, so a renamed device still gets it', () => {
    expect(outputs('kitchen-relays', relay({}))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(recipeRows('kitchen-relays', controls, new Set())).toBeNull();
  });

  it('leaves out the pair of outputs that the config puts into the curtain mode', () => {
    expect(outputs('wb-mr6cv3_137', relay({ curtain1_mode: 1, curtain2_mode: 0 }))).toEqual([3, 4, 5, 6]);
    expect(outputs('wb-mr6cv3_137', relay({ curtain2_mode: 1, curtain3_mode: 1 }))).toEqual([1, 2]);
  });

  it('has no recipe for a device whose type in the config is not in the recipes, whatever its id', () => {
    expect(recipeRows('wb-mr6cv3_137', controls, new Set(), () => true, { deviceType: 'WB-LED', params: {} }))
      .toBeNull();
  });

  it('builds the MQTT id of a config entry: its own id or the model with the address', () => {
    expect(serialDeviceId('WB-MSW v.4', '90')).toBe('wb-msw-v4_90');
    expect(serialDeviceId('WB-MSW v.4', '90', 'hall')).toBe('hall');
    expect(serialDeviceId('WB-LED', '42')).toBeNull();
  });
});

describe('recipe models', () => {
  it('lists every model with a recipe under a readable title with its channel types', () => {
    const models = recipeModels();

    expect(models.map(({ title }) => title)).toContain('WB-MRM2-mini');
    expect(models.find(({ title }) => title === 'WB-MDM3')).toEqual({ title: 'WB-MDM3', types: ['light'], count: 3 });
    expect(models.find(({ title }) => title === 'WB-MSW v.4').types).toHaveLength(4);
    const relays = models.filter(({ title }) => ['WB-MR6C', 'WB-MR3', 'WB-MRM2-mini'].includes(title));
    expect(relays.map(({ count }) => count)).toEqual([6, 3, 2]);
  });

  it('names the model of a device by its id or by the type from the config, null without a recipe', () => {
    expect(recipeModelTitle('wb-mdm3_7')).toBe('WB-MDM3');
    expect(recipeModelTitle('dimmer', { deviceType: 'tpl1_wb_mdm3', params: {} })).toBe('WB-MDM3');
    expect(recipeModelTitle('wb_ups_v3_183')).toBeNull();
  });
});
