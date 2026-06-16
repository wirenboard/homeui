/* eslint-disable */
import { configure } from 'mobx';
import { dashboardsStore } from '@/stores/dashboards';
import { devicesStore } from '@/stores/devices';
import { historyProxyMock } from '@/test/mocks/services';
import { ChartTraits } from './chart-traits';
import HistoryStore from './history-store';
import { ChartType, type HistoryValue } from './types';

configure({ safeDescriptors: false });

vi.mock('@/i18n/config', () => ({ default: { t: vi.fn((key: string) => key), language: 'en' } }));
vi.mock('@/services', () => import('@/test/mocks/services'));
vi.mock('@/stores/dashboards', () => ({
  dashboardsStore: { widgets: new Map() },
}));
vi.mock('@/stores/devices', () => ({
  devicesStore: {
    cells: new Map(),
    devices: new Map(),
    filteredDevices: new Map(),
  },
}));

describe('HistoryStore', () => {
  let store: HistoryStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new HistoryStore();
  });

  describe('control slots', () => {
    test('setSelectedControlValue updates at index', () => {
      store.setSelectedControlValue(0, 'lamp/brightness');
      expect(store.selectedControls[0]).toBe('lamp/brightness');
    });

    test('addControlSlot appends null', () => {
      expect(store.selectedControls).toHaveLength(1);
      store.addControlSlot();
      expect(store.selectedControls).toHaveLength(2);
      expect(store.selectedControls[1]).toBeNull();
    });

    test('removeControlAt removes at index', () => {
      store.addControlSlot();
      store.setSelectedControlValue(0, 'a');
      store.setSelectedControlValue(1, 'b');

      store.removeControlAt(0);

      expect(store.selectedControls).toEqual(['b']);
    });
  });

  describe('date inputs', () => {
    test('setSelectedStartDateFromInput sets date', () => {
      const d = new Date(2026, 5, 1);
      store.setSelectedStartDateFromInput(d);
      expect(store.selectedStartDate).toBe(d);
    });

    test('setSelectedStartDateFromInput pushes end date forward if start >= end', () => {
      store.selectedEndDate = new Date(2026, 5, 1);
      store.setSelectedStartDateFromInput(new Date(2026, 5, 1));
      expect(store.selectedEndDate.getTime()).toBeGreaterThan(new Date(2026, 5, 1).getTime());
    });

    test('setSelectedEndDateFromInput sets date', () => {
      const d = new Date(2026, 5, 10);
      store.setSelectedEndDateFromInput(d);
      expect(store.selectedEndDate).toBe(d);
    });

    test('setSelectedEndDateFromInput clears on null', () => {
      store.setSelectedEndDateFromInput(null as any);
      expect(store.selectedEndDate).toBeNull();
    });
  });

  describe('stopLoadingData', () => {
    test('stops loading and resets flags', () => {
      store.loadPending = true;
      store.disableUi = true;

      store.stopLoadingData();

      expect(store.stopLoadData).toBe(true);
      expect(store.loadPending).toBe(false);
      expect(store.disableUi).toBe(false);
    });
  });

  describe('prepareLoad', () => {
    test('resets stopLoadData', () => {
      store.stopLoadData = true;
      store.prepareLoad();
      expect(store.stopLoadData).toBe(false);
    });
  });

  describe('onRelayout', () => {
    test('updates dates from plotly event', () => {
      store.onRelayout({
        'xaxis.range[0]': '2026-01-01',
        'xaxis.range[1]': '2026-01-15',
      });

      expect(store.selectedStartDate).toEqual(new Date('2026-01-01'));
      expect(store.selectedEndDate).toEqual(new Date('2026-01-15'));
    });

    test('ignores event without range', () => {
      const before = store.selectedStartDate;
      store.onRelayout({});
      expect(store.selectedStartDate).toBe(before);
    });
  });

  describe('makeChartsControlFromCell', () => {
    test('builds control without widget', () => {
      const device = { name: 'Lamp' } as any;
      const cell = { deviceId: 'lamp', controlId: 'brightness', name: 'Brightness', valueType: 'number' } as any;

      const result = store.makeChartsControlFromCell(device, cell, 'All');

      expect(result).toEqual({
        name: 'Lamp / Brightness',
        group: 'All',
        deviceId: 'lamp',
        controlId: 'brightness',
        valueType: 'number',
        widget: undefined,
      });
    });

    test('builds control with widget', () => {
      const device = { name: 'Lamp' } as any;
      const cell = { deviceId: 'lamp', controlId: 'brightness', name: 'Brightness', valueType: 'number' } as any;
      const widget = { name: 'Dashboard Widget' } as any;

      const result = store.makeChartsControlFromCell(device, cell, 'Widgets', widget);

      expect(result.name).toBe('Dashboard Widget (Lamp / Brightness)');
      expect(result.widget).toBe(widget);
    });
  });

  describe('loadData', () => {
    test('returns undefined when stopLoadData is true', () => {
      store.stopLoadData = true;
      expect(store.loadData()).toBeUndefined();
    });

    test('returns encoded string for selected controls', () => {
      store.selectedControls = ['lamp/brightness'];
      store.selectedStartDate = new Date(2026, 0, 1);
      store.selectedEndDate = new Date(2026, 0, 2);

      const result = store.loadData();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    test('deduplicates controls', () => {
      store.selectedControls = ['lamp/brightness', 'lamp/brightness'];
      store.selectedStartDate = new Date(2026, 0, 1);
      store.selectedEndDate = new Date(2026, 0, 2);

      const result = store.loadData();
      expect(typeof result).toBe('string');
    });

    test('skips null controls', () => {
      store.selectedControls = [null, 'lamp/brightness'];
      store.selectedStartDate = new Date(2026, 0, 1);
      store.selectedEndDate = new Date(2026, 0, 2);

      const result = store.loadData();
      expect(typeof result).toBe('string');
    });
  });

  describe('initialize', () => {
    test('without id clears charts', () => {
      store.chartConfig = [{ x: [], y: [] } as any];
      store.initialize();
      expect(store.chartConfig).toEqual([]);
      expect(store.dataPointsMultiple).toEqual([]);
    });

    test('with id reads dates from url', () => {
      store.initialize('some-encoded-id');
      expect(store.selectedStartDate).toBeDefined();
      expect(store.selectedEndDate).toBeDefined();
    });
  });

  describe('readDatesFromUrl / resetDates', () => {
    test('defaults to yesterday-today when no url data', () => {
      store.readDatesFromUrl();
      expect(store.selectedStartDate).toBeInstanceOf(Date);
      expect(store.selectedEndDate).toBeInstanceOf(Date);
      expect(store.selectedEndDate.getTime()).toBeGreaterThan(store.selectedStartDate.getTime());
    });

    test('resetDates re-reads defaults', () => {
      store.selectedStartDate = new Date(2020, 0, 1);
      store.resetDates();
      expect(store.selectedStartDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });

  describe('setChartContainerRef', () => {
    test('stores ref', () => {
      const div = { offsetWidth: 800 } as HTMLDivElement;
      store.setChartContainerRef(div);
      expect((store as any).chartContainer).toMatchObject({ offsetWidth: 800 });
    });
  });

  describe('buildControls', () => {
    test('builds empty controls when no devices', () => {
      store.buildControls();
      expect(store.controls).toEqual([]);
      expect(store.selectedControls).toEqual([null]);
      expect(store.disableUi).toBe(false);
    });
  });

  describe('processDbRecord', () => {
    function makeNumberChart(): ChartTraits {
      const ctrl = { name: 'Temp', group: 'All', deviceId: 'd', controlId: 'c', valueType: 'number' as const };
      return new ChartTraits(ctrl);
    }

    function makeBoolChart(): ChartTraits {
      const ctrl = { name: 'SW', group: 'All', deviceId: 'd', controlId: 'c', valueType: 'boolean' as const };
      return new ChartTraits(ctrl);
    }

    function makeUptimeChart(): ChartTraits {
      const ctrl = { name: 'Up', group: 'All', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' as const };
      return new ChartTraits(ctrl);
    }

    const rec = (overrides: Partial<HistoryValue>) => ({
      c: 0, i: 0, retain: false, t: 0, v: 0,
      ...overrides,
    }) as HistoryValue;

    test('adds number record with min/max errors', () => {
      const chart = makeNumberChart();
      store.processDbRecord(rec({ t: 1700000000, v: 25, min: '20', max: '30' }), chart);

      expect(chart.xValues).toHaveLength(1);
      expect(chart.yValues).toEqual([25]);
      expect(chart.text[0]).toBe('25 [20, 30]');
      expect(chart.minErrors).toEqual(['20']);
      expect(chart.maxErrors).toEqual(['30']);
      expect(chart.minValue).toBe(25);
      expect(chart.maxValue).toBe(25);
    });

    test('adds number record without min/max', () => {
      const chart = makeNumberChart();
      store.processDbRecord(rec({ t: 1700000000, v: 42, min: '', max: '' }), chart);

      expect(chart.text[0]).toBe(42);
      expect(chart.minErrors).toEqual([42]);
      expect(chart.maxErrors).toEqual([42]);
    });

    test('adds boolean record as integer string', () => {
      const chart = makeBoolChart();
      store.processDbRecord(rec({ t: 1700000000.123, v: '1' }), chart);

      expect(chart.yValues).toEqual(['1']);
      expect(chart.text[0]).toBe('1');
    });

    test('processes uptime record', () => {
      const chart = makeUptimeChart();
      store.processDbRecord(rec({ t: 1700000000, v: '1d 2h 30m' }), chart);

      expect(chart.yValues[0]).toBe(95400);
      expect(chart.text[0]).toBe('1d 2h 30m');
      expect(chart.minValue).toBe(95400);
      expect(chart.maxValue).toBe(95400);
    });

    test('inserts reset point on uptime decrease', () => {
      const chart = makeUptimeChart();
      store.processDbRecord(rec({ t: 1700000000, v: '1h 0m' }), chart);
      store.processDbRecord(rec({ t: 1700010000, v: '0h 5m' }), chart);

      expect(chart.yValues.some((v) => v === 0)).toBe(true);
      expect(chart.minValue).toBe(0);
    });

    test('tracks min/max for number records', () => {
      const chart = makeNumberChart();
      store.processDbRecord(rec({ t: 1, v: 10 }), chart);
      store.processDbRecord(rec({ t: 2, v: 5 }), chart);
      store.processDbRecord(rec({ t: 3, v: 20 }), chart);

      expect(chart.minValue).toBe(5);
      expect(chart.maxValue).toBe(20);
    });
  });

  describe('createMainChart / createErrorChart', () => {
    function makeChart(type: ChartType): ChartTraits {
      const ctrl = { name: 'Test', group: 'All', deviceId: 'd', controlId: 'c', valueType: 'number' as const };
      const chart = new ChartTraits(ctrl);
      (chart as any).type = type;
      chart.xValues = [new Date()];
      chart.yValues = [42];
      chart.text = ['42'];
      chart.minErrors = [40];
      chart.maxErrors = [44];
      return chart;
    }

    test('createMainChart returns scatter config', () => {
      const chart = makeChart(ChartType.Number);
      const result = store.createMainChart(chart, 'red', 'y');

      expect(result.type).toBe('scatter');
      expect(result.name).toBe('Test');
      expect(result.line.shape).toBe('linear');
      expect(result.yaxis).toBe('y');
    });

    test('createMainChart uses hv shape for boolean', () => {
      const chart = makeChart(ChartType.Boolean);
      const result = store.createMainChart(chart, 'blue', 'y');
      expect(result.line.shape).toBe('hv');
    });

    test('createErrorChart returns fill config', () => {
      const chart = makeChart(ChartType.Number);
      const result = store.createErrorChart(chart, 'rgba(0,0,0,0.2)', 'y');

      expect(result.fill).toBe('toself');
      expect(result.hoverinfo).toBe('skip');
      expect(result.yaxis).toBe('y');
    });
  });

  describe('buildCharts', () => {
    test('returns empty config for no charts', () => {
      store.charts = [];
      const { config, layout } = store.buildCharts();
      expect(config).toEqual([]);
      expect(layout.height).toBeDefined();
    });

    test('builds config from charts with data', () => {
      const ctrl = { name: 'Temp', group: 'All', deviceId: 'd', controlId: 'c', valueType: 'number' as const };
      const chart = new ChartTraits(ctrl);
      chart.xValues = [new Date()];
      chart.yValues = [42];
      chart.text = ['42'];
      chart.minErrors = [40];
      chart.maxErrors = [44];
      chart.minValue = 40;
      chart.maxValue = 44;
      store.charts = [chart];

      const { config } = store.buildCharts();
      expect(config.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('fillMissingDatesByFilter', () => {
    test('returns config unchanged when no nulls', () => {
      const config = [{ x: [new Date()], y: [42], text: ['42'] }] as any;
      expect(store.fillMissingDatesByFilter(config)).toBe(config);
    });

    test('returns empty array unchanged', () => {
      expect(store.fillMissingDatesByFilter([])).toEqual([]);
    });
  });

  describe('stopLoadingData', () => {
    test('increments loadId', () => {
      const before = (store as any).loadId;
      store.stopLoadingData();
      expect((store as any).loadId).toBe(before + 1);
    });
  });

  describe('loadHistory', () => {
    test('does nothing when stopLoadData is true', () => {
      store.stopLoadData = true;
      historyProxyMock.get_values = vi.fn();
      store.loadHistory({}, 0, 0, ['a', 'b'], 1);
      expect(historyProxyMock.get_values).not.toHaveBeenCalled();
      expect(store.loadPending).toBe(false);
    });
  });

  describe('processChunk', () => {
    test('ignores mismatched loadId', () => {
      (store as any).loadId = 5;
      store.charts = [new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' })];
      store.processChunk({ values: [{ t: 1, v: 1 }] } as any, 0, 0, ['a', 'b'], 999);
      expect(store.charts[0].xValues).toHaveLength(0);
    });

    test('processes values and advances to next chunk', () => {
      (store as any).loadId = 1;
      store.selectedControls = ['d/c'];
      const chart = new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      store.charts = [chart];

      const spy = vi.spyOn(store, 'loadChunkedHistory').mockImplementation(() => {});

      store.processChunk(
        { values: [{ t: 1700000000, v: 42, min: '', max: '', c: 0, i: 0, retain: false }] } as any,
        0, 0, ['2026-01-01', '2026-01-02', '2026-01-03'], 1,
      );

      expect(store.charts[0].xValues).toHaveLength(1);
      expect(store.charts[0].progress.value).toBe(1);
      expect(spy).toHaveBeenCalledWith(0, 1, ['2026-01-01', '2026-01-02', '2026-01-03'], 1);
      spy.mockRestore();
    });

    test('marks chart loaded on last chunk and advances to next control', () => {
      (store as any).loadId = 1;
      store.selectedControls = ['d/c'];
      const chart = new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      store.charts = [chart];

      const spy = vi.spyOn(store, 'beforeLoadChunkedHistory').mockImplementation(() => {});

      store.processChunk(
        { values: [{ t: 1700000000, v: 42, min: '', max: '', c: 0, i: 0, retain: false }] } as any,
        0, 0, ['2026-01-01', '2026-01-02'], 1,
      );

      expect(store.charts[0].progress.isLoaded).toBe(true);
      expect(spy).toHaveBeenCalledWith(1, ['2026-01-01', '2026-01-02'], 1);
      spy.mockRestore();
    });

    test('stops processing when stopLoadData is true', () => {
      (store as any).loadId = 1;
      store.stopLoadData = true;
      const chart = new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      store.charts = [chart];

      store.processChunk(
        { values: [{ t: 1700000000, v: 42, min: '', max: '', c: 0, i: 0, retain: false }] } as any,
        0, 0, ['a', 'b'], 1,
      );

      expect(chart.xValues).toHaveLength(0);
    });
  });

  describe('buildControls with devices', () => {
    test('builds controls from devices and selects from url', () => {
      const cell = { deviceId: 'lamp', controlId: 'brightness', name: 'Brightness', valueType: 'number' };
      const device = { name: 'Lamp', cells: new Set(['brightness']) };

      (devicesStore.cells as Map<string, any>).set('brightness', cell);
      (devicesStore.devices as Map<string, any>).set('lamp', device);
      (devicesStore.filteredDevices as Map<string, any>).set('lamp', true);

      store.buildControls();

      expect(store.controls).toHaveLength(1);
      expect(store.controls[0].deviceId).toBe('lamp');
      expect(store.disableUi).toBe(false);

      (devicesStore.cells as Map<string, any>).clear();
      (devicesStore.devices as Map<string, any>).clear();
      (devicesStore.filteredDevices as Map<string, any>).clear();
    });

    test('builds controls with widget fallback on error', () => {
      const widget = { id: 'w1', name: 'Widget 1', cells: [{ id: 'missing/ctrl' }] };
      (dashboardsStore.widgets as Map<string, any>).set('w1', widget);

      store.buildControls();

      expect(store.controls.some((c) => c.deviceId === 'missing')).toBe(true);

      (dashboardsStore.widgets as Map<string, any>).clear();
    });
  });

  describe('startLoading', () => {
    test('sets up charts and triggers loading', () => {
      store.controls = [
        { name: 'Temp', group: 'All', deviceId: 'therm', controlId: 'temp', valueType: 'number' },
      ];

      const spy = vi.spyOn(store, 'beforeLoadChunkedHistory').mockImplementation(() => {});

      store.startLoading(['therm/temp']);

      expect(store.loadPending).toBe(true);
      expect(store.disableUi).toBe(true);
      expect(store.charts).toHaveLength(1);
      expect(store.charts[0].channelName).toBe('Temp');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    test('matches control with widget id', () => {
      store.controls = [
        { name: 'W Temp', group: 'W', deviceId: 'therm', controlId: 'temp', valueType: 'number', widget: { id: 'w1', name: 'W' } },
      ];

      const spy = vi.spyOn(store, 'beforeLoadChunkedHistory').mockImplementation(() => {});

      store.startLoading(['therm/temp/w1']);

      expect(store.charts).toHaveLength(1);
      expect(store.charts[0].channelName).toBe('W Temp');
      spy.mockRestore();
    });
  });

  describe('loadChunkedHistory', () => {
    test('builds params and calls loadHistory', () => {
      (store as any).loadId = 1;
      store.selectedControls = ['lamp/brightness'];

      const spy = vi.spyOn(store, 'loadHistory').mockImplementation(() => {});

      store.loadChunkedHistory(0, 0, ['2026-01-01', '2026-01-02'], 1);

      expect(spy).toHaveBeenCalled();
      const params = spy.mock.calls[0][0];
      expect(params.channels).toEqual([['lamp', 'brightness']]);
      expect(params.limit).toBe(1000);
      expect(params.with_milliseconds).toBe(true);
      spy.mockRestore();
    });

    test('aborts on loadId mismatch', () => {
      (store as any).loadId = 2;
      store.selectedControls = ['lamp/brightness'];
      const spy = vi.spyOn(store, 'loadHistory').mockImplementation(() => {});

      store.loadChunkedHistory(0, 0, ['2026-01-01', '2026-01-02'], 1);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('aborts on null control', () => {
      (store as any).loadId = 1;
      store.selectedControls = [null];
      const spy = vi.spyOn(store, 'loadHistory').mockImplementation(() => {});

      store.loadChunkedHistory(0, 0, ['2026-01-01', '2026-01-02'], 1);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('uses chartContainer width for max_records', () => {
      (store as any).loadId = 1;
      store.selectedControls = ['lamp/brightness'];
      store.setChartContainerRef({ offsetWidth: 400 } as HTMLDivElement);

      const spy = vi.spyOn(store, 'loadHistory').mockImplementation(() => {});

      store.loadChunkedHistory(0, 0, ['2026-01-01', '2026-01-02'], 1);

      const params = spy.mock.calls[0][0];
      expect(params.max_records).toBe(400);
      spy.mockRestore();
    });
  });

  describe('beforeLoadChunkedHistory', () => {
    test('finishes loading when no more controls', () => {
      (store as any).loadId = 1;
      store.selectedControls = [];
      store.charts = [];
      store.loadPending = true;

      store.beforeLoadChunkedHistory(0, ['2026-01-01', '2026-01-02'], 1);

      expect(store.loadPending).toBe(false);
      expect(store.disableUi).toBe(false);
      expect(store.chartConfig).toBeDefined();
      expect(store.layoutConfig).toBeDefined();
    });

    test('aborts on loadId mismatch', () => {
      (store as any).loadId = 2;
      store.loadPending = true;

      store.beforeLoadChunkedHistory(0, ['2026-01-01', '2026-01-02'], 1);

      expect(store.loadPending).toBe(true);
    });

    test('starts chunked loading for next control', () => {
      (store as any).loadId = 1;
      store.selectedControls = ['lamp/brightness'];

      const spy = vi.spyOn(store, 'loadChunkedHistory').mockImplementation(() => {});

      store.beforeLoadChunkedHistory(0, ['2026-01-01', '2026-01-02'], 1);

      expect(spy).toHaveBeenCalledWith(0, 0, ['2026-01-01', '2026-01-02'], 1);
      spy.mockRestore();
    });
  });

  describe('loadHistory', () => {
    test('calls historyProxy and processes result', async () => {
      (store as any).loadId = 1;
      store.selectedControls = ['d/c'];
      store.charts = [new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' })];
      const processSpy = vi.spyOn(store, 'processChunk').mockImplementation(() => {});

      historyProxyMock.get_values.mockResolvedValue({
        values: [{ t: 1700000000, v: 42 }],
      });

      store.loadHistory({}, 0, 0, ['a', 'b'], 1);
      await vi.waitFor(() => expect(processSpy).toHaveBeenCalled());

      expect(store.errors).toEqual([]);
      processSpy.mockRestore();
    });

    test('sets error on fetch failure', async () => {
      store.stopLoadData = false;
      (store as any).loadId = 1;

      historyProxyMock.get_values.mockRejectedValue(new Error('fail'));

      store.loadHistory({}, 0, 0, ['a', 'b'], 1);
      await vi.waitFor(() => expect(store.errors).toHaveLength(1));

      expect(store.errors[0].variant).toBe('danger');
      expect(store.loadPending).toBe(false);
    });

    test('ignores result when loadId changed', async () => {
      (store as any).loadId = 1;
      store.charts = [new ChartTraits({ name: 'T', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' })];

      historyProxyMock.get_values.mockResolvedValue({
        values: [{ t: 1700000000, v: 42 }],
      });

      store.loadHistory({}, 0, 0, ['a', 'b'], 1);
      (store as any).loadId = 99;
      await vi.waitFor(() => expect(historyProxyMock.get_values).toHaveBeenCalled());

      expect(store.charts[0].xValues).toHaveLength(0);
    });
  });

  describe('makeUpTimeAxisTicks', () => {
    test('does nothing without uptime chart', () => {
      store.charts = [];
      const layout: any = { yaxis: {} };
      store.makeUpTimeAxisTicks(layout);
      expect(layout.yaxis.tickvals).toBeUndefined();
    });

    test('generates ticks for small uptime range (minute-level)', () => {
      const chart = new ChartTraits({ name: 'Up', group: 'A', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' });
      chart.minValue = 300;
      chart.maxValue = 900;
      store.charts = [chart];

      const layout: any = { yaxis: {} };
      store.makeUpTimeAxisTicks(layout);

      expect(layout.yaxis.tickvals).toBeDefined();
      expect(layout.yaxis.ticktext).toBeDefined();
      expect(layout.yaxis.range).toBeDefined();
      expect(layout.yaxis.ticktext.every((t: string) => t.includes('m'))).toBe(true);
    });

    test('generates ticks for hour-level uptime range', () => {
      const chart = new ChartTraits({ name: 'Up', group: 'A', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' });
      chart.minValue = 3600;
      chart.maxValue = 36000;
      store.charts = [chart];

      const layout: any = { yaxis: {} };
      store.makeUpTimeAxisTicks(layout);

      expect(layout.yaxis.tickvals).toBeDefined();
      expect(layout.yaxis.ticktext.some((t: string) => t.includes('h'))).toBe(true);
    });

    test('generates ticks for day-level uptime range', () => {
      const chart = new ChartTraits({ name: 'Up', group: 'A', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' });
      chart.minValue = 0;
      chart.maxValue = 864000;
      store.charts = [chart];

      const layout: any = { yaxis: {} };
      store.makeUpTimeAxisTicks(layout);

      expect(layout.yaxis.tickvals).toBeDefined();
      expect(layout.yaxis.ticktext.some((t: string) => t.includes('d'))).toBe(true);
    });
  });

  describe('buildCharts with uptime', () => {
    test('applies uptime ticks to yaxis', () => {
      const chart = new ChartTraits({ name: 'Up', group: 'A', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' });
      chart.xValues = [new Date()];
      chart.yValues = [3600];
      chart.text = ['1h 0m'];
      chart.minValue = 0;
      chart.maxValue = 3600;
      store.charts = [chart];

      const { layout } = store.buildCharts();

      expect(layout.yaxis.tickvals).toBeDefined();
    });

    test('includes error chart for number type', () => {
      const chart = new ChartTraits({ name: 'Temp', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      chart.xValues = [new Date()];
      chart.yValues = [42];
      chart.text = ['42'];
      chart.minErrors = [40];
      chart.maxErrors = [44];
      chart.minValue = 40;
      chart.maxValue = 44;
      store.charts = [chart];

      const { config } = store.buildCharts();

      expect(config).toHaveLength(2);
      expect(config[1].fill).toBe('toself');
    });
  });

  describe('calculateTable', () => {
    test('builds table rows from chart data', () => {
      const date1 = new Date('2026-01-01T00:00:00Z');
      const date2 = new Date('2026-01-01T01:00:00Z');

      const chart = new ChartTraits({ name: 'Temp', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      chart.xValues = [date1, date2];
      chart.yValues = [10, 20];
      chart.text = ['10', '20'];
      chart.minErrors = [10, 20];
      chart.maxErrors = [10, 20];
      chart.minValue = 10;
      chart.maxValue = 20;
      store.charts = [chart];

      const config = [
        { x: [date1, date2], y: [10, 20], text: ['10', '20'] },
      ];

      const rows = store.calculateTable(config as any);

      expect(rows).toHaveLength(2);
      expect(rows[0].value[0]).toBe(10);
      expect(rows[1].value[0]).toBe(20);
    });

    test('fills missing slow-date values from last known', () => {
      const date1 = new Date('2026-01-01T00:00:00Z');
      const date2 = new Date('2026-01-01T01:00:00Z');
      const date3 = new Date('2026-01-01T02:00:00Z');

      const numChart = new ChartTraits({ name: 'Temp', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      numChart.xValues = [date1, date2, date3];
      numChart.yValues = [10, 20, 30];
      numChart.text = ['10', '20', '30'];
      numChart.minErrors = [10, 20, 30];
      numChart.maxErrors = [10, 20, 30];

      const boolChart = new ChartTraits({ name: 'SW', group: 'A', deviceId: 'd2', controlId: 'sw', valueType: 'boolean' });
      boolChart.xValues = [date1];
      boolChart.yValues = [1];
      boolChart.text = ['1'];

      store.charts = [numChart, boolChart];

      const config = [
        { x: [date1, date2, date3], y: [10, 20, 30], text: ['10', '20', '30'] },
        { x: [], y: [], text: [] },
        { x: [date1], y: [1], text: ['1'] },
      ];

      const rows = store.calculateTable(config as any);

      expect(rows).toHaveLength(3);
      expect(rows[0].value[1]).toBe(1);
      expect(rows[0].showMs).toBe(true);
    });

    test('shows uptime text instead of number value', () => {
      const date1 = new Date('2026-01-01T00:00:00Z');

      const chart = new ChartTraits({ name: 'Up', group: 'A', deviceId: 'system', controlId: 'Current uptime', valueType: 'number' });
      chart.xValues = [date1];
      chart.yValues = [3600];
      chart.text = ['1h 0m'];

      store.charts = [chart];

      const config = [{ x: [date1], y: [3600], text: ['1h 0m'] }];

      const rows = store.calculateTable(config as any);

      expect(rows).toHaveLength(1);
      expect(rows[0].value[0]).toBe('1h 0m');
    });

    test('filters out rows where all values are null', () => {
      const chart = new ChartTraits({ name: 'Temp', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      chart.xValues = [];
      chart.yValues = [];
      chart.text = [];
      store.charts = [chart];

      const rows = store.calculateTable([]);
      expect(rows).toHaveLength(0);
    });

    test('skips error chart in dataMaps index', () => {
      const date1 = new Date('2026-01-01T00:00:00Z');

      const chart = new ChartTraits({ name: 'Temp', group: 'A', deviceId: 'd', controlId: 'c', valueType: 'number' });
      chart.xValues = [date1];
      chart.yValues = [42];
      chart.text = ['42'];
      chart.minErrors = [40];
      chart.maxErrors = [44];
      chart.minValue = 40;
      chart.maxValue = 44;

      store.charts = [chart];

      const mainConfig = { x: [date1], y: [42], text: ['42'] };
      const errorConfig = { x: [date1], y: [44, 40], text: undefined };

      const rows = store.calculateTable([mainConfig, errorConfig] as any);
      expect(rows).toHaveLength(1);
      expect(rows[0].value[0]).toBe(42);
    });
  });

  describe('fillMissingDatesByFilter with nulls', () => {
    test('pads start and end dates when nulls present', () => {
      store.selectedStartDate = new Date('2026-01-01');
      store.selectedEndDate = new Date('2026-01-10');

      const config = [{
        x: [new Date('2026-01-02'), new Date('2026-01-03')],
        y: [null, null],
        text: [0, 0],
      }] as any;

      const result = store.fillMissingDatesByFilter(config);

      expect(result[0].x).toHaveLength(4);
      expect(result[0].y[0]).toBeNull();
      expect(result[0].y[result[0].y.length - 1]).toBeNull();
    });
  });
});
