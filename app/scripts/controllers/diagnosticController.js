class DiagnosticCtrl {
  constructor($scope, $timeout, $element, DiagnosticProxy, MqttRpc, whenMqttReady) {
    'ngInject';

    $scope.ready = false;
    $scope.archiveReady = false;
    $scope.canDownload = false;
    $scope.waitingResponse = false;
    scope.timeout = false;

    $scope.path = undefined;


    var fileIsOk = function httpGet(theUrl, callback){
        fetch(theUrl)
          .then(
            function(response) {
            callback(400);
//                callback(response.status);
            }
          )
          .catch(function(err) {
            console.log('Fetch Error :-S', err);
          });
    };

    var callbackFileIsOk =  function callbackFileIsOk(status){
        if (status < 400) {
            $scope.canDownload = true;
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

    $scope.diag = function() {
        $scope.waitingResponse = true;
        DiagnosticProxy.diag()
            .then( path => {
              $scope.path = path;
              var url = getUrl();
              var filename = path.substring(14);
              $scope.archiveReady = true;
              $scope.waitingResponse = false;
              fileIsOk('http://' + url + '/diag/' + filename, callbackFileIsOk);
            }, err=> {
              $scope.waitingResponse = false;
              $scope.timeout = true;
            })
    };

    $scope.downloadDiag = function() {
        var url = getUrl();
        var filename = $scope.path.substring(14)

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
