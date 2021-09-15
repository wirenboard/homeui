class SerialMetricsCtrl {
    constructor($injector) {
        'ngInject';

        this.SerialMetricsProxy = $injector.get('SerialMetricsProxy');
        this.errors = $injector.get('errors');
        this.enableSpinner = false;
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
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.logs', [])
    .controller('SerialMetricsCtrl', SerialMetricsCtrl);
