class DiagnosticCtrl {
  constructor($scope, $timeout, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      console.log("whenMqttReady");
      console.log(mqttClient.getID())
      console.log(mqttClient.clientID)
      console.log(mqttClient.clientId)
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
