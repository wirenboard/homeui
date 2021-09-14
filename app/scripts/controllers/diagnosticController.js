class DiagnosticCtrl {
  constructor($scope, $timeout, $element, mqttClient, whenMqttReady) {
    'ngInject';

    $scope.collectDataBtn = $element[0].querySelector('#downloadDiag');

    whenMqttReady().then(function () {
      $scope.collectDataBtn.style.visibility="hidden";

      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          var path = JSON.parse(msg.payload)["result"];
          $scope.collectDataBtn.disabled = false;
          $scope.collectDataBtn.value = path;
          $scope.collectDataBtn.innerHTML = "Download";
        });
    });


    $scope.getData = function() {
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(), '{"id":  "'+  mqttClient.getID() + '"}');
          $scope.collectDataBtn.style.visibility="visible";
          $scope.collectDataBtn.innerHTML = "Collecting...";
    }

    $scope.downloadDiag = function() {
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        var filename = $scope.collectDataBtn.value.substring(9)

        const link = document.createElement('a');
        link.setAttribute('target', '_blank');
        link.setAttribute('href', 'http://' + url + '/' + filename);
        link.setAttribute('download', filename);
        // TODO: серийник контроллера в имя файла
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
}

export default DiagnosticCtrl;
