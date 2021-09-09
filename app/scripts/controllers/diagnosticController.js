class DiagnosticCtrl {
  constructor($scope, $timeout, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      console.log(mqttClient.getID())
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          console.log(msg.payload);
        });
    });


    $scope.getData = function() {
          console.log('{"id":  "'+  mqttClient.getID() + '"}');
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(), '{"id":  "'+  mqttClient.getID() + '"}');
    }

  }
}

export default DiagnosticCtrl;
