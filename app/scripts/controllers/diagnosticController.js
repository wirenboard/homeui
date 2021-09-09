class DiagnosticCtrl {
  constructor($scope, $timeout, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      console.log(mqttClient.clientId)
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.clientId + "/+", function(msg) {
          console.log(msg.payload);
        });
    });


    $scope.getData = function() {
          console.log('{"id":  "'+  mqttClient.clientId + '"}');
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.clientId, '{"id":  "'+  mqttClient.clientId + '"}');
    }

  }
}

export default DiagnosticCtrl;
