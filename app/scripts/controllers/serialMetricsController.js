class SerialMetricsCtrl {
    constructor($injector) {
        'ngInject';

        this.SerialMetricsProxy = $injector.get('SerialMetricsProxy');
        this.errors = $injector.get('errors');
        this.enableSpinner = true;
        this.available = false;

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
        this.SerialMetricsProxy.Load().then(result => {
            this.busLoad = result;
            this.enableSpinner = false;
        }).catch( (err) => {
            this.enableSpinner = false;
            this.errors.catch('serial-metrics.errors.load')(err);
        });
    }

    formatNames(names) {
        return names.map(n => n.split('/')[1]).filter(n => n).join(', ');
    }

    getDeviceName(names) {
        if (names.length) {
            var name = names[0].split('/')[0];
            if (name == 'idle') {
                return 'serial-metrics.labels.idle';
            }
            return name;
        }
        return '';
    }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('SerialMetricsCtrl', SerialMetricsCtrl);
