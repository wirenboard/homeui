class DiagnosticCtrl {
  constructor($scope, $timeout, Upload, mqttClient, whenMqttReady) {
    'ngInject';

    $scope.getData = function() {
        url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        $scope.httpGetAsync("http://" + url + ":5000/diagcollect", alert, 'GET');
    }

    $scope.httpGetAsync = function(theUrl, callback, method) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
        xmlHttp.open(method, theUrl, true);
        xmlHttp.send(null);
    }
  }
}

export default DiagnosticCtrl;
