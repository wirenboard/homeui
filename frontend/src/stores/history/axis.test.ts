import { fixBoolAxes, getAxis } from './axis';
import { ChartTraits } from './chart-traits';
import { ChartType } from './types';

const makeChart = (type: ChartType): ChartTraits => {
  const ctrl = { name: 'Test', group: 'All', deviceId: 'd', controlId: 'c', valueType: 'number' as const };
  const chart = new ChartTraits(ctrl);
  (chart as any).type = type;
  return chart;
};

describe('getAxis', () => {
  test('assigns first chart to yaxis', () => {
    const layout: any = {};
    const result = getAxis(makeChart(ChartType.Number), layout);
    expect(result).toBe('y');
    expect(layout.yaxis.customdata).toBe(ChartType.Number);
  });

  test('reuses yaxis for same Number type', () => {
    const layout: any = {};
    getAxis(makeChart(ChartType.Number), layout);
    const result = getAxis(makeChart(ChartType.Number), layout);
    expect(result).toBe('y');
    expect(layout.yaxis2).toBeUndefined();
  });

  test('reuses yaxis for same Boolean type', () => {
    const layout: any = {};
    getAxis(makeChart(ChartType.Boolean), layout);
    const result = getAxis(makeChart(ChartType.Boolean), layout);
    expect(result).toBe('y');
  });

  test('assigns different type to yaxis2', () => {
    const layout: any = {};
    getAxis(makeChart(ChartType.Number), layout);
    const result = getAxis(makeChart(ChartType.Boolean), layout);
    expect(result).toBe('y2');
    expect(layout.yaxis2.customdata).toBe(ChartType.Boolean);
    expect(layout.yaxis2.overlaying).toBe('y');
    expect(layout.yaxis2.side).toBe('right');
  });

  test('creates String axis', () => {
    const layout: any = {};
    getAxis(makeChart(ChartType.String), layout);
    expect(layout.yaxis.type).toBe('category');
  });

  test('creates UpTime axis', () => {
    const layout: any = {};
    getAxis(makeChart(ChartType.UpTime), layout);
    expect(layout.yaxis.customdata).toBe(ChartType.UpTime);
    expect(layout.yaxis.tickmode).toBe('array');
  });
});

describe('fixBoolAxes', () => {
  test('splits multiple bool charts into separate axes', () => {
    const layout: any = { yaxis: { customdata: ChartType.Boolean } };
    const config: any[] = [
      { yaxis: 'y' },
      { yaxis: 'y' },
    ];

    fixBoolAxes(layout, config);

    expect(config[0].yaxis).toBe('y');
    expect(config[1].yaxis).toBe('y2');
    expect(layout.yaxis2).toBeDefined();
  });

  test('adjusts bool+common combination (bool first)', () => {
    const layout: any = {
      yaxis: { customdata: ChartType.Boolean },
      yaxis2: { customdata: ChartType.Number },
    };
    const config: any[] = [];

    fixBoolAxes(layout, config, 0, 100);

    expect(layout.yaxis.customdata).toBe(ChartType.Boolean);
    expect(layout.yaxis2.customdata).toBe(ChartType.Number);
    expect(layout.yaxis2.overlaying).toBe('y');
  });

  test('adjusts common+bool combination (common first)', () => {
    const layout: any = {
      yaxis: { customdata: ChartType.Number },
      yaxis2: { customdata: ChartType.Boolean },
    };
    const config: any[] = [];

    fixBoolAxes(layout, config, 0, 100);

    expect(layout.yaxis.customdata).toBe(ChartType.Number);
    expect(layout.yaxis2.customdata).toBe(ChartType.Boolean);
    expect(layout.yaxis2.side).toBe('right');
  });
});
