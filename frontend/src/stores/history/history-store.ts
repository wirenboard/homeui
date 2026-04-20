import { subDays } from 'date-fns';
import { makeAutoObservable, runInAction } from 'mobx';
import { type DashboardsStore, type Widget } from '@/stores/dashboards';
import { type Cell, type Device, type DevicesStore } from '@/stores/devices';
import i18n from '~/i18n/react/config';
import { fixBoolAxes, getAxis } from './axis';
import { ChartColors } from './chart-colors';
import { ChartTraits } from './chart-traits';
import { splitDate } from './date';
import { decode, encodeControls } from './history-url';
import {
  type ChartsControl,
  ChartType, type HistoryValue,
  type LoadHistoryResponse,
  type PlotlyData,
  type PlotlyLayout,
  type PlotRelayoutEvent,
  type TableRow,
  type UrlControl,
} from './types';

const HISTORY_MAX_POINTS = 1000;

export default class HistoryStore {
  private readonly $state: any;
  private chartContainer: HTMLDivElement | null = null;
  public errors = [];
  public controls: ChartsControl[] = [];
  public selectedControls: (string | null)[] = [null];
  public charts: ChartTraits[] = [];
  public chartConfig: PlotlyData[] = [];
  public layoutConfig: Partial<PlotlyLayout>;
  public dataPointsMultiple: TableRow[] = [];
  public chunksN = 0;
  public loadPending = false;
  public disableUi = true;
  public stopLoadData = false;
  public selectedStartDate: Date | null = null;
  public selectedEndDate: Date | null = null;
  private loadId = 0;

  readonly #dashboardsStore: DashboardsStore;
  readonly #devicesStore: DevicesStore;
  readonly #historyProxy: any;

  constructor(deps: { historyProxy: any; $state: any; dashboardsStore: DashboardsStore; devicesStore: DevicesStore }) {
    this.#historyProxy = deps.historyProxy;
    this.$state = deps.$state;
    this.#dashboardsStore = deps.dashboardsStore;
    this.#devicesStore = deps.devicesStore;
    this.layoutConfig = this.#getDefaultLayoutConfig();

    makeAutoObservable(this, {}, { autoBind: true });
  }

  initialize(id?: string) {
    this.readDatesFromUrl(id);
    this.buildControls(id);
  }

  setChartContainerRef(ref: HTMLDivElement | null) {
    this.chartContainer = ref;
  }

  readDatesFromUrl(id?: string) {
    const stateFromUrl = decode(id);
    this.selectedStartDate = stateFromUrl.s || subDays(new Date(), 1);
    this.selectedEndDate = stateFromUrl.e || new Date();
  }

  resetDates() {
    this.readDatesFromUrl();
  }

  prepareLoad() {
    this.stopLoadData = false;
  }

  loadData(isFullScreen: boolean) {
    if (this.stopLoadData) {
      return;
    }
    const controlsForUrl: Array<UrlControl> = [];
    const uniqueCells = new Set<string>();
    this.selectedControls.forEach((id) => {
      if (!id) {
        return;
      }
      const [deviceId, controlId, widgetId] = id.split('/');
      if (!uniqueCells.has(id)) {
        uniqueCells.add(id);
        controlsForUrl.push({
          d: deviceId,
          c: controlId,
          w: widgetId,
        });
      }
    });

    const startValue = this.selectedStartDate;
    const endValue = this.selectedEndDate;
    const id = encodeControls(
      controlsForUrl,
      startValue ? startValue.getTime() : undefined,
      endValue ? endValue.getTime() : undefined,
    );

    const params: Record<string, unknown> = { id };
    if (isFullScreen) {
      params.fullscreen = true;
    }
    this.$state.go('history.sample', params, { reload: true, inherit: false, notify: true });
  }

  setSelectedControlValue(index: number, control: string | null) {
    const updated = [...this.selectedControls];
    updated[index] = control;
    this.selectedControls = updated;
  }

  removeControlAt(index: number) {
    const updated = [...this.selectedControls];
    updated.splice(index, 1);
    this.selectedControls = updated;
  }

  addControlSlot() {
    this.selectedControls = [...this.selectedControls, null];
  }

  setSelectedStartDateFromInput(value: Date) {
    this.selectedStartDate = value || null;

    if (this.selectedStartDate && this.selectedEndDate) {
      if (this.selectedStartDate.getTime() >= this.selectedEndDate.getTime()) {
        const nextEnd = new Date(this.selectedStartDate);
        nextEnd.setDate(nextEnd.getDate() + 1);
        this.selectedEndDate = nextEnd;
      }
    }
  }

  setSelectedEndDateFromInput(value: Date) {
    this.selectedEndDate = value || null;
  }

  makeChartsControlFromCell(device: Device, cell: Cell, groupName: string, widget?: Widget): ChartsControl {
    return {
      name: widget
        ? `${widget.name} (${device.name} / ${cell.name})`
        : `${device.name} / ${cell.name}`,
      group: groupName,
      deviceId: cell.deviceId,
      controlId: cell.controlId,
      valueType: cell.valueType,
      widget,
    };
  }

  buildControls(id?: string) {
    const widgetChannelsMsg = i18n.t('history.labels.widget_channels');
    const allChannelsMsg = i18n.t('history.labels.all_channels');
    const widgetControls = [...this.#dashboardsStore.widgets.values()]
      .flatMap((widget) => widget.cells
        .filter((item) => item.id)
        .map((item) => {
          try {
            const cell = this.#devicesStore.cells.get(item.id);
            const device = this.#devicesStore.devices.get(cell.deviceId);
            return this.makeChartsControlFromCell(device, cell, widgetChannelsMsg, widget);
          } catch (error) {
            const deviceControl = item.id.split('/');
            return {
              name: `${widget.name} (${deviceControl[0]} / ${deviceControl[1]})`,
              group: widgetChannelsMsg,
              deviceId: deviceControl[0],
              controlId: deviceControl[1],
              widget,
            };
          }
        }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const allControls = Array.from(this.#devicesStore.filteredDevices.keys()).sort()
      .flatMap((deviceId) => {
        const device = this.#devicesStore.devices.get(deviceId);
        return [...device.cells].map((cellId) => {
          const cell = this.#devicesStore.cells.get(cellId);
          return this.makeChartsControlFromCell(device, cell, allChannelsMsg);
        });
      });

    this.controls = [...widgetControls, ...allControls];

    const selected: string[] = [];
    const controlsFromUrl: UrlControl[] = decode(id).c || [];

    if (controlsFromUrl.length) {
      controlsFromUrl.forEach((control) => {
        const cn = this.controls.find((element) =>
          element.deviceId === control.d &&
          element.controlId === control.c &&
          (element.widget ? element.widget.id === control.w : !control.w));
        if (cn) {
          let id = `${cn.deviceId}/${cn.controlId}`;
          if (cn.widget) {
            id += `/${cn.widget.id}`;
          }
          selected.push(id);
        } else {
          // If the device hasn't loaded yet, add a "placeholder"
          selected.push(`${control.d}/${control.c}`);
        }
      });
    }

    if (selected.length) {
      this.selectedControls = selected;
      this.startLoading(selected);
    } else {
      this.selectedControls = [null];
      this.disableUi = false;
    }
  }

  createMainChart(chart: ChartTraits, lineColor: string, axisName: string): PlotlyData {
    return {
      name: chart.channelName,
      x: chart.xValues,
      y: chart.yValues,
      text: chart.text,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { size: 3 },
      line: {
        shape: [ChartType.Boolean, ChartType.String].includes(chart.type) ? 'hv' : 'linear',
        color: lineColor,
        width: 1,
      },
      hovertemplate: '%{text}<extra></extra>',
      yaxis: axisName,
    };
  }

  createErrorChart(chart: ChartTraits, fillColor: string, axisName: string): PlotlyData {
    return {
      name: `Δ ${chart.channelName}`,
      x: [...chart.xValues, ...[...chart.xValues].reverse()],
      y: [...chart.maxErrors, ...[...chart.minErrors].reverse()],
      type: 'scatter',
      fill: 'toself',
      fillcolor: fillColor,
      line: { color: 'transparent' },
      hoverinfo: 'skip',
      yaxis: axisName,
    };
  }

  makeUpTimeAxisTicks(layout: Partial<PlotlyLayout>) {
    const uptimeChart = this.charts.find((chart) => chart.type === ChartType.UpTime);
    if (!uptimeChart || !layout.yaxis || uptimeChart.maxValue === undefined || uptimeChart.minValue === undefined) {
      return;
    }

    const intervalCount = 5;
    const minuteFraction = 60;
    const fiveMinuteFraction = 5 * minuteFraction;
    const hourFraction = 60 * minuteFraction;
    const dayFraction = 24 * hourFraction;

    let range = ((uptimeChart.maxValue as number) - (uptimeChart.minValue as number)) / intervalCount;
    let stepFraction = fiveMinuteFraction;

    if (range > dayFraction) {
      stepFraction = dayFraction;
    } else if (range > hourFraction) {
      stepFraction = hourFraction;
    }

    let realMaxValue = Math.ceil((uptimeChart.maxValue as number) / stepFraction) * stepFraction;
    let realMinValue = Math.floor((uptimeChart.minValue as number) / stepFraction) * stepFraction;
    if (stepFraction === fiveMinuteFraction) {
      realMinValue = Math.floor(realMinValue / fiveMinuteFraction) * fiveMinuteFraction;
      realMaxValue = realMaxValue + (realMaxValue - realMinValue) * 0.1;
    }
    range = (realMaxValue - realMinValue) / intervalCount;

    let step: number;
    if (range > dayFraction) {
      step = Math.ceil(range / dayFraction) * dayFraction;
    } else if (range > hourFraction) {
      step = Math.ceil(range / hourFraction) * hourFraction;
    } else {
      step = Math.ceil(range / fiveMinuteFraction) * fiveMinuteFraction;
    }

    const tickVals = Array.from({ length: intervalCount + 1 }, (_, i) => realMinValue + i * step);
    const tickText = tickVals.map((tValue) => {
      let t = tValue;
      const days = Math.floor(t / dayFraction);
      t -= days * dayFraction;
      const hours = Math.floor(t / hourFraction);
      t -= hours * hourFraction;
      const minutes = Math.floor(t / minuteFraction);
      let res = '';
      if (days || step > dayFraction) {
        res += `${days}d `;
      }
      if (step > dayFraction) {
        return res;
      }
      if (hours || step > hourFraction) {
        res += `${hours}h `;
      }
      if (step > hourFraction) {
        return res;
      }
      return `${res}${minutes}m`;
    });

    layout.yaxis.tickvals = tickVals;
    layout.yaxis.ticktext = tickText;
    layout.yaxis.range = [realMinValue, realMaxValue];
  }

  buildCharts() {
    const colors = new ChartColors();
    let minValue: (string | number) | undefined;
    let maxValue: (string | number) | undefined;
    const layout: Partial<PlotlyLayout> = this.#getDefaultLayoutConfig();
    const config: PlotlyData[] = [];

    this.charts.forEach((chart) => {
      if (chart.xValues.length) {
        minValue = minValue === undefined
          ? chart.minValue
          : Math.min(minValue as number, (chart.minValue ?? minValue) as number);
        maxValue = maxValue === undefined
          ? chart.maxValue
          : Math.max(maxValue as number, (chart.maxValue ?? maxValue) as number);
        const axisName = getAxis(chart, layout);
        const color = colors.nextColor();
        config.push(this.createMainChart(chart, color.chartColor, axisName));
        if (chart.hasErrors) {
          config.push(this.createErrorChart(chart, color.minMaxColor, axisName));
        }
      }
    });

    fixBoolAxes(layout, config, minValue as number, maxValue as number);
    if (layout.yaxis?.customdata === ChartType.UpTime) {
      this.makeUpTimeAxisTicks(layout);
    }
    if (layout.yaxis2?.customdata === ChartType.UpTime) {
      this.makeUpTimeAxisTicks({ ...layout, yaxis: layout.yaxis2 });
    }

    layout.height = 450 + config.length * 19;
    return { config, layout };
  }

  calculateTable(config: PlotlyData[]) {
    const graph: TableRow[] = [];
    const dates = new Set<number>();
    const chartList = this.charts;
    const lastKnownValues: Array<string | number | null> = Array(chartList.length).fill(null);

    const slowDates = new Set<number>();
    chartList.forEach((chart) => {
      if (chart.type === ChartType.Number || chart.type === ChartType.UpTime) {
        chart.xValues.forEach((x) => slowDates.add(x.valueOf()));
      }
    });

    const dataMaps = config.map((ctrl) => {
      const xValues = ctrl.x as Date[];
      const yValues = ctrl.y as number[];
      const textValues = ctrl.text as string[];
      const map = new Map<number, { y: number; text: string }>();

      xValues?.forEach((x, i) => {
        const val = x.valueOf();
        dates.add(val);
        map.set(val, { y: yValues?.[i], text: textValues?.[i] });
      });
      return map;
    });

    Array.from(dates).sort().forEach((date) => {
      const isSlowDate = slowDates.has(date);
      const row: TableRow = {
        date,
        value: Array(chartList.length).fill(null),
        showMs: false,
      };

      let configIdx = 0;
      chartList.forEach((ctrl, iCtrl) => {
        if (!ctrl.xValues.length) {
          return;
        }
        const point = dataMaps[configIdx].get(date);
        if (point && point.y !== null && point.y !== undefined) {
          row.value[iCtrl] = ctrl.type === ChartType.UpTime ? point.text : point.y;
          if (ctrl.type === ChartType.Number || ctrl.type === ChartType.UpTime) {
            lastKnownValues[iCtrl] = row.value[iCtrl];
          }
          if (ctrl.hasBooleanValues) {
            row.showMs = true;
          }
        } else if (isSlowDate && lastKnownValues[iCtrl] !== null) {
          row.value[iCtrl] = lastKnownValues[iCtrl];
        }
        configIdx += 1;
        if (ctrl.hasErrors) {
          configIdx += 1; // skip error chart in dataMaps for table values
        }
      });
      graph.push(row);
    });
    return graph.filter((row) => row.value.some((v) => v !== null));
  }

  fillMissingDatesByFilter(config: PlotlyData[]) {
    // check main chart length to avoid fake chart values generated by null value
    if (!config.length || config.at(0)?.y.filter((item: any) => !item).length <= 1) {
      return config;
    }
    const first = config[0];
    const xValues = first.x as Date[];
    const yValues = first.y as number[];
    const textValues = first.text as Array<string | number>;

    xValues?.unshift(new Date(this.selectedStartDate));
    yValues?.unshift(null);
    textValues?.unshift(0);

    xValues?.push(new Date(this.selectedEndDate));
    yValues?.push(null);
    textValues?.push(0);
    return config;
  }

  processDbRecord(record: HistoryValue, chart: ChartTraits) {
    const ts = new Date();
    if (chart.hasBooleanValues) {
      ts.setTime(record.t * 1000);
    } else {
      ts.setTime(Math.round(record.t) * 1000);
    }

    if (chart.type === ChartType.UpTime) {
      const uptimeParts = (record.v as string).split(' ');
      let seconds = 0;
      uptimeParts.forEach((part) => {
        const intValue = parseInt(part, 10);
        const unit = part[part.length - 1];
        if (unit === 'd') {
          seconds += intValue * 24 * 60 * 60;
        } else if (unit === 'h') {
          seconds += intValue * 60 * 60;
        } else if (unit === 'm') {
          seconds += intValue * 60;
        }
      });
      if (chart.xValues.length > 0) {
        const lastUpTime = chart.yValues[chart.yValues.length - 1] as number;

        if (lastUpTime > seconds) {
          let newDate = new Date(chart.xValues[chart.xValues.length - 1]);
          newDate.setMilliseconds(newDate.getMilliseconds() + 1);
          chart.xValues.push(newDate);
          chart.yValues.push(0);
          chart.text.push('0d 0h 0m');
          newDate = new Date(ts);
          newDate.setMilliseconds(ts.getMilliseconds() - seconds * 1000);
          chart.xValues.push(newDate);
          chart.yValues.push(0);
          chart.text.push('0d 0h 0m');
          chart.minValue = 0;
        }
      }
      chart.yValues.push(seconds);
      chart.xValues.push(ts);
      chart.text.push(record.v);
      chart.maxValue = chart.maxValue === undefined ? seconds : Math.max(chart.maxValue as number, seconds);
      chart.minValue = chart.minValue === undefined ? seconds : Math.min(chart.minValue as number, seconds);
      return;
    }

    chart.xValues.push(ts);
    chart.yValues.push(record.v);
    if ((record.max && record.max !== record.v) || (record.min && record.min !== record.v)) {
      chart.text.push(`${record.v} [${record.min}, ${record.max}]`);
    } else {
      chart.text.push(chart.hasBooleanValues ? String(parseInt(record.v as string, 10)) : record.v);
    }
    chart.maxErrors.push(record.max ? record.max : record.v);
    chart.minErrors.push(record.min ? record.min : record.v);
    if (chart.type === ChartType.Number) {
      chart.minValue = chart.minValue === undefined
        ? record.v
        : Math.min(chart.minValue as number, record.v as number, (record.min ?? record.v) as number);
      chart.maxValue = chart.maxValue === undefined
        ? record.v
        : Math.max(chart.maxValue as number, record.v as number, (record.max ?? record.v) as number);
    }
  }

  processChunk(
    chunk: LoadHistoryResponse,
    indexOfControl: number,
    indexOfChunk: number,
    chunks: string[],
    loadId: number,
  ) {
    if (loadId !== this.loadId || this.stopLoadData) return;

    const chart = this.charts[indexOfControl];
    chart.progress.value = indexOfChunk + 1;
    chunk.values.forEach((item) => this.processDbRecord(item, chart));
    this.charts = [...this.charts];

    if (indexOfChunk + 2 < chunks.length) {
      this.loadChunkedHistory(indexOfControl, indexOfChunk + 1, chunks, loadId);
    } else {
      chart.progress.isLoaded = true;
      this.charts = [...this.charts];

      this.beforeLoadChunkedHistory(indexOfControl + 1, chunks, loadId);
    }
  }

  loadHistory(params: any, indexOfControl: number, indexOfChunk: number, chunks: string[], loadId: number) {
    if (this.stopLoadData) {
      this.loadPending = false;
      this.disableUi = false;
      return;
    }
    this.#historyProxy.get_values(params)
      .then((result: LoadHistoryResponse) => {
        runInAction(() => {
          if (loadId !== this.loadId) return;

          this.processChunk(result, indexOfControl, indexOfChunk, chunks, loadId);
          this.errors = [];
        });
      })
      .catch(() => {
        runInAction(() => {
          this.loadPending = false;
          this.disableUi = false;
          this.errors = [{ variant: 'danger', text: i18n.t('history.errors.load') }];
        });
      });
  }

  loadChunkedHistory(indexOfControl: number, indexOfChunk: number, chunks: string[], loadId: number) {
    if (loadId !== this.loadId) return;

    const control = this.selectedControls[indexOfControl];
    if (!control) {
      return;
    }

    const [deviceId, controlId] = control.split('/');
    const params: Record<string, any> = {
      channels: [[deviceId, controlId]],
      limit: HISTORY_MAX_POINTS,
      ver: 1,
    };

    const start = new Date(chunks[indexOfChunk]);
    const end = new Date(chunks[indexOfChunk + 1]);
    params.timestamp = {
      gt: indexOfChunk === 0 ? start.getTime() / 1000 - 1 : start.getTime() / 1000 + 1,
      lt: end.getTime() / 1000,
    };
    const intervalMs = end.getTime() - start.getTime();
    params.min_interval = Math.trunc((intervalMs / params.limit) * 1.1);
    params.max_records = this.chartContainer
      ? Math.min(HISTORY_MAX_POINTS, Math.ceil(this.chartContainer.offsetWidth / (chunks.length - 1)))
      : HISTORY_MAX_POINTS;
    params.with_milliseconds = true;

    this.loadHistory(params, indexOfControl, indexOfChunk, chunks, loadId);
  }

  beforeLoadChunkedHistory(indexOfControl = 0, chunks: string[], loadId: number) {
    if (loadId !== this.loadId) return;

    if (!this.selectedControls[indexOfControl]) {
      this.loadPending = false;
      const { config, layout } = this.buildCharts();
      const filledConfig = this.fillMissingDatesByFilter(config);
      this.chartConfig = filledConfig;
      this.layoutConfig = layout;
      this.dataPointsMultiple = this.calculateTable(filledConfig);
      this.disableUi = false;
      return;
    }
    const chunkInterval = 1;
    const parts = chunks || splitDate(this.selectedStartDate, this.selectedEndDate, chunkInterval + 1);
    this.chunksN = parts.length - 1;
    this.loadChunkedHistory(indexOfControl, 0, parts, loadId);
  }

  startLoading(controlsToLoad: string[]) {
    this.loadId++;
    const currentLoadId = this.loadId;

    this.selectedControls = controlsToLoad;
    this.stopLoadData = false;
    this.loadPending = true;
    this.disableUi = true;
    this.charts = controlsToLoad.map((control) => {
      const [deviceId, controlId, widgetId] = control.split('/');
      const chartControl = this.controls.find((item) => {
        if (widgetId) {
          return item.controlId === controlId && item.deviceId === deviceId && item.widget.id === widgetId;
        } else {
          return item.controlId === controlId && item.deviceId === deviceId;
        }
      });
      return new ChartTraits(chartControl);
    });
    this.chartConfig = [];
    this.dataPointsMultiple = [];
    this.beforeLoadChunkedHistory(0, undefined, currentLoadId);
  }

  stopLoadingData() {
    this.loadId++;
    this.stopLoadData = true;
    this.loadPending = false;
    this.disableUi = false;
  }

  onRelayout(event: PlotRelayoutEvent) {
    const start = event['xaxis.range[0]'];
    const end = event['xaxis.range[1]'];
    if (start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      this.selectedStartDate = startDate;
      this.selectedEndDate = endDate;
    }
  }

  #getDefaultLayoutConfig() {
    return {
      margin: { b: 40, t: 20, l: 0, r: 0 },
      legend: { x: 0, y: 100 },
      hovermode: 'x unified',
      modebar: { remove: ['lasso', 'select', 'resetscale'] },
      yaxis: {},
    };
  }
}
