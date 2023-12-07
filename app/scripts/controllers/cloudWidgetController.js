class CloudWidgetCtrl {
  constructor($scope, mqttClient) {
    'ngInject';

    $scope.cloudAvailable = false;
    $scope.cloudOk = false;
    $scope.cloudError = null;
    $scope.activationLink = null;

    mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/controls/status', function(msg) {
      if (msg.payload == "") {
        $scope.cloudAvailable = false;
      } else {
        $scope.cloudAvailable = true;
        $scope.cloudOk = (msg.payload == "ok");
        $scope.cloudError = (msg.payload == "ok") ? null : msg.payload;
      }
    });

    mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/controls/activation-link', function(msg) {
      $scope.activationLink = (msg.payload.startsWith("http")) ? msg.payload : null;
    });

  }
}

export default CloudWidgetCtrl;
