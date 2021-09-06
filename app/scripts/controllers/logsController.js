class LogsCtrl {
    constructor($scope, $injector, $q, $uibModal, $element, $translate, $rootScope) {
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
        this.$translate = $translate;

        angular.extend(this, {
            scope: $scope,
            location: $location,
            logsMaxRows: logsMaxRows,
            LogsProxy: LogsProxy,
            dateFilter: dateFilter,
            errors: errors
        });

        this.waitBootsAndServices = true;
        this.enableSpinner = true;
        this.logs = [];
        this.logDates = [
            // Object for "Latest logs" item
            {
                name: undefined, // Will be replaced by 'logs.labels.latest' translation
                date: undefined
            },

            // Object for "Set start date" item
            {
                name: undefined, // Will be replaced by 'logs.labels.set-date' translation
                date: null
            }
        ];
        this.startDateMs = undefined;
        this.selectedStartDateMs = undefined;

        this.boots = [
            // Object for "All boots" item
            {
                hash: undefined,
                desc: undefined // Will be replaced by 'logs.labels.all-boots' translation
            }
        ];

        this.services = [
            // Object for "All services" item
            {
                name: undefined,
                desc: undefined // Will be replaced by 'logs.labels.all-services' translation
            }
        ];

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

        this.updateTranslations();
        $rootScope.$on('$translateChangeSuccess', () => this.updateTranslations());

        $scope.$on('$destroy', () => {
            // Do whatever cleanup might be necessary
            vm = null; // MEMLEAK FIX
            $scope = null; // MEMLEAK FIX
        });

    } // constructor

    updateTranslations() {
        this.$translate(['logs.labels.latest',
                         'logs.labels.set-date',
                         'logs.labels.all-boots',
                         'logs.labels.all-services',
                         'logs.labels.now',
                         'logs.labels.since',
                         'logs.errors.unavailable'
                        ]).then(translations => {
          this.logDates[0].name = translations['logs.labels.latest'];
          this.logDates[1].name = translations['logs.labels.set-date'];
          this.boots[0].desc = translations['logs.labels.all-boots'];
          this.services[0].desc = translations['logs.labels.all-services'];
          this.nowMsg = translations['logs.labels.now'];
          this.sinceMsg = translations['logs.labels.since'];
          this.logsServiceUnavailableMsg = translations['logs.errors.unavailable'];
        });
    }

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
        params.service = this.selectedService.name;
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
            this.errors.catch('logs.errors.load')(err);
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
                    desc = st.toLocaleString() + ' - ' + this.nowMsg;
                }
                return { hash: obj.hash, desc: desc };
            }));
            this.services.push(...result.services.map(s => { return {name: s, desc: s}}));
            this.waitBootsAndServices = false;
            this.selectedBoot = this.boots[0];
            this.selectedService = this.services[0];
        }).catch((err) => {
            this.enableSpinner = false;
            if ("MqttTimeoutError".localeCompare(err.data) == 0) {
                this.errors.catch('logs.errors.services')(this.logsServiceUnavailableMsg);
            } else {
                this.errors.catch('logs.errors.services')(err);
            }
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
                                            this.logDates.push({ name: this.sinceMsg+ " " + selectedDate.toLocaleString(), date: selectedDate.getTime()});
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
