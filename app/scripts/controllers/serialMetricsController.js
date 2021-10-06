class SerialMetricsCtrl {
    constructor($injector) {
        'ngInject';

        this.SerialMetricsProxy = $injector.get('SerialMetricsProxy');
        this.errors = $injector.get('errors');
        this.enableSpinner = true;
        this.available = false;
        this.sortColumn = undefined;
        this.sortAsc = false;

        $injector.get('whenMqttReady')()
            .then( () => this.SerialMetricsProxy.hasMethod('Load') )
            .then(result => {
                this.available = result;
                if (!result) {
                    this.enableSpinner = false;
                    this.errors.catch('serial-metrics.labels.unavailable')();
                } else {
                    this.getBusLoad();
                }
            })
            .catch( () => {
                this.enableSpinner = false;
                this.errors.catch('serial-metrics.labels.unavailable')(err);
            });
    }

    getBusLoad() {
        this.errors.hideError();
        this.enableSpinner = true;

        var isIdle = (ch) => ch.names && ch.names.length && ch.names[0] == 'idle';
        var formatNames = (names) => names && names.map(n => n.split('/')[1]).filter(n => n).join(', ');

        var transformChannel = (channel) => {
            channel.serial = false;
            channel.device = '';
            if (channel.names && channel.names.length) {
                var name = channel.names[0].split('/')[0];
                if (name == 'wb-mqtt-serial') {
                    channel.device = 'serial-metrics.labels.serial';
                    channel.serial = true;
                    delete channel.i50;
                    delete channel.i95;
                } else {
                    channel.device = name;
                }
            }
            channel.controls = formatNames(channel.names);
            channel.bl = parseFloat(channel.bl);
            channel.bl15 = parseFloat(channel.bl15);
            delete channel.names;
            return channel;
        };

        this.SerialMetricsProxy.Load().then(result => {
            this.busLoad = result.map(item => {
                return {
                    port: item.port,
                    idle: item.channels.filter(isIdle),
                    channels: item.channels.filter(ch => !isIdle(ch)).map(transformChannel)
                };
            });
            this.enableSpinner = false;
        }).catch( (err) => {
            this.enableSpinner = false;
            this.errors.catch('serial-metrics.errors.load')(err);
        });
    }

    sortToggle(column) {
        if (column != this.sortColumn) {
            this.sortColumn = column;
            this.sortAsc = false;
            return;
        }
        if (!this.sortAsc) {
            this.sortAsc = true;
            return;
        }
        this.sortColumn = undefined;
    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('SerialMetricsCtrl', SerialMetricsCtrl);
