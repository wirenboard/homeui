class ConfigCtrl {
    constructor(
        $scope,
        $element,
        $stateParams,
        rolesFactory,
        ConfigEditorProxy,
        whenMqttReady,
        PageState,
        LogsProxy,
        logsMaxRows,
        errors,
        $q
    ) {
        "ngInject";

        this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
        if (!this.haveRights) {
            return;
        }

        this.$element = $element;
        this.$q = $q;
        this.logs = [];
        this.boots = [];
        this.allowLoading = false;
        this.waitBootsAndServices = true;
        this.isError = false;

        $scope.file = {
            schemaPath: $stateParams.path,
            configPath: "",
            loaded: false,
            valid: true,
            content: {},
            errors,
        };

        this.createLogsVisibility();

        $scope.editorOptions = {};
        if (!/^\//.test($scope.file.schemaPath))
            $scope.file.schemaPath = "/" + $scope.file.schemaPath;

        $scope.canSave = function () {
            return PageState.isDirty() && $scope.file.valid;
        };

        $scope.onChange = function (content, errors) {
            if (!angular.equals($scope.file.content, content)) {
                PageState.setDirty(true);
                $scope.file.content = content;
            }
            $scope.file.valid = !errors.length;
        };

        var load = () => {
            ConfigEditorProxy.Load({
                path: $scope.file.schemaPath,
            })
                .then((r) => {
                    $scope.editorOptions = r.schema.strictProps
                        ? { no_additional_properties: true }
                        : {};

                    if (r.schema.limited) {
                        angular.extend($scope.editorOptions, {
                            disable_properties: true,
                            disable_edit_json: true,
                        });
                    }

                    $scope.file.configPath = r.configPath;
                    $scope.file.content = r.content;
                    $scope.file.schema = r.schema;
                    $scope.file.loaded = true;

                    this.loadBoots();
                })
                .catch(errors.catch("configurations.errors.load"));
        };

        $scope.save = () => {
            PageState.setDirty(false);
            ConfigEditorProxy.Save({
                path: $scope.file.schemaPath,
                content: $scope.file.content,
            })
                .then(() => {
                    if ($scope.file.schema.needReload) {
                        load();
                    }
                    this.reloadLogs();
                })
                .catch((e) => {
                    PageState.setDirty(true);
                    errors.showError(
                        {
                            msg: "configuration.errors.save",
                            data: { name: $scope.file.configPath },
                        },
                        e
                    );
                });
        };

        $scope.adapter = {};
        $scope.datasource = {};
        $scope.datasource.get = (index, count, success) => {
            return this.getChunk(index, count, success);
        };

        angular.extend(this, {
            scope: $scope,
            logsMaxRows: logsMaxRows,
            LogsProxy: LogsProxy,
        });

        whenMqttReady().then(load);
    }

    loadBoots() {
        this.LogsProxy.List().then((result) => {
            this.boots.push(
                ...result.boots.map((obj) => {
                    return { hash: obj.hash };
                })
            );
            this.waitBootsAndServices = false;
            this.selectedBoot = this.boots[0];
            this.selectedService =
                this.scope.file.schema.configFile.service + ".service";
            this.reloadLogs();
        });
    }

    getLogsSlice(uiScrollIndex, count) {
        var start = this.toLogsArrayIndex(uiScrollIndex);
        var end = start + count;
        if (start < 0) {
            start = 0;
        }
        return this.logs.slice(start, end);
    }

    toLogsArrayIndex(uiScrollIndex) {
        return uiScrollIndex - this.logsTopUiScrollIndex;
    }

    setForwardCursor(params, logsArrayIndex) {
        params.cursor = {
            id: this.logs[0].cursor,
            direction: "forward",
        };
        params.limit = -logsArrayIndex;
    }

    setBackwardCursor(params, logsArrayIndex, count) {
        params.cursor = {
            id: this.logs[this.logs.length - 1].cursor,
            direction: "backward",
        };
        params.limit = count + logsArrayIndex - this.logs.length;
    }

    reloadLogs() {
        if (!this.scope.adapter.isLoading) {
            this.logs = [];
            this.stopDeferred = this.$q.defer();
            this.allowLoading = true;
            this.isError = false;
            this.scope.adapter.reload();
        }
    }

    getChunk(uiScrollIndex, count, success) {
        if (this.waitBootsAndServices || !this.allowLoading) {
            success([]);
            return;
        }

        var params = {};
        params.service = this.selectedService;
        params.boot = this.selectedBoot.hash;

        if (this.logs.length == 0) {
            this.logsTopUiScrollIndex = uiScrollIndex;
            params.limit = count;
            if (uiScrollIndex < 0) {
                params.cursor = {
                    direction: "forward",
                };
            }
        } else {
            var logsArrayIndex = this.toLogsArrayIndex(uiScrollIndex);
            if (
                logsArrayIndex >= 0 &&
                count + logsArrayIndex <= this.logs.length
            ) {
                success(
                    this.logs.slice(logsArrayIndex, logsArrayIndex + count)
                );
                return;
            }
            if (logsArrayIndex < 0) {
                this.setForwardCursor(params, logsArrayIndex);
            } else {
                this.setBackwardCursor(params, logsArrayIndex, count);
            }
            if (!params.cursor.id) {
                success(this.getLogsSlice(uiScrollIndex, count));
                return;
            }
        }

        this.$q
            .race([this.LogsProxy.Load(params), this.stopDeferred.promise])
            .then((result) => {
                if (this.allowLoading) {
                    var res = result.map((entry) => {
                        if (entry.level < 4) {
                            this.isError = true;
                        }
                        return this.convertTime(entry);
                    });
                    if (uiScrollIndex < this.logsTopUiScrollIndex) {
                        this.logsTopUiScrollIndex =
                            this.logsTopUiScrollIndex - res.length;
                        this.logs.unshift(...res);
                    } else {
                        this.logs.push(...res);
                    }
                    success(this.getLogsSlice(uiScrollIndex, count));
                } else {
                    success([]);
                }
            })
            .catch((err) => {
                success([]);
                this.errors.catch("logs.errors.load")(err);
            });
    }

    convertTime(entry) {
        if (entry.time) {
            var t = new Date();
            t.setTime(entry.time);
            entry.time = t;
        }
        return entry;
    }

    logsResize(size) {
        if (size.w && size.h) {
            const wpx = size.w + "px";
            const hpx = 110 + "px";

            var lt = this.$element[0].querySelector("#logs-table");
            lt.style.width = wpx;
            lt.style.height = hpx;

            var ltb = this.$element[0].querySelector("#logs-table tbody");
            ltb.style.width = wpx;
            ltb.style.height = hpx;
        }
    }

    createLogsVisibility() {
        if (!window.localStorage.configLogsVisibility) {
            window.localStorage.setItem(
                "configLogsVisibility",
                JSON.stringify({
                    isOpen: false,
                })
            );
        }
    }

    getLogsVisibility() {
        return JSON.parse(window.localStorage.configLogsVisibility);
    }

    invertLogsVisibility() {
        const configLogsVisibility = this.getLogsVisibility();
        configLogsVisibility.isOpen = !configLogsVisibility.isOpen;
        window.localStorage.setItem(
            "configLogsVisibility",
            JSON.stringify(configLogsVisibility)
        );
    }

    getLogsClasses() {
        return {
            "panel-danger": this.isError,
        };
    }

    getLogsShevronClasses() {
        const isOpen = this.getLogsVisibility().isOpen;
        return {
            "glyphicon-chevron-down": isOpen,
            "glyphicon-chevron-right": !isOpen,
        };
    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.config', [])
    .controller('ConfigCtrl', ConfigCtrl);
