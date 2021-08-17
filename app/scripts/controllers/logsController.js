class LogsCtrl {
    constructor($scope, $injector, $q, $uibModal, $element) {
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
        this.$state = $injector.get('$state');
        this.$uibModal = $uibModal;
        this.$element = $element;

        angular.extend(this, {
            scope: $scope,
            location: $location,
            logsMaxRows: logsMaxRows,
            LogsProxy: LogsProxy,
            dateFilter: dateFilter,
            errors: errors
        });

        this.waitBootsAndServices = true;
        this.logs = [];
        this.logDates = [
            {
                "name": "Latest",
                "date": undefined
            },
            {
                "name": "Set start date",
                "date": null
            }
        ];
        this.startDateMs = undefined;
        this.selectedStartDateMs = undefined;

        this.boots = [
            {
                hash: undefined,
                desc: 'All boots'
            }
        ];

        this.ALL_SERVICES = 'All services';
        this.services = [ this.ALL_SERVICES ];

        $q.all([
            whenMqttReady()
          ]).then(() => {
            vm.loadBootsAndServices();
        });

        $scope.adapter = {};
        $scope.datasource = {};
        $scope.datasource.get = function (index, count, success) { 
            return vm.getChunk(index, count, success);
        };

        $scope.$on('$destroy', () => {
            // Do whatever cleanup might be necessary
            vm = null; // MEMLEAK FIX
            $scope = null; // MEMLEAK FIX
        });

    } // constructor

    reload() {
        this.logs = [];
        this.scope.adapter.reload();
    }

    toLogsArrayIndex(uiScrollIndex) {
        return uiScrollIndex - this.logsTopUiScrollIndex;
    }

    convertTimeToStr(entry) {
        if (entry.time) {
            var t = new Date();
            t.setTime(entry.time);
            entry.time = this.dateFilter(t, "dd-MM-yyyy HH:mm:ss.sss");
        }
        return entry;
    }

    getLogsSlice(uiScrollIndex, count) {
        var start = this.toLogsArrayIndex(uiScrollIndex);
        var end = start + count;
        if (start < 0) {
            start = 0;
        }
        return this.logs.slice(start, end);
    }

    setForwardCursor(params, logsArrayIndex) {
        params.cursor = {
            id: this.logs[0].cursor,
            direction: 'forward'
        };
        params.limit = -logsArrayIndex;
    }

    setBackwardCursor(params, logsArrayIndex, count) {
        params.cursor = {
            id: this.logs[this.logs.length - 1].cursor,
            direction: 'backward'
        };
        params.limit = count + logsArrayIndex - this.logs.length;
    }

    getChunk(uiScrollIndex, count, success) {
        if (this.waitBootsAndServices) {
            success([]);
            return;
        }

        var params = {};
        if (this.selectedService != this.ALL_SERVICES) {
            params.service = this.selectedService;
        };
        params.boot = this.selectedBoot.hash;

        // Reload logs
        if (this.logs.length == 0) {
            this.logsTopUiScrollIndex = uiScrollIndex;
            params.limit = count;
            if (this.startDateMs) {
                params.time = this.startDateMs/1000;
            }
        } else {
            var logsArrayIndex = this.toLogsArrayIndex(uiScrollIndex);
            // Requested interval is inside this.logs array, so get cached values
            if ((logsArrayIndex >= 0) && (count + logsArrayIndex <= this.logs.length)) {
                success(this.logs.slice(logsArrayIndex, logsArrayIndex + count));
                return;
            }
            if (logsArrayIndex < 0) {
                this.setForwardCursor(params, logsArrayIndex);         // Requested interval is before this.logs array
            } else {
                this.setBackwardCursor(params, logsArrayIndex, count); // Requested interval is after this.logs array
            }
            if (!params.cursor.id) {
                success(this.getLogsSlice(uiScrollIndex, count));
                return;
            }
        }

        this.LogsProxy.Load(params).then(result => {
            var res = result.map((entry) => {return this.convertTimeToStr(entry);});
            if (uiScrollIndex < this.logsTopUiScrollIndex) {
                this.logsTopUiScrollIndex = this.logsTopUiScrollIndex - res.length;
                this.logs.unshift(...res);
            } else {
                this.logs.push(...res);
            }
            success(this.getLogsSlice(uiScrollIndex, count));
        }).catch( (err) => {
            success([]);
            this.errors.catch("Error getting logs")(err);
        });
    }

    loadBootsAndServices() {
        this.LogsProxy.List().then(result => {
            this.boots.push(...result.boots.map(obj => {
                var st = new Date();
                st.setTime(obj.start * 1000);
                var desc;
                if (obj.end) {
                    var en = new Date();
                    en.setTime(obj.end * 1000);
                    desc = st.toLocaleString() + ' - ' + en.toLocaleString();
                } else {
                    desc = st.toLocaleString() + ' - now';
                }
                return { hash: obj.hash, desc: desc };
            }));
            this.services.push(...result.services);
            this.waitBootsAndServices = false;
            this.selectedBoot = this.boots[0];
            this.selectedService = this.services[0];
        }).catch((err) => {
            this.waitBootsAndServices = false;
            this.errors.catch("Error getting boots and services")(err);
        });
    }

    periodChanged() {
        if (this.selectedStartDateMs === null) {
            var modalInstance = this.$uibModal.open({
                animation: false,
                ariaDescribedBy: 'modal-body',
                templateUrl: 'views/dateTimePickerModal.html',
                controller: 'DateTimePickerModalCtrl',
                controllerAs: '$ctrl',
                size: 'sm'
            });
            modalInstance.result.then((selectedDate) => {
                                        if (!this.logDates.some(el => el.date === selectedDate.getTime())) {
                                            this.logDates.push({ name: "Since " + selectedDate.toLocaleString(), date: selectedDate.getTime()});
                                            if (this.logDates.length > 12) {
                                                this.logDates.splice(2, 1);
                                            }
                                        }
                                        this.selectedStartDateMs = selectedDate.getTime();
                                        this.startDateMs = selectedDate.getTime();
                                      },
                                      () => this.selectedStartDateMs = this.startDateMs);
        } else {
            this.startDateMs = this.selectedStartDateMs;
        }
    }

    logsResize(size) {
        if (size.h && size.w) {
            const hpx = size.h + "px";
            const wpx = size.w + "px";
            var lt = this.$element[0].querySelector('#logs-table');
            lt.style.height = hpx;
            lt.style.width = wpx;
            var ltb = this.$element[0].querySelector('#logs-table tbody');
            ltb.style.height = hpx;
            ltb.style.width = wpx;
        }
    }

} // class LogsCtrl

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('LogsCtrl', LogsCtrl);
