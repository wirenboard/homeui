export default class ScanCtrl {
    constructor($scope, DeviceManagerProxy, errors, whenMqttReady, mqttClient) {
        'ngInject';

        $scope.enableSpinner = true;
        $scope.available = false;
        $scope.data = {};
        $scope.requestScanning = false;

        whenMqttReady()
            .then( () => DeviceManagerProxy.hasMethod('Scan') )
            .then(result => {
                $scope.available = result;
                $scope.enableSpinner = false;
                if (!result) {
                    errors.catch('scan.labels.unavailable')();
                } else {
                    mqttClient.addStickySubscription('/wb-device-manager/state', function(msg) {
                        var data = JSON.parse(msg.payload);
                        if (data.scanning) {
                            $scope.requestScanning = false;
                        } else {
                            if ($scope.requestScanning) {
                                data.scanning = true;
                                data.progress = 0;
                            }
                        }
                        $scope.data = data;
                    });
                }
            })
            .catch( () => {
                $scope.enableSpinner = false;
                errors.catch('scan.labels.unavailable')(err);
            });
        
        $scope.requestScan = function() {
            if ($scope.data.scanning) {
                return;
            }
            $scope.requestScanning = true;
            $scope.data.scanning = true;
            $scope.data.progress = 0;
            DeviceManagerProxy.Scan()
                .catch( (err) => {
                    $scope.requestScanning = false;
                    $scope.errors.catch('scan.errors.scan')(err);
                });
        }
    }
}