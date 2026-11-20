import { recipeRows } from './recipes';

const binds = (deviceId: string, controlIds: string[], used: string[] = []) =>
  recipeRows(deviceId, controlIds, new Set(used))?.map(({ row, index }) => [row.type, row.bind, index]);

describe('recipeRows', () => {
  it('has no recipe for a model with modes or for a device that is not WB over Modbus', () => {
    expect(recipeRows('wb-mr6cv3_137', ['K1'], new Set())).toBeNull();
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
});
