

class DiagnosticCtrl {
  constructor($scope, $timeout, Upload, mqttClient, whenMqttReady) {
    'ngInject';

    $scope.getData = function() {
        console.log(1)
        alert('Добрый день 1');

        $scope.httpGetAsync("http://127.0.0.1:5000/diagcollect", alert);

        alert('Добрый день 2');
        console.log(2)
    }


    $scope.httpGetAsync = function(theUrl, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
                callback(xmlHttp.responseText);
        }
        xmlHttp.open("GET", theUrl, true);
        xmlHttp.send(null);
    }


  }
}

console.log('loaded')

export default DiagnosticCtrl;
