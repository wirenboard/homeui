export default class ScanCtrl {
    constructor($scope, DeviceManagerProxy, errors, whenMqttReady, mqttClient) {
        'ngInject';

        $scope.enableSpinner = true;
        $scope.available = false;
        $scope.data = {};

        whenMqttReady()
            .then( () => DeviceManagerProxy.hasMethod('scan') )
            .then(result => {
                $scope.available = result;
                if (!result) {
                    $scope.enableSpinner = false;
                    errors.catch('scan.labels.unavailable')();
                } else {
                    mqttClient.addStickySubscription('/rpc/v1/wb-device-manager/bus-scan/state', function(msg) {
                        $scope.data = JSON.parse(msg.payload); 
                    });
                    $scope.enableSpinner = false;
                }
            })
            .catch( () => {
                $scope.enableSpinner = false;
                errors.catch('scan.labels.unavailable')(err);
            });
        
        $scope.requestScan = function() {
            // $scope.enableSpinner = true;
            DeviceManagerProxy.scan();
            // .then(result => {
            //     $scope.enableSpinner = false;
            // }).catch( (err) => {
            //     $scope.enableSpinner = false;
            //     $scope.errors.catch('scan.errors.scan')(err);
            // });
        }
    }
}