class ChartTraits {
    constructor(name) {
        this.channelName = name;
        this.progress = {
            value: 0,
            isLoaded: false
        };
        this.stringValues = undefined;
        this.hasErrors = true;
        this.isBoolean = false;
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

        // 1. Self-reference
        var vm = this;
        // интервал загрузки частей графика
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
        var orderByFilter = $injector.get('orderByFilter');
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

        this.topics = [];// все топики из урла
        this.chartConfig = [];// данные графика

        // контролы из урла, массив объектов
        // {
        //     device: ...
        //     control: ...
        // } 
        this.controlsFromUrl = [];
        
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

        // ищу в урле контролы
        if($stateParams.device && $stateParams.control) {
            const parsedDevices = $stateParams.device.split(';');
            const parsedControls = $stateParams.control.split(';');
            // только если количество параметров сходится
            if(parsedDevices.length === parsedControls.length) {
                this.controlsFromUrl = []
                for (var i = 0; i < parsedDevices.length; i++) {
                    this.topics.push("/devices/" + parsedDevices[i] + "/controls/" + parsedControls[i]);
                    this.controlsFromUrl[i] = {device: parsedDevices[i], control: parsedControls[i]}
                }
            }
        }
        // если массив пустой то создаю первый элемент
        this.topics = this.topics.length? this.topics : [null];
        this.selectedTopics = this.topics;

        // Wait for data loading for charts
        this.loadPending = !!this.topics.length;
        this.disableUi = true;
        this.originalUrl = this.getUrl();

        this.dataPointsMultiple = []

        // 4. Setup
        var controlsAreLoaded = $q.defer();
        uiConfig.whenReady().then((data) => {
            updateControls(data.widgets, DeviceData);
            controlsAreLoaded.resolve();
        });

        $q.all([
            controlsAreLoaded.promise,
            whenMqttReady()
          ]).then(() => {
            if (vm.loadPending) {
                vm.charts = vm.controlsFromUrl.map(control => {
                    var chart = new ChartTraits(control.device + "/" + control.control);
                    var cn = vm.controls.find(element => ((element.deviceControl === chart.channelName)));
                    if (cn && (cn.valueType === "boolean")) {
                        chart.isBoolean = true;
                    }
                    return chart;
                })
                vm.beforeLoadChunkedHistory();
            } else {
                vm.disableUi = false;
            }
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
            vm = null; // MEMLEAK FIX
            $scope = null; // MEMLEAK FIX
        });

        // 6. All the actual implementations go here

        //...........................................................................
        function updateControls(widgets, DeviceData) {
            const channelsFromWidgets = orderByFilter(
                Array.prototype.concat.apply(
                    [], widgets.map(widget =>
                        widget.cells.map(cell =>
                            ({
                                topic: vm.topicFromCellId(cell.id),
                                name: widget.name + " / " + (cell.name || cell.id),
                                group: "Каналы из виджетов: ",
                                valueType: cell.valueType,
                                deviceControl: cell.id
                            })))),
                "name");
            const channelsAll = Array.prototype.concat.apply(
                [], 
                Object.keys(DeviceData.devices).sort().map(deviceId => {
                    const device = DeviceData.devices[deviceId];
                    return device.cellIds.map(cellId => {
                      const cell = DeviceData.cell(cellId);
                      return ({
                          topic: vm.topicFromCellId(cell.id),
                          name: device.name + " / " + (cell.name || cell.id),
                          group: "Все каналы: ",
                          valueType: cell.valueType,
                          deviceControl: cellId
                      });
                    });
                })
            );

            vm.controls = [].concat(channelsFromWidgets, channelsAll);
        }

    } // constructor

    // Class methods
    //...........................................................................

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

    getStateDescription() {
        return {
            device:  this.controlsFromUrl.filter(el => el).map(el => { return el.device  }).join(';'),
            control: this.controlsFromUrl.filter(el => el).map(el => { return el.control }).join(';'),
            start:   this.selectedStartDate ? this.selectedStartDate.getTime() + this.addHoursAndMinutes(this.selectedStartDateMinute) : "-",
            end:     this.selectedEndDate ? this.selectedEndDate.getTime() + this.addHoursAndMinutes(this.selectedEndDateMinute) : "-"
        }
    }

    updateState() {
        this.$state.go('history.sample', this.getStateDescription(), { reload: true, inherit: false, notify: true });
    }

    // смена урла
    updateUrl(index=0,deleteOne=false,onlyTimeUpdate=false) {
        //  если удаляется селект
        if(deleteOne) {
            this.controlsFromUrl.splice(index,1);
            this.selectedTopics.splice(index,1);
        } else {
            if (!onlyTimeUpdate) {
                // если меняется или добавляется контрол
                var parsedTopic = this.parseTopic(this.selectedTopics[index]);
                // если этот контрол уже загружен в другой селект или нет такого топика
                if (!parsedTopic ||
                    (this.controlsFromUrl.some( el => {return (el.device === parsedTopic.deviceId) && (el.control === parsedTopic.controlId)})))
                {
                    return;
                }
                // перезаписываю существующие
                this.controlsFromUrl[index] = {device: parsedTopic.deviceId, control: parsedTopic.controlId};
            } else {
                this.resetTime();
                this.updateState();
                var url = this.getUrl();
                this.originalUrl = url;
                return;
            }
        }

        this.resetTime();
        var url = this.getUrl();
        // из-за остановки и возможного возобновления загрузки графика ввожу доп проверку
        // изменился ли урл или нет
        if(this.originalUrl === url || location.href.indexOf(url)>=0) {
            if (!deleteOne) {
                this.updateState();
            }
        } else {
            this.location.path(url);
        }
        //перезаписываю
        this.originalUrl = url;
    }

    // считаю часы + минуты в мсек
    addHoursAndMinutes(date) {
        var num = 0;
        num += date.getHours()*60*60*1000;
        num += date.getMinutes()*60*1000;
        return num
    }

    getUrl() {
        const st = this.getStateDescription();
        return ["/history", st.device, st.control, st.start, st.end].join("/");
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
        this.selectedTopics.push(null)
    }

    deleteTopic(i) {
        this.updateUrl(i,true)
    }

    timeChange(type) {
        this.timeChanged = true;
    }

    updateDateRange() {
        if(this.isValidDatesRange()) {
            // доп проверки на минуты можно не ставить. если менять минуты например старта когда дата старта
            // не определена то урл не сменится так как все равно подставится "-" вместо даты старта
            if(this.selectedStartDate || this.selectedEndDate) this.updateUrl(false,false,true)
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

    //...........................................................................
    topicFromCellId(cellId) {
        return "/devices/" + cellId.replace("/", "/controls/");
    }

    //...........................................................................
    parseTopic(topic) {
        if (!topic) {
            return null;
        }

        var m = topic.match(/^\/devices\/([^\/]+)\/controls\/([^\/]+)/);
        if (!m) {
            console.warn("bad topic: %s", topic);
            return null;
        }
        return {
            deviceId: m[1],
            controlId: m[2]
        };
    } // parseTopic

    beforeLoadChunkedHistory(indexOfControl=0) {
        if (!this.topics[indexOfControl]) {
            this.loadPending = false;
            this.calculateTable();
            this.disableUi = false;
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

    loadChunkedHistory(indexOfControl,indexOfChunk, chunks) {
        var parsedTopic = this.parseTopic(this.topics[indexOfControl]);
        if (!parsedTopic) {
            return
        }

        var params = {
            channels: [
                [parsedTopic.deviceId, parsedTopic.controlId]
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

    createErrorChart(chart, fillColor) {
        return {//https://plotly.com/javascript/continuous-error-bars/
            name: "min/max "+ chart.channelName,
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
