class LogsCtrl {
    constructor($scope, $injector, $q) {
        'ngInject';

        var vm = this;

        var $stateParams = $injector.get('$stateParams');
        this.$stateParams = $stateParams;
        var $location = $injector.get('$location');
        var LogsProxy = $injector.get('LogsProxy');
        var whenMqttReady = $injector.get('whenMqttReady');
        var errors = $injector.get('errors');
        var logsMaxRows = $injector.get('logsMaxRows');
        var dateFilter = $injector.get('dateFilter');
        this.$timeout = $injector.get('$timeout');
        this.$state = $injector.get('$state');

        angular.extend(this, {
            scope: $scope,
            location: $location,
            logsMaxRows: logsMaxRows,
            LogsProxy: LogsProxy,
            dateFilter: dateFilter,
            errors: errors
        });

        this.waitBootsAndServices = true
        this.waitLogsLoading = false
        this.requestLatestLogs = '1'
        this.startDate = new Date();
        this.selectedStartDateMinute = this.startDate;

        $q.all([
            whenMqttReady()
          ]).then(() => {
            vm.loadBootsAndServices();
        });

        $scope.$on('$destroy', () => {
            // Do whatever cleanup might be necessary
            vm = null; // MEMLEAK FIX
            $scope = null; // MEMLEAK FIX
        });

    } // constructor

    convertHoursAndMinutesToMilliseconds(date) {
        return (date.getHours()*60 + date.getMinutes())*60*1000;
    }

    loadBootsAndServices()
    {
        this.LogsProxy.List().then(result => {
            this.boots = result.boots.map(obj => {
                var st = new Date();
                st.setTime(obj.start * 1000);
                var desc;
                if (obj.end) {
                    var en = new Date();
                    en.setTime(obj.end * 1000);
                    desc = st.toLocaleString() + ' - ' + en.toLocaletring();
                } else {
                    desc = 'Current boot from ' + st.toLocaleString();
                }
                return { hash: obj.hash, desc: desc };
            });
            this.boots.unshift({ hash: 'all', desc: 'All' });
            this.services = result.services;
            this.waitBootsAndServices = false;
            this.selectedBoot = this.boots[0].hash;
            this.selectedService = this.services[0];
        }).catch((err) => {
            this.waitBootsAndServices = false;
            this.errors.catch("Error getting boots and services")(err);
        });
    }

    setCommonParams() {
        var params = {
            service: this.selectedService,
            limit: this.logsMaxRows
        };
        if (this.selectedBoot != 'all') {
            params.boot = this.selectedBoot;
        }
        return params;
    }

    startLoadingLogs() {
        var params = this.setCommonParams();
        if (this.requestLatestLogs != '1') {
            this.startDate.setHours(0);
            this.startDate.setMinutes(0);
            this.startDate.setSeconds(1);
            params.time = (this.startDate.getTime() + this.convertHoursAndMinutesToMilliseconds(this.selectedStartDateMinute))/1000;
        }
        this.loadLog(params);
    }

    moveForward() {
        var params = this.setCommonParams();
        params.cursor = {
            id: this.logs[0].cursor,
            direction: 'forward'
        };
        this.loadLog(params);
    }

    moveBackward() {
        var params = this.setCommonParams();
        params.cursor = {
            id: this.logs[this.logs.length - 1].cursor,
            direction: 'backward'
        };
        this.loadLog(params);
    }

    loadLog(params) {
        this.waitLogsLoading = true;
        this.LogsProxy.Load(params).then(result => {
            this.logs = result.map(entry => {
                if (entry.time) {
                    var t = new Date();
                    t.setTime(entry.time);
                    entry.time = this.dateFilter(t, "dd-MM-yyyy HH:mm:ss.sss");
                }
                return entry;
            });
            this.waitLogsLoading = false;
        }).catch( (err) => {
            this.waitLogsLoading = false;
            this.errors.catch("Error getting logs")(err);
        });
    }

} // class LogsCtrl

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('LogsCtrl', LogsCtrl);
