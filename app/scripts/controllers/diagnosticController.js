

class DiagnosticCtrl {
  constructor($scope, $timeout, Upload, mqttClient, whenMqttReady) {
    'ngInject';

    $scope.getData = function() {
        console.log(1)

        $scope.httpGetAsync("http://127.0.0.1:5000/diagcollect", console.log , 'OPTIONS');

        console.log(1.5)

        $scope.httpGetAsync("http://127.0.0.1:5000/diagcollect", alert, 'GET');

        console.log(2)
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

console.log('loaded')

export default DiagnosticCtrl;
