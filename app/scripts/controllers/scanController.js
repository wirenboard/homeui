export default class ScanCtrl {
    constructor($scope, DeviceManagerProxy, errors, whenMqttReady, mqttClient) {
        'ngInject';

        $scope.enableSpinner = true;
        $scope.available = false;
        $scope.data = {};

        whenMqttReady()
            .then( () => DeviceManagerProxy.hasMethod('Scan') )
            .then(result => {
                $scope.available = result;
                $scope.enableSpinner = false;
                if (!result) {
                    errors.catch('scan.labels.unavailable')();
                } else {
                    mqttClient.addStickySubscription('/wb-device-manager/state', function(msg) {
                        $scope.data = msg.payload;
                    });
                }
            })
            .catch( () => {
                $scope.enableSpinner = false;
                errors.catch('scan.labels.unavailable')(err);
            });
    }
}