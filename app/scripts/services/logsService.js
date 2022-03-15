function logsService(LogsProxy, logsMaxRows, errors, $translate, $q) {
    "ngInject";

    this.LogsProxy = LogsProxy;
    this.logsMaxRows = logsMaxRows;
    this.errors = errors;
    this.$translate = $translate;
    this.$q = $q;

    this.isError = false;
    this.savedTime = null;
    this.waitBootsAndServices = true;
    this.canCancelLoad = false;
    this.allowLoading = false;
    this.messagePattern = undefined;
    this.regex = false;
    this.caseSensitive = true;

    this.startDateMs = undefined;

    this.selectedService = {};
    this.selectedBoot = {};
    this.selectedLevels = [];

    this.logs = [];

    this.adapter = {};

    this.datasource = {};
    this.datasource.get = (index, count, success) => {
        return this.getChunk(index, count, success);
    };

    this.toLogsArrayIndex = (uiScrollIndex) => {
        return uiScrollIndex - this.logsTopUiScrollIndex;
    };

    this.convertTime = (entry) => {
        if (entry.time) {
            var t = new Date();
            t.setTime(entry.time);
            entry.time = t;
        }
        return entry;
    };

    this.getLogsSlice = (uiScrollIndex, count) => {
        var start = this.toLogsArrayIndex(uiScrollIndex);
        var end = start + count;
        if (start < 0) {
            start = 0;
        }
        return this.logs.slice(start, end);
    };

    this.setForwardCursor = (params, logsArrayIndex) => {
        params.cursor = {
            id: this.logs[0].cursor,
            direction: "forward",
        };
        params.limit = -logsArrayIndex;
    };

    this.setBackwardCursor = (params, logsArrayIndex, count) => {
        params.cursor = {
            id: this.logs[this.logs.length - 1].cursor,
            direction: "backward",
        };
        params.limit = count + logsArrayIndex - this.logs.length;
    };

    this.getChunk = (uiScrollIndex, count, success) => {
        if (this.waitBootsAndServices || !this.allowLoading) {
            success([]);
            return;
        }

        var params = {};
        params.service = this.selectedService.name;
        params.boot = this.selectedBoot.hash;
        if (this.selectedLevels.length) {
            params.levels = this.selectedLevels.map((l) => l.id);
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

        if (this.logs.length == 0) {
            this.logsTopUiScrollIndex = uiScrollIndex;
            params.limit = count;
            if (this.startDateMs) {
                params.time = this.startDateMs / 1000;
            }
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
                        entry.old_time = entry.time;
                        if (entry.level < 4) {
                            this.isError = true;
                        }
                        return this.convertTime(entry);
                    });

                    var tmp = [];
                    res.forEach((entry) => {
                        if (this.savedTime) {
                            if (this.savedTime < entry.old_time) {
                                tmp.push(entry);
                            }
                        } else {
                            tmp.push(entry);
                        }
                    });

                    if (uiScrollIndex < this.logsTopUiScrollIndex) {
                        this.logsTopUiScrollIndex = this.logsTopUiScrollIndex - res.length;
                        this.logs.unshift(...tmp);
                    } else {
                        this.logs.push(...tmp);
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
    };

    this.reloadOrStopLoading = () => {
        if (this.adapter.isLoading) {
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

    this.reload = () => {
        if (!this.adapter.isLoading) {
            this.logs = [];
            this.isError = false;
            this.stopDeferred = this.$q.defer();
            this.allowLoading = true;
            this.adapter.reload();
        }
    }

    return this;
}

export default logsService;
