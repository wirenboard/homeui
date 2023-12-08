class CloudWidgetCtrl {
  constructor($scope, mqttClient) {
    'ngInject';

    $scope.cloudAvailable = false;
    $scope.cloudOk = false;
    $scope.cloudError = null;
    $scope.activationLink = null;
    $scope.cloudLink = "https://wirenboard.cloud/";

    mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/controls/status', function(msg) {
      if (msg.payload == "") {
        $scope.cloudAvailable = false;
      } else {
        $scope.cloudAvailable = true;
        $scope.cloudOk = (msg.payload == "ok");
        $scope.cloudError = (msg.payload == "ok") ? null : msg.payload;
      }
    });

    mqttClient.addStickySubscription('/devices/system__wb-cloud-agent/controls/activation_link', function(msg) {
      $scope.activationLink = (msg.payload.startsWith("http")) ? msg.payload : null;
    });

    mqttClient.addStickySubscription('/devices/system/controls/Short SN', function(msg) {
      $scope.cloudLink = "https://wirenboard.cloud/controllers/" + msg.payload;
    });
  }
}

export default CloudWidgetCtrl;
