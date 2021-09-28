class DiagnosticCtrl {
  constructor($scope, $translate, DiagnosticProxy, whenMqttReady) {
    'ngInject';

    $scope.ready = false;
    $scope.archiveReady = false;
    $scope.canDownload = false;
    $scope.waitingResponse = false;
    $scope.timeout = false;
    $scope.waitStarting = true;

    $scope.path = undefined;


    var fileIsOk = function httpGet(theUrl, callback){
        fetch(theUrl, {method: 'HEAD'})
          .then(
            function(response) {
                callback(response.status);
            }
          );
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
                $scope.waitStarting = false;
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
        var filename = $scope.path.substring(14);
        window.location.href = 'diag/' + filename);
    };


  }
}

export default DiagnosticCtrl;
