import dtPickerTemplate from '../../views/dateTimePickerModal.html';

class LogsCtrl {
    constructor($scope, $injector, $q, $uibModal, $element, $translate, $rootScope, $filter) {
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
        this.$filter = $filter;
        this.$q = $q;

        angular.extend(this, {
            scope: $scope,
            location: $location,
            logsMaxRows: logsMaxRows,
            LogsProxy: LogsProxy,
            dateFilter: dateFilter,
            errors: errors
        });

        this.selectedLevels = [];
        this.availableLevels = [
            { id: 0, label: "emergency" },
            { id: 1, label: "alert" },
            { id: 2, label: "critical" },
            { id: 3, label: "error" },
            { id: 4, label: "warning" },
            { id: 5, label: "notice" },
            { id: 6, label: "info" },
            { id: 7, label: "debug" }
        ]; 
        this.levelsSettings = { smartButtonMaxItems: 6, buttonClasses: "form-control" };

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

        this.canCancelLoad = false;
        this.allowLoading = false;
        this.caseSensitive = true;
        this.regex = false;

        whenMqttReady()
            .then( () => this.LogsProxy.hasMethod('Load') )
            .then(result => {
                if (result) {
                    this.LogsProxy.hasMethod('CancelLoad').then(result => this.canCancelLoad = result);
                    vm.loadBootsAndServices();
                } else {
                    this.enableSpinner = false;
                    this.errors.catch('log.labels.unavailable')();
                }
            })
            .catch( (err) => {
                this.enableSpinner = false;
                this.errors.catch('logs.labels.unavailable')(err);
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
                         'logs.errors.unavailable',
                         'logs.labels.levels',
                         'logs.labels.check',
                         'logs.labels.uncheck'
                        ]).then(translations => {
          this.logDates[0].name = translations['logs.labels.latest'];
          this.logDates[1].name = translations['logs.labels.set-date'];
          this.boots[0].desc = translations['logs.labels.all-boots'];
          this.services[0].desc = translations['logs.labels.all-services'];
          this.nowMsg = translations['logs.labels.now'];
          this.sinceMsg = translations['logs.labels.since'];
          this.logsServiceUnavailableMsg = translations['logs.errors.unavailable'];
          this.levelsTexts = { 
                buttonDefaultText: translations['logs.labels.levels'],
                checkAll: translations['logs.labels.check'],
                uncheckAll: translations['logs.labels.uncheck']
            };
        });
    }

    reloadOrStopLoading() {
        if (this.scope.adapter.isLoading) {
            this.allowLoading = false;
            if (this.canCancelLoad) {
                this.LogsProxy.CancelLoad();
            }
            if (this.stopDeferred) {
                this.stopDeferred.resolve();
            }
        } else {
            this.reload();
        }
    }

    reload() {
        if (!this.scope.adapter.isLoading) {
            this.logs = [];
            this.stopDeferred = this.$q.defer();
            this.allowLoading = true;
            this.scope.adapter.reload();
        }
    }

    toLogsArrayIndex(uiScrollIndex) {
        return uiScrollIndex - this.logsTopUiScrollIndex;
    }

    convertTime(entry) {
        if (entry.time) {
            var t = new Date();
            t.setTime(entry.time);
            entry.time = t;
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
        if (this.waitBootsAndServices || !this.allowLoading) {
            success([]);
            return;
        }

        var params = {};
        params.service = this.selectedService.name;
        params.boot = this.selectedBoot.hash;
        if (this.selectedLevels.length) {
            params.levels = this.selectedLevels.map(l => l.id);
        }
        if (this.messagePattern) {
            params.pattern = this.messagePattern;
        }
        if (this.regex) {
            params.regex = true;
        }
        if (!this.caseSensitive) {
            params["case-sensitive"] = false;
        }

        // Reload logs
        if (this.logs.length == 0) {
            this.logsTopUiScrollIndex = uiScrollIndex;
            params.limit = count;
            if (this.startDateMs) {
                params.time = this.startDateMs/1000;
            }
            if (uiScrollIndex < 0) {
                params.cursor = {
                    direction: 'forward'
                };
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

        this.$q.race([this.LogsProxy.Load(params), this.stopDeferred.promise])
                .then(result => {
                    if (this.allowLoading) {
                        var res = result.map((entry) => {return this.convertTime(entry);});
                        if (uiScrollIndex < this.logsTopUiScrollIndex) {
                            this.logsTopUiScrollIndex = this.logsTopUiScrollIndex - res.length;
                            this.logs.unshift(...res);
                        } else {
                            this.logs.push(...res);
                        }
                        success(this.getLogsSlice(uiScrollIndex, count));
                    } else {
                        success([]);
                    }
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
                template: dtPickerTemplate,
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

    removeServicePostfix(service) {
        var pos = service.lastIndexOf('.');
        if (pos < 0) {
            return service;
        }
        return service.substr(0, pos)
    }

    makeLogName(service, time) {
        return this.removeServicePostfix(service || 'log') + '_' + this.$filter('date')(time, 'yyyyMMddTHHmmss') + '.log';
    }

    makeLogHeader(service, begin, end) {
        return (service || 'All services') + ' (' + begin.time.toISOString() + ' - ' + end.time.toISOString() + ')\n\n';
    }

    formatLogRow(l, service) {
        return l.time.toISOString() + ' [' + this.removeServicePostfix(service || l.service) + '] ' + l.msg;
    }

    save() {
        var l = this.logs.filter(l => l && l.msg);
        const header = this.makeLogHeader(this.selectedService.name, l[0], l[l.length - 1]); 
        const file = new Blob([header, l.map(l => this.formatLogRow(l, this.selectedService.name)).join("\n")], {type: "text/txt"});
        const downloadLink = document.createElement("a");
        downloadLink.download = this.makeLogName(this.selectedService.name, l[0].time);
        downloadLink.href = window.URL.createObjectURL(file);
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
    }

} // class LogsCtrl

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('LogsCtrl', LogsCtrl);
