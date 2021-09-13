class DiagnosticCtrl {
  constructor($scope, $timeout, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      console.log("whenMqttReady");
      console.log(mqttClient.getID())
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          console.log(msg.payload["result"]);
          var btn_download_diag = document.getElementByID('downloadDiag');
          btn_download_diag.disabled = false;
          btn_download_diag.value = msg.payload["result"];
        });
    });


    $scope.getData = function() {
          console.log('{"id":  "'+  mqttClient.getID() + '"}');
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(), '{"id":  "'+  mqttClient.getID() + '"}');
    }

    $scope.downloadDiag = function() {
        btn_download_diag = document.getElementByID('downloadDiag');
        const link = document.createElement('a');
        link.setAttribute('target', '_blank');
        link.setAttribute('href',  btn_download_diag.value);
        link.setAttribute('download', 'file.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}

  }
}

export default DiagnosticCtrl;
