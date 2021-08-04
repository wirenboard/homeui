class ControlFromUrl {
    constructor(deviceOrWidget, control) {
        if (control) {
            this.device = deviceOrWidget;
        } else {
            this.widgetName = deviceOrWidget;
        }
        this.control = control;
    }
}

class ChartsControl {
    constructor(cell, groupName, deviceName, widgetName) {
        this.cell = cell;
        this.name = deviceName + " / " + (cell.name || cell.controlId);
        if (widgetName) {
            this.name = widgetName + " (" + this.name + ")";
        }
        this.widgetName = widgetName;
        this.group = groupName;
    }

    match(controlFromUrl) {
        if (this.widgetName) {
            return this.widgetName === controlFromUrl.widgetName;
        }
        return this.widgetName === controlFromUrl.widgetName && this.cell.deviceId === controlFromUrl.device && this.cell.controlId === controlFromUrl.control;
    }

    getDeviceForUrl() {
        return (this.widgetName ? this.widgetName : this.cell.deviceId);
    }

    getControlForUrl() {
        return (this.widgetName ? "" : this.cell.controlId);
    }
}

class ChartTraits {
    constructor(chartsControl) {
        this.channelName = chartsControl.name;
        this.progress = {
            value: 0,
            isLoaded: false
        };
        this.stringValues = undefined;
        this.hasErrors = true;
        this.isBoolean = (chartsControl.cell.valueType === "boolean");
        this.xValues = [];
        this.yValues = [];
        this.text = [];
        this.maxErrors = [];
        this.minErrors = [];
    }
}

class ChartColors {
    constructor() {
        this.colors = [
            { chartColor: 'rgb(31,119,180)',  minMaxColor: 'rgba(31,119,180,0.2)' },
            { chartColor: 'rgb(255,127,14)',  minMaxColor: 'rgba(255,127,14,0.2)' },
            { chartColor: 'rgb(44,160,44)',   minMaxColor: 'rgba(44,160,44,0.2)'  },
            { chartColor: 'rgb(214,39,40)',   minMaxColor: 'rgba(214,39,40,0.2)'  },
            { chartColor: 'rgb(148,103,189)', minMaxColor: 'rgba(148,103,189,0.2)'},
            { chartColor: 'rgb(140,86,75)',   minMaxColor: 'rgba(140,86,75,0.2)'  },
            { chartColor: 'rgb(227,119,194)', minMaxColor: 'rgba(227,119,194,0.2)'},
            { chartColor: 'rgb(127,127,127)', minMaxColor: 'rgba(127,127,127,0.2)'},
            { chartColor: 'rgb(188,189,34)',  minMaxColor: 'rgba(188,189,34,0.2)' },
            { chartColor: 'rgb(23,190,207)',  minMaxColor: 'rgba(23,190,207,0.2)' },
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
    constructor($scope, DeviceData, $injector, handleData, $q) {
        'ngInject';

        // 1. интервал загрузки частей графика
        this.CHUNK_INTERVAL = 1;
        // 2. requirements
        var $stateParams = $injector.get('$stateParams');
        this.$stateParams = $stateParams;
        var $location = $injector.get('$location');
        var HistoryProxy = $injector.get('HistoryProxy');
        var whenMqttReady = $injector.get('whenMqttReady');
        var errors = $injector.get('errors');
        var historyMaxPoints = $injector.get('historyMaxPoints');
        var dateFilter = $injector.get('dateFilter');
        var uiConfig = $injector.get('uiConfig');
        this.orderByFilter = $injector.get('orderByFilter');
        this.$timeout = $injector.get('$timeout');
        this.$state = $injector.get('$state');

        angular.extend(this, {
            scope: $scope,
            location: $location,
            historyMaxPoints: historyMaxPoints,
            HistoryProxy: HistoryProxy,
            dateFilter: dateFilter,
            errors: errors,
            controls: []
        });

        this.handleData = handleData;

        // читаем из урла даты
        this.readDatesFromUrl();

        // данные графика в формате plotly.js
        this.chartConfig = [];

        // Array of ChartTraits
        this.charts = [];
        this.progresMax = 100;
        this.layoutConfig = {
            xaxis: {
            },
            yaxis: {
              // with this flag Plotly will automatically increase the margin size 
              // to prevent ticklabels from being cut off or overlapping with axis titles
              // https://plot.ly/javascript/setting-graph-size/#automatically-adjust-margins
              automargin: true,
            },
            margin: {// update the left, bottom, right, top margin
                l: 40, b: 40, r: 10, t: 20
            },
            legend: {//https://plot.ly/javascript/legend/
                x: 0,
                y: 100
            }
        };

        this.options = {
            displayModeBar: true
        }

        this.colors = new ChartColors();

        // контролы из урла, массив объектов ControlFromUrl
        var controlsFromUrl = [];
        if($stateParams.device && $stateParams.control) {
            const parsedDevices = $stateParams.device.split(';');
            const parsedControls = $stateParams.control.split(';');
            // только если количество параметров сходится
            if(parsedDevices.length === parsedControls.length) {
                for (var i = 0; i < parsedDevices.length; i++) {
                    controlsFromUrl[i] = new ControlFromUrl(parsedDevices[i], parsedControls[i]);
                }
            }
        }

        // контролы, выбранные для отображения в графике, массив объектов ChartsControl
        this.selectedControls = [];

        // ui is ready for interaction with user, all data is loaded
        this.ready = false;

        // Wait for data loading for charts
        this.loadPending = controlsFromUrl.length;

        this.dataPointsMultiple = []

        // 4. Setup
        var controlsAreLoaded = $q.defer();
        uiConfig.whenReady().then((data) => {
            this.updateControls(data.widgets, DeviceData);
            controlsAreLoaded.resolve();
        });

        $q.all([
            controlsAreLoaded.promise,
            whenMqttReady()
          ]).then(() => {
            this.ready = true;
            this.setSelectedControlsAndStartLoading(controlsFromUrl);
        });

        this.plotlyEvents = (graph) => {
            // !!!!! метод обязательно должен быть в конструкторе иначе контекст будет непонятно чей
            graph.on('plotly_relayout', (event) => {
                if(event['xaxis.range[0]']) {
                    this.timeChange();

                    // порядок не менять!!!
                    this.selectedStartDate = new Date(event['xaxis.range[0]']);
                    this.selectedEndDate = new Date(event['xaxis.range[1]']);
                    this.setDefaultTime(this.selectedStartDate,this.selectedEndDate);
                    //обнуляю время чтобы не прогрессировало
                    this.resetTime();
                }
            })
        };

        // 5. Clean up
        $scope.$on('$destroy', () => {
            // Do whatever cleanup might be necessary
            $scope = null; // MEMLEAK FIX
        });
    } // constructor
    
    // Class methods
    //...........................................................................
    updateControls(widgets, DeviceData) {
        this.controls = this.orderByFilter(
            Array.prototype.concat.apply(
                [], 
                widgets.map(widget =>
                    widget.cells.map(item => {
                        const cell = DeviceData.cell(item.id);
                        const device = DeviceData.devices[cell.deviceId];
                        return new ChartsControl(cell, "Каналы из виджетов: ", device.name, widget.name);
                    })
                ),
            "name"));
        this.controls.push(...Array.prototype.concat.apply(
            [],
            Object.keys(DeviceData.devices).sort().map(deviceId => {
                const device = DeviceData.devices[deviceId];
                return device.cellIds.map(cellId => {
                    const cell = DeviceData.cell(cellId);
                    return new ChartsControl(cell, "Все каналы: ", device.name);
                });
            })
        ));
    }

    setSelectedControlsAndStartLoading(controlsFromUrl) {
        if (controlsFromUrl.length) {
            controlsFromUrl.forEach(control => {
                const cn = this.controls.find(element => element.match(control));
                if (cn) {
                    this.selectedControls.push(cn);
                    this.charts.push(new ChartTraits(cn));
                }
            })
            if (this.charts.length) {
                this.beforeLoadChunkedHistory();
            } else {
                this.loadPending = false;
            }
        } else {
            // если массив пустой, то создаю первый элемент
            this.selectedControls = [null];
        }
    }

    // читает из урла даты
    readDatesFromUrl() {
        this.startDate = this.convDate(this.$stateParams.start);
        this.endDate = this.convDate(this.$stateParams.end);
        this.setDefaultTime(this.startDate,this.endDate);
        // по умолчанию дата равна сегодня минус один день
        this.selectedStartDate = this.startDate? this.startDate : new Date( + (new Date()) - 24*60*60*1000 );
        this.selectedEndDate = this.endDate? this.endDate : new Date();
        this.timeChanged = true;
    };

    updateState() {
        const controls = this.selectedControls.filter(el => el);
        var state = {
            device:  controls.map(el => el.getDeviceForUrl()).join(';'),
            control: controls.map(el => el.getControlForUrl()).join(';'),
            start:   this.selectedStartDate ? this.selectedStartDate.getTime() + this.addHoursAndMinutes(this.selectedStartDateMinute) : "-",
            end:     this.selectedEndDate ? this.selectedEndDate.getTime() + this.addHoursAndMinutes(this.selectedEndDateMinute) : "-"
        }
        this.$state.go('history.sample', state, { reload: true, inherit: false, notify: true });
    }

    // считаю часы + минуты в мсек
    addHoursAndMinutes(date) {
        var num = 0;
        num += date.getHours()*60*60*1000;
        num += date.getMinutes()*60*1000;
        return num
    }

    resetTime() {
        // обнуляю время чтобы не прогрессировало
        if(this.selectedStartDate) {
            this.selectedStartDate.setHours(0);
            this.selectedStartDate.setMinutes(0)
        }
        if(this.selectedEndDate) {
            this.selectedEndDate.setHours(0);
            this.selectedEndDate.setMinutes(0)
        }
    }

    addTopic() {
        this.selectedControls.push(null)
    }

    deleteTopic(index) {
        this.selectedControls.splice(index, 1)
    }

    timeChange(type) {
        this.timeChanged = true;
    }

    updateDateRange() {
        if(this.isValidDatesRange()) {
            // доп проверки на минуты можно не ставить. если менять минуты например старта когда дата старта
            // не определена то урл не сменится так как все равно подставится "-" вместо даты старта
            if(this.selectedStartDate || this.selectedEndDate) {
                this.resetTime();
                this.updateState();
            }
        } else {
            alert('Date range is invalid. Change one of dates')
        }
    }

    isValidDatesRange() {
        if(!this.selectedStartDate) return true;

        var sMin, sHour,
            // копирую
            s = new Date(this.selectedStartDate),
            e = this.selectedEndDate ? new Date( this.selectedEndDate) : new Date();
        if(this.selectedStartDateMinute) {
            sMin = this.selectedStartDateMinute.getMinutes();
            sHour = this.selectedStartDateMinute.getHours();
        } else {
            sMin = 0;
            sHour = 0;
        }
        s.setMinutes(sMin);
        s.setHours(sHour);

        // назначаю только если есть конечная дата(а не время) иначе берутся текущие
        if(this.selectedEndDate) {
            e.setMinutes(this.selectedEndDateMinute.getMinutes());
            e.setHours(this.selectedEndDateMinute.getHours());
        }
        
        // сравниваю и разницу дат и то чтобы старт не был в будущем
        return this.handleData.diffDatesInMinutes(s, new Date()) > 0 && this.handleData.diffDatesInMinutes(s, e) > 0
    }

    //...........................................................................
    convDate(ts) {
        if (ts == null || ts == "-") {
            return null;
        }
        var d = new Date();
        d.setTime(ts - 0);
        return d;
    }

    // проставляет только время
    setDefaultTime(start,end) {
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

    beforeLoadChunkedHistory(indexOfControl=0) {
        if (!this.selectedControls[indexOfControl]) {
            this.loadPending = false;
            this.calculateTable();
            return
        }
        var chunks = this.handleData.splitDate(this.startDate,this.endDate,this.CHUNK_INTERVAL+1);
        this.chunksN = chunks.length - 1;
        this.loadChunkedHistory(indexOfControl,0,chunks)
    }

    calculateTable() {
        //TODO: use merge sort as we have here n^2 complexity
        var objX = {},graph = [];
        this.charts.forEach((ctrl,i) => {
            ctrl.xValues.forEach(x=> {
                objX[x] = null
            })
        });

        var arrX = Object.keys(objX);
        var _arrX = arrX.sort();
        _arrX.forEach(date=> {
            graph.push({
                date,
                value: Array(this.charts.length).fill(null)
            });
            // ищу совпадения в каждом канале
            this.charts.forEach((ctrl,iCtrl)=> {
                for (var i = 0; i < ctrl.xValues.length; i++) {
                    // если не нахожу то останется null
                    if(date === ctrl.xValues[i]) {
                        if (this.charts[iCtrl].stringValues) {
                            graph[graph.length-1].value[iCtrl] = ctrl.text[i];
                        } else {
                            graph[graph.length-1].value[iCtrl] = ctrl.yValues[i];
                        }
                        break
                    }
                }
            });
        });
        this.dataPointsMultiple = graph;
    }

    loadChunkedHistory(indexOfControl, indexOfChunk, chunks) {
        var control = this.selectedControls[indexOfControl];

        var params = {
            channels: [
                [control.cell.deviceId, control.cell.controlId]
            ],
            limit: this.historyMaxPoints,
            ver: 1
        };

        // никаких проверок дат. есть значения по умолчанию
        const startDate = new Date(chunks[indexOfChunk]);
        const endDate = new Date(chunks[indexOfChunk + 1]);
        params.timestamp = {
            // add extra second to include 00:00:00
            // но только для первого чанка / для последущих чанков наоборот
            // прибавляю 1 чтобы не было нахлеста
            // (FIXME: maybe wb-mqtt-db should support not just gt/lt, but also gte/lte?)
            gt: indexOfChunk==0? startDate.getTime() / 1000 - 1 : startDate.getTime() / 1000 + 1,
            lt: endDate.getTime() / 1000/// + 86400;
        };
        var intervalMs = endDate - startDate; // duration of requested interval, in ms
        // we want to request  no more than "limit" data points.
        // Additional divider 1.1 is here just to be on the safe side
        params.min_interval = intervalMs / params.limit * 1.1;
        this.loadHistory(params,indexOfControl,indexOfChunk,chunks)
    }

    stopLoadingData() {
        this.$timeout( () => {
            this.timeChanged = true;
            this.stopLoadData = true;
        })
    }

    hasStringValues(ar) {
        return ar.values.some(item => item.v != parseFloat(item.v))
    }

    createMainChart(chart, lineColor) {
        return {
            name: chart.channelName,
            x: chart.xValues,
            y: chart.yValues,
            text: chart.text,
            type: 'scatter',
            mode: 'lines',
            line: {
                shape: (chart.stringValues || chart.isBoolean ? 'hv' : 'linear'),
                color: lineColor
            },
            hovertemplate: '%{text}<extra></extra>'
        };
    }

    //https://plotly.com/javascript/continuous-error-bars/
    createErrorChart(chart, fillColor) {
        return {
            name: "∆ "+ chart.channelName,
            x: [...chart.xValues, ...[...chart.xValues].reverse()],
            y: [...chart.maxErrors, ...[...chart.minErrors].reverse()],
            type: "scatter",
            fill: "toself", 
            fillcolor: fillColor, 
            line: {color: "transparent"},
            hoverinfo: "none"
        };
    }

    processDbRecord(record, chart) {
        var ts = new Date();
        ts.setTime(record.t * 1000);
        chart.xValues.push(this.dateFilter(ts, "yyyy-MM-dd HH:mm:ss"));
        if (chart.stringValues) {
            chart.text.push(record.v);
            if (!chart.stringValues.has(record.v)) {
                chart.stringValues.set(record.v, chart.stringValues.size + 1)
            }
            chart.yValues.push(chart.stringValues.get(record.v));
        } else {
            if (record.min) {
                chart.text.push(record.v + " [" + record.min + ", " + record.max + "]");
            } else {
                chart.text.push(record.v);
            }
            chart.yValues.push(record.v);
            chart.maxErrors.push(record.max ? record.max : record.v);
            chart.minErrors.push(record.min ? record.min : record.v);
        }
    }

    processChunk(chunk, indexOfControl, indexOfChunk, chunks) {
        var chart = this.charts[indexOfControl];
        chart.progress.value = indexOfChunk + 1;

        if (chunk.has_more) this.errors.showError("Warning", "maximum number of points exceeded. Please select start date.");

        if (indexOfChunk==0 && this.hasStringValues(chunk)) {
            chart.stringValues = new Map();
            chart.hasErrors = false;
        }

        chunk.values.forEach(item => this.processDbRecord(item, chart));

        // если еще есть части интервала
        if (indexOfChunk + 2 < chunks.length) {
            this.loadChunkedHistory(indexOfControl,indexOfChunk + 1,chunks);
        // запрашиваю следущий контол если есть
        } else {
            if (chart.xValues.length) {
                var colors = this.colors.nextColor();
                this.chartConfig.push(this.createMainChart(chart, colors.chartColor));
                if (chart.hasErrors) {
                    this.chartConfig.push(this.createErrorChart(chart, colors.minMaxColor));
                }
            }
            chart.progress.isLoaded = true;
            this.beforeLoadChunkedHistory(indexOfControl + 1);
        }
    }

    loadHistory(params,indexOfControl,indexOfChunk,chunks) {
        if(this.stopLoadData) {
            this.loadPending = false;
            return;
        }
        this.HistoryProxy.get_values(params)
                         .then(result => this.processChunk(result, indexOfControl, indexOfChunk, chunks))
                         .catch(this.errors.catch("Error getting history"));
    }

    downloadHistoryTable() {
      const rows = document.querySelectorAll("#history-table tr");
      let csv = [];
      for (let i = 0; i < rows.length; i++) {
          const cols = rows[i].querySelectorAll("td, th");
          const row = [];
      
          for (let j = 0; j < cols.length; j++) {
              // warp channel name's in quotes to protect chanel name that contain ',' symbol  
              if(i === 0 && j > 0) {
                  row.push(`"${cols[j].innerText}"`);
              }
              else {
                  row.push(cols[j].innerText);
              }
          }
            
        csv.push(row.join(","));		
      }
      const csvFile = new Blob(["\ufeff", csv.join("\n")], {type: "text/csv"});
      
      const downloadLink = document.createElement("a");
      downloadLink.download = 'filename.csv';
      downloadLink.href = window.URL.createObjectURL(csvFile);
      downloadLink.style.display = "none";
      document.body.appendChild(downloadLink);

      downloadLink.click();
    }
} // class HistoryCtrl

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.history', [])
    .controller('HistoryCtrl', HistoryCtrl);
