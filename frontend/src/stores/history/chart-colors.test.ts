import { ChartColors } from './chart-colors';

describe('ChartColors', () => {
  test('returns colors in sequence', () => {
    const colors = new ChartColors();
    const first = colors.nextColor();
    const second = colors.nextColor();
    expect(first).not.toEqual(second);
    expect(first.chartColor).toBeDefined();
    expect(first.minMaxColor).toBeDefined();
  });

  test('cycles back after exhausting all colors', () => {
    const colors = new ChartColors();
    const total = colors.colors.length;
    const first = colors.nextColor();
    for (let i = 1; i < total; i++) {
      colors.nextColor();
    }
    expect(colors.nextColor()).toEqual(first);
  });
});
