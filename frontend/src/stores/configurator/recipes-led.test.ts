import { recipeModels, recipeRows, serialDeviceId } from './recipes';

const lamps = (controlIds: string[]) =>
  recipeRows('wb-led_42', controlIds, new Set()).map(({ row }) => row.bind);
const key = (controlId: string) => `wb-led_42/${controlId}`;

describe('WB-LED recipe', () => {
  it('makes an RGB lamp and a white lamp in the RGB+W mode', () => {
    const controls = [
      'RGB Strip', 'RGB Palette', 'RGB Strip Hue', 'RGB Strip Brightness', 'Hue Changing',
      'Channel 4', 'Channel 4 Brightness',
    ];

    expect(lamps(controls)).toEqual([
      { on_off: key('RGB Strip'), brightness: key('RGB Strip Brightness'), color: key('RGB Palette') },
      { on_off: key('Channel 4'), brightness: key('Channel 4 Brightness') },
    ]);
  });

  it('makes two lamps with color temperature in the CCT+CCT mode', () => {
    const controls = ['CCT1', 'CCT1 Temperature', 'CCT1 Brightness', 'CCT2', 'CCT2 Temperature', 'CCT2 Brightness'];

    expect(lamps(controls)).toEqual([1, 2].map((index) => ({
      on_off: key(`CCT${index}`),
      brightness: key(`CCT${index} Brightness`),
      color_temperature: key(`CCT${index} Temperature`),
    })));
  });

  it('takes a joined pair of channels once and the single channels next to it', () => {
    const controls = [
      'Channels 1_2', 'Channels 1_2 Brightness', 'Channel 3', 'Channel 3 Brightness', 'Channel 4',
      'Channel 4 Brightness',
    ];

    expect(lamps(controls).map((bind) => bind.on_off)).toEqual([
      key('Channels 1_2'), key('Channel 3'), key('Channel 4'),
    ]);
  });

  it('serves both templates of the model and shows it once without a channel counter', () => {
    expect(serialDeviceId('WB-LED-since-fw-3.8', '42')).toBe('wb-led_42');
    expect(recipeRows('strip', ['CCT1'], new Set(), () => true, { deviceType: 'WB-LED-since-fw-3.8', params: {} }))
      .toHaveLength(1);
    expect(recipeModels().filter(({ title }) => title === 'WB-LED')).toEqual([
      { title: 'WB-LED', types: ['light'], count: 1 },
    ]);
  });
});
