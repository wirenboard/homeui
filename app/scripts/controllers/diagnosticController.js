class DiagnosticCtrl {
  constructor($scope, $timeout, $element, DiagnosticProxy, MqttRpc, whenMqttReady) {
    'ngInject';

    $scope.downloadDataBtn = $element[0].querySelector('#downloadDiag');
    $scope.collectDataBtn = $element[0].querySelector('#collectDiag');
    $scope.ready = false;
    $scope.downloadDataBtn.style.visibility="hidden";


    var fileIsOk = function httpGet(theUrl, callback){
        fetch(theUrl)
          .then(
            function(response) {
                callback(response);
            }
          )
          .catch(function(err) {
            console.log('Fetch Error :-S', err);
          });
    };

    var callbackFileIsOk =  function callbackFileIsOk(status){
        if (status < 400) {
            $scope.downloadDataBtn.disabled = false;
            $scope.downloadDataBtn.innerHTML = "Скачать";
        } else {
            $scope.downloadDataBtn.innerHTML = "Невозможно скачать файл. Скопируйте его с контроллера по адресу '"  + $scope.downloadDataBtn.value + "'";
        }
    };

    var getUrl =  function getUrl(){
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        return url;
    };

    whenMqttReady().then( function() {
        return DiagnosticProxy.status();
    }
    ).then(function(payload) {
        if (payload == "1"){
                $scope.ready = true;
            }
    });

//    whenMqttReady().then(function () {
//      mqttClient.addStickySubscription("/rpc/v1/diag/main/diag/" + mqttClient.getID() + "/+", function(msg) {
//          if ($scope.waitingResponse) {
//              var path = JSON.parse(msg.payload)["result"];
//              $scope.downloadDataBtn.value = path;
//              $scope.waitingResponse = false;
//              $timeout.cancel(timePromise);
//
//              var url = getUrl();
//              var filename = $scope.downloadDataBtn.value.substring(14);
//
//              fileIsOk('http://' + url + '/diag/' + filename, callbackFileIsOk);
//          }
//      });
//    });

    $scope.diag = function() {
        scope.downloadDataBtn.style.visibility="visible";
        $scope.collectDataBtn.disabled=true;
        $scope.downloadDataBtn.innerHTML = "Collecting...";
        $scope.waitingResponse = true;
        DiagnosticProxy.diag()
            .then( path => {
              var path = JSON.parse(msg.payload)["result"];
              $scope.downloadDataBtn.value = path;
              var url = getUrl();
              var filename = $scope.downloadDataBtn.value.substring(14);
              fileIsOk('http://' + url + '/diag/' + filename, callbackFileIsOk);
            }, err=> {
              $scope.waitingResponse = false;
              $scope.downloadDataBtn.innerHTML = "Время ожидания вышло";
            })
    };

//    $scope.getData = function() {
//          mqttClient.send("/rpc/v1/diag/main/diag/"  + mqttClient.getID(),
//           '{"id":  "'+  mqttClient.getID() + '"}', false, 1);
//          $scope.downloadDataBtn.style.visibility="visible";
//          $scope.collectDataBtn.disabled=true;
//          $scope.downloadDataBtn.innerHTML = "Collecting...";
//          $scope.waitingResponse = true;
//          timePromise = $timeout(function(){
//                        $scope.waitingResponse = false;
//                        $scope.downloadDataBtn.innerHTML = "Время ожидания вышло";
//                     }, 10000);
//    };

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
    };


  }
}

export default DiagnosticCtrl;
