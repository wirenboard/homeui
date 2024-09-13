import plotlyDirective from '../directives/plotly';

class ChartsControl {
  constructor(deviceId, controlId, deviceName, controlName, valueType, groupName, widget) {
    this.name = (deviceName || deviceId) + ' / ' + (controlName || controlId);
    if (widget) {
      this.name = widget.name + ' (' + this.name + ')';
    }
    this.widget = widget;
    this.group = groupName;
    this.deviceId = deviceId;
    this.controlId = controlId;
    this.valueType = valueType;
  }

  match(controlFromUrl) {
    if (this.deviceId === controlFromUrl.d && this.controlId === controlFromUrl.c) {
      return this.widget ? this.widget.id === controlFromUrl.w : !controlFromUrl.w;
    }
    return false;
  }
}

const ChartTypes = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  STRING: 'string',
  UPTIME: 'up-time',
};

class ChartTraits {
  constructor(chartsControl) {
    this.channelName = chartsControl.name;
    this.progress = {
      value: 0,
      isLoaded: false,
    };
    this.type = ChartTypes.NUMBER;
    if (chartsControl.valueType === 'boolean' || chartsControl.valueType === 'pushbutton') {
      this.type = ChartTypes.BOOLEAN;
    }
    if (chartsControl.valueType === 'string' || chartsControl.valueType === 'rgb') {
      this.type = ChartTypes.STRING;
    }
    if (chartsControl.deviceId === 'system' && chartsControl.controlId === 'Current uptime') {
      this.type = ChartTypes.UPTIME;
    }
    this.xValues = [];
    this.yValues = [];
    this.text = [];
    this.maxErrors = [];
    this.minErrors = [];
    this.minValue = undefined; // Minimum value for charts of number values
    this.maxValue = undefined; // Maximum value for charts of number values
  }

  get hasErrors() {
    return this.type == ChartTypes.NUMBER;
  }

  get hasBooleanValues() {
    return this.type == ChartTypes.BOOLEAN;
  }
}

class ChartColors {
  constructor() {
    this.colors = [
      { chartColor: 'rgb(31,119,180)', minMaxColor: 'rgba(31,119,180,0.2)' },
      { chartColor: 'rgb(255,127,14)', minMaxColor: 'rgba(255,127,14,0.2)' },
      { chartColor: 'rgb(44,160,44)', minMaxColor: 'rgba(44,160,44,0.2)' },
      { chartColor: 'rgb(214,39,40)', minMaxColor: 'rgba(214,39,40,0.2)' },
      { chartColor: 'rgb(148,103,189)', minMaxColor: 'rgba(148,103,189,0.2)' },
      { chartColor: 'rgb(140,86,75)', minMaxColor: 'rgba(140,86,75,0.2)' },
      { chartColor: 'rgb(227,119,194)', minMaxColor: 'rgba(227,119,194,0.2)' },
      { chartColor: 'rgb(127,127,127)', minMaxColor: 'rgba(127,127,127,0.2)' },
      { chartColor: 'rgb(188,189,34)', minMaxColor: 'rgba(188,189,34,0.2)' },
      { chartColor: 'rgb(23,190,207)', minMaxColor: 'rgba(23,190,207,0.2)' },
    ];
    this.index = 0;
  }

  nextColor() {
    var color = this.colors[this.index];
    this.index = this.index + 1;
    if (this.index >= this.colors.length) {
      this.index = 0;
    }
    return color;
  }
}

class HistoryCtrl {
  //...........................................................................
  constructor(
    $scope,
    DeviceData,
    $injector,
    handleData,
    historyUrlService,
    $locale,
    $translate,
    $element,
    $rootScope
  ) {
    'ngInject';

    // 1. интервал загрузки частей графика
    this.CHUNK_INTERVAL = 1;
    // 2. requirements
    var $stateParams = $injector.get('$stateParams');
    this.$stateParams = $stateParams;
    var $location = $injector.get('$location');
    var HistoryProxy = $injector.get('HistoryProxy');
    var errors = $injector.get('errors');
    var historyMaxPoints = $injector.get('historyMaxPoints');
    var uiConfig = $injector.get('uiConfig');
    this.orderByFilter = $injector.get('orderByFilter');
    this.$timeout = $injector.get('$timeout');
    this.$state = $injector.get('$state');
    this.historyUrlService = historyUrlService;
    this.$translate = $translate;
    this.$locale = $locale;
    this.$element = $element;

    $rootScope.forceFullscreen = this.$stateParams.fullscreen === true;

    angular.extend(this, {
      scope: $scope,
      location: $location,
      historyMaxPoints: historyMaxPoints,
      HistoryProxy: HistoryProxy,
      errors: errors,
      controls: [],
    });

    this.handleData = handleData;

    this.Y_CHART_MARGIN = 25;

    // данные графика в формате plotly.js
    this.chartConfig = [];

    // Array of ChartTraits
    this.charts = [];
    this.layoutConfig = {
      margin: {
        b: 40,
        t: 20,
        l: 0,
        r: 0,
      },
      legend: {
        //https://plot.ly/javascript/legend/
        x: 0,
        y: 100,
      },
      hovermode: 'x unified',
      modebar: {
        remove: ['lasso', 'select', 'resetscale'],
      },
    };

    this.options = {
      displayModeBar: true,
      locale: $locale.id,
      displaylogo: false,
    };

    this.colors = new ChartColors();

    // контролы из урла
    var stateFromUrl = historyUrlService.decode($stateParams.data);

    // читаем из урла даты
    this.readDatesFromUrl(stateFromUrl);

    // контролы, выбранные для отображения в графике, массив объектов ChartsControl
    this.selectedControls = [];

    // Wait for data loading for charts
    this.loadPending = false;
    this.disableUi = true;

    this.dataPointsMultiple = [];

    // 4. Setup
    this.updateTranslations()
      .then(() => uiConfig.whenReady())
      .then(data => {
        this.updateControls(data.widgets, DeviceData);
        this.setSelectedControlsAndStartLoading(stateFromUrl.c);
      });

    this.plotlyEvents = graph => {
      // !!!!! метод обязательно должен быть в конструкторе иначе контекст будет непонятно чей
      graph.on('plotly_relayout', event => {
        if (event['xaxis.range[0]']) {
          this.timeChange();

          // порядок не менять!!!
          this.selectedStartDate = new Date(event['xaxis.range[0]']);
          this.selectedEndDate = new Date(event['xaxis.range[1]']);
          this.setDefaultTime(this.selectedStartDate, this.selectedEndDate);
          //обнуляю время чтобы не прогрессировало
          this.resetTime();
        }
      });
    };

    // 5. Clean up
    $scope.$on('$destroy', () => {
      // Do whatever cleanup might be necessary
      $scope = null; // MEMLEAK FIX
    });
  } // constructor

  // Class methods
  //...........................................................................
  makeChartsControlFromCell(device, cell, groupName, widget) {
    return new ChartsControl(
      cell.deviceId,
      cell.controlId,
      device.getName(this.$locale.id),
      cell.getName(this.$locale.id),
      cell.valueType,
      groupName,
      widget
    );
  }

  updateControls(widgets, DeviceData) {
    this.controls = this.orderByFilter(
      Array.prototype.concat.apply(
        [],
        widgets.map(widget =>
          widget.cells
            .filter(item => item.id)
            .map(item => {
              try {
                const cell = DeviceData.cell(item.id);
                const device = DeviceData.devices[cell.deviceId];
                return this.makeChartsControlFromCell(device, cell, this.widgetChannelsMsg, widget);
              } catch (er) {
                const deviceControl = item.id.split('/');
                return new ChartsControl(
                  deviceControl[0],
                  deviceControl[1],
                  undefined,
                  undefined,
                  undefined,
                  this.widgetChannelsMsg,
                  widget
                );
              }
            })
        ),
        'name'
      )
    );
    this.controls.push(
      ...Array.prototype.concat.apply(
        [],
        Object.keys(DeviceData.devices)
          .sort()
          .map(deviceId => {
            const device = DeviceData.devices[deviceId];
            return device.cellIds.map(cellId => {
              const cell = DeviceData.cell(cellId);
              return this.makeChartsControlFromCell(device, cell, this.allChannelsMsg);
            });
          })
      )
    );
  }

  updateTranslations() {
    var t = this.$translate([
      'history.labels.all_channels',
      'history.labels.widget_channels',
      'history.errors.dates',
      'history.format.date_with_ms',
    ]);
    t.then(translations => {
      this.allChannelsMsg = translations['history.labels.all_channels'];
      this.widgetChannelsMsg = translations['history.labels.widget_channels'];
      this.invalidDateRangeMsg = translations['history.errors.dates'];
      this.dateWithMsFormat = translations['history.format.date_with_ms'];
    });
    return t;
  }

  setSelectedControlsAndStartLoading(controlsFromUrl) {
    if (controlsFromUrl && controlsFromUrl.length) {
      controlsFromUrl.forEach(control => {
        const cn = this.controls.find(element => element.match(control));
        if (cn) {
          this.selectedControls.push(cn);
          this.charts.push(new ChartTraits(cn));
        }
      });
      if (this.charts.length) {
        this.loadPending = true;
        this.beforeLoadChunkedHistory();
      }
    } else {
      // если массив пустой, то создаю первый элемент
      this.selectedControls = [null];
      this.disableUi = false;
    }
  }

  // читает из урла даты
  readDatesFromUrl(stateFromUrl) {
    this.startDate = stateFromUrl.s;
    this.endDate = stateFromUrl.e;
    this.setDefaultTime(this.startDate, this.endDate);
    // по умолчанию дата равна сегодня минус один день
    this.selectedStartDate = this.startDate
      ? this.startDate
      : new Date(+new Date() - 24 * 60 * 60 * 1000);
    this.selectedEndDate = this.endDate ? this.endDate : new Date();
    this.timeChanged = true;
  }

  updateState() {
    var controls = [];

    // Remove duplicates
    var uniqueCells = new Set();
    this.selectedControls.forEach(control => {
      const id = control.deviceId + '/' + control.controlId;
      if (!uniqueCells.has(id)) {
        uniqueCells.add(id);
        controls.push({
          d: control.deviceId,
          c: control.controlId,
          w: control.widget && control.widget.id,
        });
      }
    });

    const data = this.historyUrlService.encodeControls(
      controls,
      this.selectedStartDate
        ? this.selectedStartDate.getTime() + this.addHoursAndMinutes(this.selectedStartDateMinute)
        : undefined,
      this.selectedEndDate
        ? this.selectedEndDate.getTime() + this.addHoursAndMinutes(this.selectedEndDateMinute)
        : undefined
    );

    let params = { data: data };
    if (this.$stateParams.fullscreen) {
      params.fullscreen = true;
    }

    this.$state.go('history.sample', params, { reload: true, inherit: false, notify: true });
  }

  // считаю часы + минуты в мсек
  addHoursAndMinutes(date) {
    var num = 0;
    num += date.getHours() * 60 * 60 * 1000;
    num += date.getMinutes() * 60 * 1000;
    return num;
  }

  resetTime() {
    // обнуляю время чтобы не прогрессировало
    if (this.selectedStartDate) {
      this.selectedStartDate.setHours(0);
      this.selectedStartDate.setMinutes(0);
    }
    if (this.selectedEndDate) {
      this.selectedEndDate.setHours(0);
      this.selectedEndDate.setMinutes(0);
    }
  }

  addTopic() {
    this.selectedControls.push(null);
  }

  deleteTopic(index) {
    this.selectedControls.splice(index, 1);
  }

  timeChange(type) {
    this.timeChanged = true;
  }

  updateDateRange() {
    if (this.isValidDatesRange()) {
      // доп проверки на минуты можно не ставить. если менять минуты например старта когда дата старта
      // не определена то урл не сменится так как все равно подставится "-" вместо даты старта
      if (this.selectedStartDate || this.selectedEndDate) {
        this.resetTime();
        this.updateState();
      }
    } else {
      alert(this.invalidDateRangeMsg);
    }
  }

  isValidDatesRange() {
    if (!this.selectedStartDate) return true;

    var sMin,
      sHour,
      // копирую
      s = new Date(this.selectedStartDate),
      e = this.selectedEndDate ? new Date(this.selectedEndDate) : new Date();
    if (this.selectedStartDateMinute) {
      sMin = this.selectedStartDateMinute.getMinutes();
      sHour = this.selectedStartDateMinute.getHours();
    } else {
      sMin = 0;
      sHour = 0;
    }
    s.setMinutes(sMin);
    s.setHours(sHour);

    // назначаю только если есть конечная дата(а не время) иначе берутся текущие
    if (this.selectedEndDate) {
      e.setMinutes(this.selectedEndDateMinute.getMinutes());
      e.setHours(this.selectedEndDateMinute.getHours());
    }

    // сравниваю и разницу дат и то чтобы старт не был в будущем
    return (
      this.handleData.diffDatesInMinutes(s, new Date()) > 0 &&
      this.handleData.diffDatesInMinutes(s, e) > 0
    );
  }

  //...........................................................................
  // проставляет только время
  setDefaultTime(start, end) {
    // вычитываю из урла или ставлю дефолтное
    var s = start || new Date();
    var _s = new Date();
    _s.setHours(s.getHours());
    _s.setMinutes(s.getMinutes());
    this.selectedStartDateMinute = _s;

    var e = end || new Date();
    var _e = new Date();
    _e.setHours(e.getHours());
    _e.setMinutes(e.getMinutes());
    this.selectedEndDateMinute = _e;
  }

  beforeLoadChunkedHistory(indexOfControl = 0) {
    if (!this.selectedControls[indexOfControl]) {
      this.$timeout(() => {
        this.loadPending = false;
        this.createCharts();
        this.calculateTable();
        this.disableUi = false;
      }, 100);
      return;
    }
    var chunks = this.handleData.splitDate(this.startDate, this.endDate, this.CHUNK_INTERVAL + 1);
    this.chunksN = chunks.length - 1;
    this.maxChunkRecords = Math.min(
      this.historyMaxPoints,
      Math.ceil(this.$element[0].offsetWidth / this.chunksN)
    );
    this.loadChunkedHistory(indexOfControl, 0, chunks);
  }

  calculateTable() {
    //TODO: use merge sort as we have here n^2 complexity
    var graph = [];
    var dates = new Set();
    this.chartConfig.forEach(ctrl => {
      ctrl.x.forEach(x => {
        dates.add(x.valueOf());
      });
    });

    var arrX = Array.from(dates).sort();
    arrX.forEach(date => {
      graph.push({
        date,
        value: Array(this.charts.length).fill(null),
        showMs: false,
      });
      // ищу совпадения в каждом канале
      this.charts.forEach((ctrl, iCtrl) => {
        for (var i = 0; i < ctrl.xValues.length; i++) {
          // если не нахожу то останется null
          if (date === ctrl.xValues[i].valueOf()) {
            if (ctrl.type === ChartTypes.UPTIME) {
              graph[graph.length - 1].value[iCtrl] = ctrl.text[i];
            } else {
              graph[graph.length - 1].value[iCtrl] = ctrl.yValues[i];
            }
            if (ctrl.hasBooleanValues) {
              graph[graph.length - 1].showMs = true;
            }
            break;
          }
        }
      });
    });
    this.dataPointsMultiple = graph;
  }

  loadChunkedHistory(indexOfControl, indexOfChunk, chunks) {
    var control = this.selectedControls[indexOfControl];

    var params = {
      channels: [[control.deviceId, control.controlId]],
      limit: this.historyMaxPoints,
      ver: 1,
    };

    // никаких проверок дат. есть значения по умолчанию
    const startDate = new Date(chunks[indexOfChunk]);
    const endDate = new Date(chunks[indexOfChunk + 1]);
    params.timestamp = {
      // add extra second to include 00:00:00
      // но только для первого чанка / для последующих чанков наоборот
      // прибавляю 1 чтобы не было нахлеста
      // (FIXME: maybe wb-mqtt-db should support not just gt/lt, but also gte/lte?)
      gt: indexOfChunk == 0 ? startDate.getTime() / 1000 - 1 : startDate.getTime() / 1000 + 1,
      lt: endDate.getTime() / 1000, /// + 86400;
    };
    var intervalMs = endDate - startDate; // duration of requested interval, in ms
    // we want to request  no more than "limit" data points.
    // Additional divider 1.1 is here just to be on the safe side
    params.min_interval = Math.trunc((intervalMs / params.limit) * 1.1);
    // max_records has higher priority, min_interval will be deprecated and left here for backward compatibility
    params.max_records = this.maxChunkRecords;
    params.with_milliseconds = true;
    this.loadHistory(params, indexOfControl, indexOfChunk, chunks);
  }

  stopLoadingData() {
    this.$timeout(() => {
      this.timeChanged = true;
      this.stopLoadData = true;
      this.loadPending = false;
      this.disableUi = false;
    });
  }

  createMainChart(chart, lineColor, axisName) {
    return {
      name: chart.channelName,
      x: chart.xValues,
      y: chart.yValues,
      text: chart.text,
      type: 'scatter',
      mode: 'lines+markers',
      marker: {
        size: 3,
      },
      line: {
        shape: [ChartTypes.BOOLEAN, ChartTypes.STRING].includes(chart.type) ? 'hv' : 'linear',
        color: lineColor,
        width: 1,
      },
      hovertemplate: '%{text}<extra></extra>',
      yaxis: axisName,
    };
  }

  //https://plotly.com/javascript/continuous-error-bars/
  createErrorChart(chart, fillColor, axisName) {
    return {
      name: '∆ ' + chart.channelName,
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

  setAsSecond(axis) {
    axis.overlaying = 'y';
    axis.side = 'right';
  }

  makeStringAxis() {
    return {
      type: 'category',
      customdata: ChartTypes.STRING,
    };
  }

  makeBoolAxis(index, axisCount, calcRange) {
    var axis = {
      type: 'linear',
      tickmode: 'array',
      tickvals: [0, 1],
      customdata: ChartTypes.BOOLEAN,
    };
    if (axisCount > 1) {
      axis.domain = [index / axisCount, (index + 1) / axisCount];
      axis.range = [-0.1, 1.1];
    }
    if (calcRange) {
      axis.autorange = false;
      axis.range = [-1 / this.Y_CHART_MARGIN, 1 + 1 / this.Y_CHART_MARGIN];
    }
    return axis;
  }

  makeCommonAxis(minValue, maxValue) {
    var axis = {
      // with this flag Plotly will automatically increase the margin size
      // to prevent ticklabels from being cut off or overlapping with axis titles
      // https://plot.ly/javascript/setting-graph-size/#automatically-adjust-margins
      automargin: true,
      type: 'linear',
      customdata: ChartTypes.NUMBER,
    };
    if (minValue !== undefined && maxValue !== undefined) {
      const d = maxValue - minValue;
      if (d >= 1) {
        minValue = Math.floor(minValue);
        maxValue = Math.ceil(maxValue);
      } else {
        const k = Math.pow(10, -Math.round(Math.log10(d)));
        minValue = Math.floor(minValue * k) / k;
        maxValue = Math.ceil(maxValue * k) / k;
      }
      const delta = (maxValue - minValue) / this.Y_CHART_MARGIN;
      axis.range = [minValue - delta, maxValue + delta];
    }
    return axis;
  }

  makeUptimeAxis() {
    var axis = {
      automargin: true,
      type: 'linear',
      tickmode: 'array',
      tickvals: [],
      ticktext: [],
      customdata: ChartTypes.UPTIME,
    };
    return axis;
  }

  makeAxis(chart) {
    if (chart.type == ChartTypes.STRING) {
      return this.makeStringAxis();
    }
    if (chart.type == ChartTypes.BOOLEAN) {
      return this.makeBoolAxis(0, 1);
    }
    if (chart.type == ChartTypes.UPTIME) {
      return this.makeUptimeAxis();
    }
    return this.makeCommonAxis();
  }

  getAxis(chart) {
    var axisType = chart.type;

    // No axis defined yet
    if (!this.layoutConfig.yaxis.customdata) {
      this.layoutConfig.yaxis = this.makeAxis(chart);
      return 'y';
    }

    // Chart has type compatible with existing axis
    if (
      axisType == this.layoutConfig.yaxis.customdata &&
      [ChartTypes.BOOLEAN, ChartTypes.NUMBER].includes(chart.type)
    ) {
      return 'y';
    }

    if (!this.layoutConfig.yaxis2) {
      this.layoutConfig.yaxis2 = this.makeAxis(chart);
      this.setAsSecond(this.layoutConfig.yaxis2);
    }
    return 'y2';
  }

  isBoolAxis(axis) {
    return axis?.customdata == ChartTypes.BOOLEAN;
  }

  isCommonAxis(axis) {
    return axis?.customdata == ChartTypes.NUMBER;
  }

  fixBoolAxes(minValue, maxValue) {
    // Bool axis in combination with common axis has additional range attribute
    // It is used to scale bool axis to the full height of plot
    // Unfortunately plolty.js draws two 0X axes: one for bool, other for common axis.
    // It also draws different tick lines for each axis
    // So we calculate 0X axis and tick lines positions ourself
    if (this.isBoolAxis(this.layoutConfig.yaxis) && this.isCommonAxis(this.layoutConfig.yaxis2)) {
      this.layoutConfig.yaxis = this.makeBoolAxis(0, 1, true);
      this.layoutConfig.yaxis2 = this.makeCommonAxis(minValue, maxValue);
      this.setAsSecond(this.layoutConfig.yaxis2);
      return;
    }
    if (this.isCommonAxis(this.layoutConfig.yaxis) && this.isBoolAxis(this.layoutConfig.yaxis2)) {
      this.layoutConfig.yaxis = this.makeCommonAxis(minValue, maxValue);
      this.layoutConfig.yaxis2 = this.makeBoolAxis(0, 1, true);
      this.setAsSecond(this.layoutConfig.yaxis2);
      return;
    }

    // We have only bool charts, let's show them separately
    if (this.isBoolAxis(this.layoutConfig.yaxis) && !this.layoutConfig.yaxis2) {
      this.chartConfig.forEach((chart, index) => {
        const axisProp = index == 0 ? 'yaxis' : 'yaxis' + (index + 1);
        this.layoutConfig[axisProp] = this.makeBoolAxis(index, this.chartConfig.length);
        chart.yaxis = index == 0 ? 'y' : 'y' + (index + 1);
      });
    }
  }

  makeUpTimeAxisTicks(axis) {
    const chart = this.charts.find(chart => chart.type == ChartTypes.UPTIME);
    if (!chart) {
      return;
    }

    const intervalCount = 5;
    const minuteFraction = 60;
    const fiveMinuteFraction = 5 * minuteFraction;
    const hourFraction = 60 * minuteFraction;
    const dayFraction = 24 * hourFraction;

    let range = (chart.maxValue - chart.minValue) / intervalCount;
    let realMaxValue = chart.maxValue;
    let realMinValue = chart.minValue;
    let stepFraction = fiveMinuteFraction;
    if (range > dayFraction) {
      stepFraction = dayFraction;
    } else {
      if (range > hourFraction) {
        stepFraction = hourFraction;
      }
    }
    realMaxValue = Math.ceil(chart.maxValue / stepFraction) * stepFraction;
    realMinValue = Math.floor(chart.minValue / stepFraction) * stepFraction;
    if (stepFraction == fiveMinuteFraction) {
      realMinValue = Math.floor(realMinValue / fiveMinuteFraction) * fiveMinuteFraction;
      realMaxValue = realMaxValue + (realMaxValue - realMinValue) * 0.1;
    }
    range = (realMaxValue - realMinValue) / intervalCount;

    let step;
    if (range > dayFraction) {
      step = Math.ceil(range / dayFraction) * dayFraction;
    } else {
      if (range > hourFraction) {
        step = Math.ceil(range / hourFraction) * hourFraction;
      } else {
        step = Math.ceil(range / fiveMinuteFraction) * fiveMinuteFraction;
      }
    }
    const tickvals = Array.from({ length: intervalCount + 1 }, (_, i) => realMinValue + i * step);
    const ticktext = tickvals.map(t => {
      const days = Math.floor(t / dayFraction);
      t -= days * dayFraction;
      const hours = Math.floor(t / hourFraction);
      t -= hours * hourFraction;
      const minutes = Math.floor(t / minuteFraction);
      let res = '';
      if (days || step > dayFraction) {
        res += days + 'd ';
      }
      if (step > dayFraction) {
        return res;
      }
      if (hours || step > hourFraction) {
        res += hours + 'h ';
      }
      if (step > hourFraction) {
        return res;
      }
      return res + minutes + 'm';
    });
    axis.tickvals = tickvals;
    axis.ticktext = ticktext;
    axis.range = [realMinValue, realMaxValue];
  }

  createCharts() {
    var minValue = undefined;
    var maxValue = undefined;
    this.charts.forEach(chart => {
      if (chart.xValues.length) {
        minValue = this.getMin(minValue, chart.minValue);
        maxValue = this.getMax(maxValue, chart.maxValue);
        const axisName = this.getAxis(chart);
        const colors = this.colors.nextColor();
        this.chartConfig.push(this.createMainChart(chart, colors.chartColor, axisName));
        if (chart.hasErrors) {
          this.chartConfig.push(this.createErrorChart(chart, colors.minMaxColor, axisName));
        }
      }
    });

    this.fixBoolAxes(minValue, maxValue);

    if (this.layoutConfig?.yaxis?.customdata == ChartTypes.UPTIME) {
      this.makeUpTimeAxisTicks(this.layoutConfig.yaxis);
    }
    if (this.layoutConfig.yaxis2?.customdata == ChartTypes.UPTIME) {
      this.makeUpTimeAxisTicks(this.layoutConfig.yaxis2);
    }

    // 450 - default height in plotly.js
    // 19 - minimal legend item height in plotly.js sources
    // It can be bigger if font is bigger, but it is too difficult to calculate, so use minimal value
    // See computeTextDimensions in components/legend/draw.js in plotly.js sources
    this.layoutConfig.height = 450 + this.chartConfig.length * 19;
  }

  getMax(v1, v2) {
    var vf1 = parseFloat(v1);
    var vf2 = parseFloat(v2);
    if (!isNaN(vf1)) {
      if (!isNaN(vf2)) {
        return vf2 > vf1 ? vf2 : vf1;
      }
      return vf1;
    }
    return !isNaN(vf2) ? vf2 : undefined;
  }

  getMin(v1, v2) {
    var vf1 = parseFloat(v1);
    var vf2 = parseFloat(v2);
    if (!isNaN(vf1)) {
      if (!isNaN(vf2)) {
        return vf2 < vf1 ? vf2 : vf1;
      }
      return vf1;
    }
    return !isNaN(vf2) ? vf2 : undefined;
  }

  addUptimeRecord(chart, ts, value) {
    let uptime = value.split(' ');
    let seconds = 0;
    for (let i = 0; i < uptime.length; ++i) {
      let intValue = parseInt(uptime[i]);
      let unit = uptime[i][uptime[i].length - 1];
      if (unit == 'd') {
        seconds += intValue * 24 * 60 * 60;
      } else if (unit == 'h') {
        seconds += intValue * 60 * 60;
      } else if (unit == 'm') {
        seconds += intValue * 60;
      }
    }
    if (chart.xValues.length > 0) {
      const lastUpTime = chart.yValues[chart.yValues.length - 1];
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
    chart.text.push(value);
    chart.maxValue = this.getMax(chart.maxValue, seconds);
    chart.minValue = this.getMin(chart.minValue, seconds);
  }

  processDbRecord(record, chart) {
    var ts = new Date();
    // For discrete signals store timestamp with ms
    if (chart.hasBooleanValues) {
      ts.setTime(record.t * 1000);
    } else {
      ts.setTime(Math.round(record.t) * 1000);
    }
    if (chart.type == ChartTypes.UPTIME) {
      this.addUptimeRecord(chart, ts, record.v);
      return;
    }
    chart.xValues.push(ts);
    chart.yValues.push(record.v);
    if ((record.max && record.max != record.v) || (record.min && record.min != record.v)) {
      chart.text.push(record.v + ' [' + record.min + ', ' + record.max + ']');
    } else {
      if (chart.hasBooleanValues) {
        chart.text.push(parseInt(record.v));
      } else {
        chart.text.push(record.v);
      }
    }
    chart.maxErrors.push(record.max ? record.max : record.v);
    chart.minErrors.push(record.min ? record.min : record.v);
    if (chart.type == ChartTypes.NUMBER) {
      chart.minValue = this.getMin(this.getMin(chart.minValue, record.v), record.min);
      chart.maxValue = this.getMax(this.getMax(chart.maxValue, record.v), record.max);
    }
  }

  processChunk(chunk, indexOfControl, indexOfChunk, chunks) {
    var chart = this.charts[indexOfControl];
    chart.progress.value = indexOfChunk + 1;

    chunk.values.forEach(item => this.processDbRecord(item, chart));

    // если еще есть части интервала
    if (indexOfChunk + 2 < chunks.length) {
      this.loadChunkedHistory(indexOfControl, indexOfChunk + 1, chunks);
      // запрашиваю следующий контол если есть
    } else {
      chart.progress.isLoaded = true;
      this.beforeLoadChunkedHistory(indexOfControl + 1);
    }
  }

  loadHistory(params, indexOfControl, indexOfChunk, chunks) {
    if (this.stopLoadData) {
      this.loadPending = false;
      this.disableUi = false;
      return;
    }
    this.HistoryProxy.get_values(params)
      .then(result => this.processChunk(result, indexOfControl, indexOfChunk, chunks))
      .catch(er => {
        this.loadPending = false;
        this.disableUi = false;
        this.errors.catch('history.errors.load')(er);
      });
  }

  downloadHistoryTable() {
    const rows = document.querySelectorAll('#history-table tr');
    let csv = [];
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll('td, th');
      const row = [];

      for (let j = 0; j < cols.length; j++) {
        // warp channel name's in quotes to protect chanel name that contain ',' symbol
        if (i === 0 && j > 0) {
          row.push(`"${cols[j].innerText}"`);
        } else {
          row.push(cols[j].innerText);
        }
      }

      csv.push(row.join(','));
    }
    const csvFile = new Blob(['\ufeff', csv.join('\n')], { type: 'text/csv' });

    const downloadLink = document.createElement('a');
    downloadLink.download = 'filename.csv';
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);

    downloadLink.click();
  }
} // class HistoryCtrl

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.history', [])
  .controller('HistoryCtrl', HistoryCtrl)
  .directive('plotly', ['$window', plotlyDirective]);
