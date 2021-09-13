class DiagnosticCtrl {
  constructor($scope, $timeout, $element, mqttClient, whenMqttReady) {
    'ngInject';


    whenMqttReady().then(function () {
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          var path = JSON.parse(msg.payload)["result"];
          console.log(path);
          $element[0].querySelector('#downloadDiag').disabled = false;
          $element[0].querySelector('#downloadDiag').value = path;
        });
    });


    $scope.getData = function() {
          console.log('{"id":  "'+  mqttClient.getID() + '"}');
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(), '{"id":  "'+  mqttClient.getID() + '"}');
    }

    $scope.downloadDiag = function() {
        const link = document.createElement('a');
        link.setAttribute('target', '_blank');
        console.log($element[0].querySelector('#downloadDiag').value)
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        link.setAttribute('href', 'http://' + url + $element[0].querySelector('#downloadDiag').value.substring(7));
        link.setAttribute('download', 'file.zip');
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
}

export default DiagnosticCtrl;
