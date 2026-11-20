import { recipeModels, recipeModelTitle, recipeRows, serialDeviceId } from './recipes';

const controls = ['K1', 'Channel 1', 'K2', 'Channel 2', 'K3', 'Channel 3', 'Channel 1 with Auto-On', 'Input 1'];

describe('WB-MDM3 recipe', () => {
  it('makes three dimmable lights, each of a switch and its level', () => {
    expect(recipeRows('wb-mdm3_7', controls, new Set()).map(({ row, index }) => [row.type, row.bind, index])).toEqual(
      [1, 2, 3].map((index) => [
        'light', { on_off: `wb-mdm3_7/K${index}`, brightness: `wb-mdm3_7/Channel ${index}` }, index,
      ]),
    );
  });

  it.each(['tpl1_wb_mdm3', 'WB-MDM3', 'WB-MDM3-since-fw-2.12'])(
    'serves the %s template of the dimmer, also under a renamed id',
    (deviceType) => {
      const serial = { deviceType, params: {} };

      expect(serialDeviceId(deviceType, '7')).toBe('wb-mdm3_7');
      expect(recipeRows('hall-dimmer', controls, new Set(), () => true, serial)).toHaveLength(3);
      expect(recipeModelTitle('hall-dimmer', serial)).toBe('WB-MDM3');
    },
  );

  it('is shown once in the list of supported models', () => {
    expect(recipeModels().filter(({ title }) => title === 'WB-MDM3')).toEqual([
      { title: 'WB-MDM3', types: ['light'], count: 3 },
    ]);
  });
});
