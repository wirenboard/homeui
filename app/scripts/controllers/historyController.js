

class HistoryCtrl {
    //...........................................................................
    constructor($scope, $injector) {
        'ngInject';

        // 1. Self-reference
        var vm = this;

        // 2. requirements
        var $stateParams = $injector.get('$stateParams');
        var $location = $injector.get('$location');
        var HistoryProxy = $injector.get('HistoryProxy');
        var whenMqttReady = $injector.get('whenMqttReady');
        var errors = $injector.get('errors');
        var historyMaxPoints = $injector.get('historyMaxPoints');
        var dateFilter = $injector.get('dateFilter');
        var uiConfig = $injector.get('uiConfig');
        var orderByFilter = $injector.get('orderByFilter');

        angular.extend(this, {
            scope: $scope,
            location: $location,
            historyMaxPoints: historyMaxPoints,
            HistoryProxy: HistoryProxy,
            dateFilter: dateFilter,
            errors: errors,
            // читаем из урла даты
            startDate: this.convDate($stateParams.start),
            endDate: this.convDate($stateParams.end),
            controls: []
        });

        this.topics = [];// все топики из урла
        this.chartConfig = [];// данные графика
        this.controlIds = [];// контролы из урла
        this.devices = [];// девайсы из урла
        this.layoutConfig = {
            // yaxis: {title: "7777"},       // set the y axis title
            xaxis: {
                //showgrid: false, // remove the x-axis grid lines
                //tickformat: "%B, %Y"  // customize the date format to "month, day"
            },
            margin: {// update the left, bottom, right, top margin
                l: 40, b: 40, r: 10, t: 20
            }
        };

        // ищу в урле контролы
        if($stateParams.device && $stateParams.control) {
            this.devices = $stateParams.device.split(';');
            this.controlIds = $stateParams.control.split(';');
            // только если количество параметров сходится
            if(this.devices.length === this.controlIds.length) {
                for (var i = 0; i < this.devices.length; i++) {
                    this.topics.push("/devices/" + this.devices[i] + "/controls/" + this.controlIds[i])
                }
            }
        }
        // если массив пустой то создаю первый элемент
        this.topics = this.topics.length? this.topics : [null];
        this.selectedTopics = this.topics;

        this.setDefaultTime(this.startDate,this.endDate);
        this.selectedStartDate = this.startDate;
        this.selectedEndDate = this.endDate;
        // опции ограничивающие выбор. тк после смены дат перезагрузка то
        // только здесь они определяются/ вотчить не надо
        this.dateOptionsEnd = {minDate:this.startDate};
        this.dateOptionsStart = {maxDate:this.endDate};

        this.ready = false;
        this.loadPending = !!this.topics.length;

        // 4. Setup
        uiConfig.whenReady().then((data) => {
            updateControls(data.widgets);
        });

        whenMqttReady().then(() => {
            vm.ready = true;
            if (vm.loadPending) {
                vm.loadHistory();
            }
        });

        /*this.plotlyEvents = (graph)=>{
            // !!!!! метод обязтельно должен быть в конструкторе иначе контекст будет непонятно чей
            graph.on('plotly_relayout', (event)=>{
                if(event['xaxis.range[0]']) {
                    // после первой перерисовки открываю кнопку с помощью this.plotlyStartDate
                    this.plotlyStartDate = event['xaxis.range[0]'];
                    this.plotlyEndDate = event['xaxis.range[1]'];
                }
            })
        };*/

        // 5. Clean up
        $scope.$on('$destroy', () => {
            // Do whatever cleanup might be necessary
            vm = null; // MEMLEAK FIX
            $scope = null; // MEMLEAK FIX
        });

        // 6. All the actual implementations go here

        //...........................................................................
        function updateControls(widgets) {
            vm.controls = orderByFilter(
                Array.prototype.concat.apply(
                    [], widgets.map(widget =>
                        widget.cells.map(cell =>
                            ({
                                topic: vm.topicFromCellId(cell.id),
                                name: widget.name + " / " + (cell.name || cell.id)
                            })))),
                "name");

        }

    } // constructor

    // Class methods
    //...........................................................................
    updateUrl(index=0,deleteOne=false,onlyTimeUpdate=false) {
        // смена урла

        //  если удаляется селект
        if(deleteOne) {
            this.devices.splice(index,1);
            this.controlIds.splice(index,1);
        } else if (!onlyTimeUpdate) {
            // если меняется или добавляется контрол
            var parsedTopic = this.parseTopic(this.selectedTopics[index]);
            // если этот контрол уже загружен в другой селект или нет такого топика
            if (!parsedTopic ||
                (this.controlIds.includes(parsedTopic.controlId)) && this.devices.includes(parsedTopic.deviceId))
                return;
            // перезаписываю существующие
            this.devices[index] = parsedTopic.deviceId;
            this.controlIds[index] = parsedTopic.controlId;
        } else if (onlyTimeUpdate) {

        }

        // считаю часы + минуты в мсек
        function addHoursAndMinutes(date) {
            var num = 0;
            num += date.getHours()*60*60*1000;
            num += date.getMinutes()*60*1000;
            return num
        }

        // обнуляю время чтобы не прогрессировало
        if(this.selectedStartDate) {
            this.selectedStartDate.setHours(0);
            this.selectedStartDate.setMinutes(0)
        }
        if(this.selectedEndDate) {
            this.selectedEndDate.setHours(0);
            this.selectedEndDate.setMinutes(0)
        }

        this.location.path([
            "/history",
            this.devices.join(';'),
            this.controlIds.join(';'),
            this.selectedStartDate ? this.selectedStartDate.getTime() + addHoursAndMinutes(this.selectedStartDateMinute) : "-",
            this.selectedEndDate ? this.selectedEndDate.getTime() + addHoursAndMinutes(this.selectedEndDateMinute) : "-"
        ].join("/"));
    }

    addTopic() {
        this.selectedTopics.push(null)
    }

    deleteTopic(i) {
        this.updateUrl(i,true)
    }

    onlyTimeUpdate() {
        // доп проверки на минуты можно не ставить. если менять минуты например старта когда дата старта
        // не определена то урл не сменится так как все равно подставится "-" вместо даты старта
        if(this.selectedStartDate || this.selectedEndDate) this.updateUrl(false,false,true)
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

    setDefaultTime(start,end) {
        // выставляю время
        // вычитываю из урла или ставлю дефолтное
        // если даты не определены то ставлю произвольные но главное время 00-00
        var s = start || new Date('2000-01-01');
        var _s = new Date();
        _s.setHours(!start? 0 : s.getHours());// у даты по умолчанию стоит 4 часа а не 0
        _s.setMinutes(s.getMinutes());
        this.selectedStartDateMinute = _s;

        var e = end || new Date('2000-01-01');
        var _e = new Date();
        _e.setHours(!end? 0 : e.getHours());// у даты по умолчанию стоит 4 часа а не 0
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

    changeDateByPlotly() {
        if(!this.plotlyStartDate) return;
        var start = new Date(this.plotlyStartDate);
        var end = new Date(this.plotlyEndDate);
        this.location.path([
            "/history",
            this.devices.join(';'),
            this.controlIds.join(';'),
            start.getTime(),
            end.getTime()
        ].join("/"))
    }

    loadHistory(index=0,byChunks=false) {
        if (!this.ready) {
            this.loadPending = true;
            return
        }
        this.loadPending = false;
        if (!this.topics[index]) {
            return
        }

        var parsedTopic = this.parseTopic(this.topics[index]);
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

        if (this.startDate) {
            params.timestamp = params.timestamp || {};
            // add extra second to include 00:00:00
            // (FIXME: maybe wb-mqtt-db should support not just gt/lt, but also gte/lte?)
            params.timestamp.gt = this.startDate.getTime() / 1000 - 1;
        }

        if (this.endDate) {
            params.timestamp = params.timestamp || {};
            params.timestamp.lt = this.endDate.getTime() / 1000;/// + 86400;
        }

        if (this.startDate) {
            var endDate = this.endDate || Date.now();
            var intervalMs = endDate - this.startDate; // duration of requested interval, in ms

            // we want to request  no more than "limit" data points.
            // Additional divider 1.1 is here just to be on the safe side
            params.min_interval = intervalMs / params.limit * 1.1;
        }

        this.pend = true;

        this.HistoryProxy.get_values(params).then(result => {
            this.pend = false;
            if (result.has_more)
                this.errors.showError("Warning", "maximum number of points exceeded. Please select start date.");
            var xValues = result.values.map(item => {
                var ts = new Date();
                ts.setTime(item.t * 1000);
                return this.dateFilter(ts, "yyyy-MM-dd HH:mm:ss");
            });
            var yValues = result.values.map(item => item.v - 0);



            this.chartConfig[index] = {//https://plot.ly/javascript/error-bars/
                name: 'Control ' + (index+1),
                x: xValues,
                y: yValues,
                type: 'scatter',
                mode: 'lines'
            };

            if(index==0) {
                this.firstTopicIsLoaded = true;
            }

            // для таблицы под графиком
            this.dataPoints = xValues.map((x, i) => ({x: x, y: yValues[i]}));

            // запрашиваю все графики по очереди
            if(index < this.selectedTopics.length) this.loadHistory(index+1);

        }).catch(this.errors.catch("Error getting history"));
    } // loadHistory

} // class HistoryCtrl

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.history', [])
    .controller('HistoryCtrl', HistoryCtrl);
