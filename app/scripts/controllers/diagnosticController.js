class DiagnosticCtrl {
  constructor($scope, $timeout, $element, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          var path = JSON.parse(msg.payload)["result"];
          $element[0].querySelector('#downloadDiag').disabled = false;
          $element[0].querySelector('#downloadDiag').value = path;
        });
    });


    $scope.getData = function() {
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(), '{"id":  "'+  mqttClient.getID() + '"}');
    }

    $scope.downloadDiag = function() {
        const link = document.createElement('a');
        link.setAttribute('target', '_blank');
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        link.setAttribute('href', 'http://' + url + $element[0].querySelector('#downloadDiag').value.substring(8));
        link.setAttribute('download', $element[0].querySelector('#downloadDiag').value.substring(8));
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
}

export default DiagnosticCtrl;
