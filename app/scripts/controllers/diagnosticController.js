class DiagnosticCtrl {
  constructor($scope, $timeout, $element, mqttClient, whenMqttReady) {
    'ngInject';

    $scope.downloadDataBtn = $element[0].querySelector('#downloadDiag');
    $scope.collectDataBtn = $element[0].querySelector('#collectDiag');
    $scope.waitingResponse = false;
    $scope.ready = false;
    $scope.downloadDataBtn.style.visibility="hidden";

    var timePromise = undefined;

    var fileIsOk = function httpGet(theUrl, callback){
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4)
            console.log(xmlHttp.status);
            callback(xmlHttp.status);
        }
        xmlHttp.open("GET", theUrl, true);
        xmlHttp.send(null);
    }

    var getUrl =  function getUrl(){
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        return url;
    }

    var callbackFileIsOk =  function callbackFileIsOk(status){
        if (status < 400) {
            $scope.downloadDataBtn.disabled = false;
            $scope.downloadDataBtn.innerHTML = "Download";
        } else {
            $scope.downloadDataBtn.innerHTML = "Cannot download file. Copy it from '"  + $scope.downloadDataBtn.value + "'";
        }
    }


    mqttClient.addStickySubscription("/rpc/v1/diag/main/diag", function(msg) {
            if (msg.payload == "1") {
                $scope.ready = true;
            }
    });

    whenMqttReady().then(function () {
      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
          if ($scope.waitingResponse) {
              var path = JSON.parse(msg.payload)["result"];
              $scope.downloadDataBtn.value = path;
              $scope.waitingResponse = false;
              $timeout.cancel(timePromise);

              var url = getUrl();
              var filename = $scope.downloadDataBtn.value.substring(14);

              fileIsOk('http://' + url + '/diag/' + filename, callbackFileIsOk);
          }
      });
    });

    $scope.getData = function() {
          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(),
           '{"id":  "'+  mqttClient.getID() + '"}', false, 1);
          $scope.downloadDataBtn.style.visibility="visible";
          $scope.collectDataBtn.disabled=true;
          $scope.downloadDataBtn.innerHTML = "Collecting...";
          $scope.waitingResponse = true;
          timePromise = $timeout(function(){
                        $scope.waitingResponse = false;
                        $scope.downloadDataBtn.innerHTML = "Timeout exceed";
                     }, 10000);
    }

    $scope.downloadDiag = function() {
        var url = getUrl();
        var filename = $scope.downloadDataBtn.value.substring(14)

        const link = document.createElement('a');
        link.setAttribute('target', '_blank');
        link.setAttribute('href', 'http://' + url + '/diag/' + filename);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
  }
}

export default DiagnosticCtrl;
