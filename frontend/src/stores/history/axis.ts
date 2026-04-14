import { type ChartTraits } from './chart-traits';
import { ChartType, type PlotlyData, type PlotlyLayout } from './types';

const Y_CHART_MARGIN = 25;

const makeBoolAxis = (index: number, axisCount: number, calcRange = false): Record<string, any> => {
  const axis: Record<string, any> = {
    type: 'linear',
    tickmode: 'array',
    tickvals: [0, 1],
    customdata: ChartType.Boolean,
  };
  if (axisCount > 1) {
    axis.domain = [index / axisCount, (index + 1) / axisCount];
    axis.range = [-0.1, 1.1];
  }
  if (calcRange) {
    axis.autorange = false;
    axis.range = [-1 / Y_CHART_MARGIN, 1 + 1 / Y_CHART_MARGIN];
  }
  return axis;
};

const getUptimeAxis = (): Record<string, any> => ({
  automargin: true,
  type: 'linear',
  tickmode: 'array',
  tickvals: [],
  ticktext: [],
  customdata: ChartType.UpTime,
});

const makeCommonAxis = (minValue?: number, maxValue?: number): Record<string, any> => {
  const axis: Record<string, any> = {
    automargin: true,
    type: 'linear',
    customdata: ChartType.Number,
  };
  if (minValue !== undefined && maxValue !== undefined) {
    const diff = maxValue - minValue;
    let min = minValue;
    let max = maxValue;
    if (diff >= 1) {
      min = Math.floor(minValue);
      max = Math.ceil(maxValue);
    } else {
      const k = Math.pow(10, -Math.round(Math.log10(diff)));
      min = Math.floor(minValue * k) / k;
      max = Math.ceil(maxValue * k) / k;
    }
    const delta = (max - min) / Y_CHART_MARGIN;
    axis.range = [min - delta, max + delta];
  }
  return axis;
};

export const fixBoolAxes = (
  layout: Partial<PlotlyLayout>,
  config: PlotlyData[],
  minValue?: number,
  maxValue?: number
) => {
  const isBoolAxis = (axis?: Record<string, any>) => axis?.customdata === ChartType.Boolean;
  const isCommonAxis = (axis?: Record<string, any>) => axis?.customdata === ChartType.Number;

  if (isBoolAxis(layout.yaxis) && isCommonAxis(layout.yaxis2)) {
    layout.yaxis = makeBoolAxis(0, 1, true);
    layout.yaxis2 = makeCommonAxis(minValue, maxValue);
    layout.yaxis2.overlaying = 'y';
    layout.yaxis2.side = 'right';
    return;
  }
  if (isCommonAxis(layout.yaxis) && isBoolAxis(layout.yaxis2)) {
    layout.yaxis = makeCommonAxis(minValue, maxValue);
    layout.yaxis2 = makeBoolAxis(0, 1, true);
    layout.yaxis2.overlaying = 'y';
    layout.yaxis2.side = 'right';
    return;
  }

  if (isBoolAxis(layout.yaxis) && !layout.yaxis2) {
    config.forEach((chart, index) => {
      const axisProp = index === 0 ? 'yaxis' : `yaxis${index + 1}`;
      layout[axisProp] = makeBoolAxis(index, config.length);
      chart.yaxis = index === 0 ? 'y' : `y${index + 1}`;
    });
  }
};

const makeStringAxis = (): Record<string, any> => {
  return {
    type: 'category',
    customdata: ChartType.String,
  };
};

export const getAxis = (chart: ChartTraits, layout: Partial<PlotlyLayout>) => {
  if (!layout.yaxis || !layout.yaxis.customdata) {
    layout.yaxis = chart.type === ChartType.String
      ? makeStringAxis()
      : chart.type === ChartType.Boolean
        ? makeBoolAxis(0, 1)
        : chart.type === ChartType.UpTime
          ? getUptimeAxis()
          : makeCommonAxis();
    return 'y';
  }

  if (
    chart.type === layout.yaxis.customdata &&
    [ChartType.Boolean, ChartType.Number].includes(chart.type)
  ) {
    return 'y';
  }

  if (!layout.yaxis2) {
    layout.yaxis2 = chart.type === ChartType.String
      ? makeStringAxis()
      : chart.type === ChartType.Boolean
        ? makeBoolAxis(0, 1)
        : chart.type === ChartType.UpTime
          ? getUptimeAxis()
          : makeCommonAxis();
    layout.yaxis2.overlaying = 'y';
    layout.yaxis2.side = 'right';
  }
  return 'y2';
};
