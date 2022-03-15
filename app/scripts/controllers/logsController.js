import dtPickerTemplate from '../../views/dateTimePickerModal.html';

class LogsCtrl {
    constructor(
        $scope,
        $injector,
        $uibModal,
        $element,
        $translate,
        $rootScope,
        $filter,
        LogsService
    ) {
        "ngInject";

        var vm = this;

        var $stateParams = $injector.get("$stateParams");
        this.$stateParams = $stateParams;
        var $location = $injector.get("$location");
        var LogsProxy = $injector.get("LogsProxy");
        var whenMqttReady = $injector.get("whenMqttReady");
        var errors = $injector.get("errors");
        var dateFilter = $injector.get("dateFilter");
        this.$state = $injector.get("$state");
        this.$uibModal = $uibModal;
        this.$element = $element;
        this.$translate = $translate;
        this.$filter = $filter;

        $scope.logsService = LogsService;

        angular.extend(this, {
            scope: $scope,
            location: $location,
            LogsProxy: LogsProxy,
            dateFilter: dateFilter,
            errors: errors,
        });

        this.availableLevels = [
            { id: 0, label: "emergency" },
            { id: 1, label: "alert" },
            { id: 2, label: "critical" },
            { id: 3, label: "error" },
            { id: 4, label: "warning" },
            { id: 5, label: "notice" },
            { id: 6, label: "info" },
            { id: 7, label: "debug" },
        ];

        this.levelsSettings = {
            smartButtonMaxItems: 6,
            buttonClasses: "form-control",
        };

        this.enableSpinner = true;

        this.boots = [
            {
                hash: undefined,
                desc: undefined,
            },
        ];

        this.services = [
            {
                name: undefined,
                desc: undefined,
            },
        ];

        this.logDates = [
            {
                name: undefined,
                date: undefined,
            },
            {
                name: undefined,
                date: null,
            },
        ];

        this.selectedStartDateMs = undefined;

        this.allowLoading = false;

        whenMqttReady()
            .then(() => this.LogsProxy.hasMethod("Load"))
            .then((result) => {
                if (result) {
                    this.LogsProxy.hasMethod("CancelLoad").then(
                        (result) => (this.scope.logsService.canCancelLoad = result)
                    );
                    vm.loadBootsAndServices();
                } else {
                    this.enableSpinner = false;
                    this.errors.catch("log.labels.unavailable")();
                }
            })
            .catch((err) => {
                this.enableSpinner = false;
                this.errors.catch("logs.labels.unavailable")(err);
            });

        this.updateTranslations();
        $rootScope.$on("$translateChangeSuccess", () =>
            this.updateTranslations()
        );

        $scope.$on("$destroy", () => {
            vm = null;
            $scope = null;
        });
    } // constructor

    updateTranslations() {
        this.$translate([
            "logs.labels.latest",
            "logs.labels.set-date",
            "logs.labels.all-boots",
            "logs.labels.all-services",
            "logs.labels.now",
            "logs.labels.since",
            "logs.errors.unavailable",
            "logs.labels.levels",
            "logs.labels.check",
            "logs.labels.uncheck",
        ]).then((translations) => {
            this.logDates[0].name = translations["logs.labels.latest"];
            this.logDates[1].name = translations["logs.labels.set-date"];
            this.boots[0].desc = translations["logs.labels.all-boots"];
            this.services[0].desc = translations["logs.labels.all-services"];
            this.nowMsg = translations["logs.labels.now"];
            this.sinceMsg = translations["logs.labels.since"];
            this.logsServiceUnavailableMsg = translations["logs.errors.unavailable"];
            this.levelsTexts = {
                buttonDefaultText: translations["logs.labels.levels"],
                checkAll: translations["logs.labels.check"],
                uncheckAll: translations["logs.labels.uncheck"],
            };
        });
    }

    loadBootsAndServices() {
        this.LogsProxy.List()
            .then((result) => {
                this.boots.push(
                    ...result.boots.map((obj) => {
                        var st = new Date();
                        st.setTime(obj.start * 1000);
                        var desc;
                        if (obj.end) {
                            var en = new Date();
                            en.setTime(obj.end * 1000);
                            desc =
                                st.toLocaleString() +
                                " - " +
                                en.toLocaleString();
                        } else {
                            desc = st.toLocaleString() + " - " + this.nowMsg;
                        }
                        return { hash: obj.hash, desc: desc };
                    })
                );
                this.services.push(
                    ...result.services.map((s) => {
                        return { name: s, desc: s };
                    })
                );
                this.scope.logsService.waitBootsAndServices = false;
                this.scope.logsService.selectedBoot = this.boots[0];
                this.scope.logsService.selectedService = this.services[0];
            })
            .catch((err) => {
                this.enableSpinner = false;
                if ("MqttTimeoutError".localeCompare(err.data) == 0) {
                    this.errors.catch("logs.errors.services")(
                        this.logsServiceUnavailableMsg
                    );
                } else {
                    this.errors.catch("logs.errors.services")(err);
                }
            });
    }

    periodChanged() {
        if (this.selectedStartDateMs === null) {
            var modalInstance = this.$uibModal.open({
                animation: false,
                ariaDescribedBy: "modal-body",
                template: dtPickerTemplate,
                controller: "DateTimePickerModalCtrl",
                controllerAs: "$ctrl",
                size: "sm",
            });
            modalInstance.result.then(
                (selectedDate) => {
                    if (
                        !this.logDates.some(
                            (el) => el.date === selectedDate.getTime()
                        )
                    ) {
                        this.logDates.push({
                            name:
                                this.sinceMsg +
                                " " +
                                selectedDate.toLocaleString(),
                            date: selectedDate.getTime(),
                        });
                        if (this.logDates.length > 12) {
                            this.logDates.splice(2, 1);
                        }
                    }
                    this.selectedStartDateMs = selectedDate.getTime();
                    this.scope.logsService.startDateMs = selectedDate.getTime();
                },
                () => (this.selectedStartDateMs = this.scope.logsService.startDateMs)
            );
        } else {
            this.scope.logsService.startDateMs = this.selectedStartDateMs;
        }
    }

    logsResize(size) {
        if (size.h && size.w) {
            const hpx = size.h + "px";
            const wpx = size.w + "px";
            var lt = this.$element[0].querySelector("#logs-table");
            lt.style.height = hpx;
            lt.style.width = wpx;
            var ltb = this.$element[0].querySelector("#logs-table tbody");
            ltb.style.height = hpx;
            ltb.style.width = wpx;
        }
    }

    removeServicePostfix(service) {
        if (!service) {
            return "";
        }
        var pos = service.lastIndexOf(".");
        if (pos < 0) {
            return service;
        }
        return service.substr(0, pos);
    }

    makeLogName(service, time) {
        return (
            this.removeServicePostfix(service || "log") +
            "_" +
            this.$filter("date")(time, "yyyyMMddTHHmmss") +
            ".log"
        );
    }

    makeLogHeader(service, begin, end, pattern, matchCase, isRegex) {
        var header =
            (service || "All services") +
            " (" +
            begin.time.toISOString() +
            " - " +
            end.time.toISOString() +
            ")";
        if (pattern) {
            if (isRegex) {
                header = header + `, regular expression \"${pattern}\"`;
            } else {
                header = header + `, pattern \"${pattern}\"`;
            }
            if (matchCase) {
                header = header + ", match case";
            }
        }
        return header + "\n\n";
    }

    formatLogRow(l, service) {
        return (
            l.time.toISOString() +
            " [" +
            this.removeServicePostfix(service || l.service) +
            "] " +
            l.msg
        );
    }

    save() {
        var l = this.logs.filter((l) => l && l.msg);
        const header = this.makeLogHeader(
            this.scope.logsService.selectedService.name,
            l[0],
            l[l.length - 1],
            this.scope.logsService.messagePattern,
            this.scope.logsService.caseSensitive,
            this.scope.logsService.regex
        );
        const file = new Blob(
            [
                header,
                l
                    .map((l) =>
                        this.formatLogRow(
                            l,
                            this.scope.logsService.selectedService.name
                        )
                    )
                    .join("\n"),
            ],
            { type: "text/txt" }
        );
        const downloadLink = document.createElement("a");
        downloadLink.download = this.makeLogName(
            this.scope.logsService.selectedService.name,
            l[0].time
        );
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
