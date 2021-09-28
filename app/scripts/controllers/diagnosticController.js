class DiagnosticCtrl {
  constructor($scope, $translate, DiagnosticProxy, whenMqttReady) {
    'ngInject';

    $scope.btnVisible = false;
    $scope.btnEnabled = true;
    $scope.text = "";

    $scope.path = undefined;

    var changeBtnText = function changeBtnText(name){
        $translate([name])
          .then(translations => {
                $scope.text = translations[name];
        });
    };

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
            $scope.btnEnabled = true;
            changeBtnText('collector.buttons.download');
            $scope.btnMethod = downloadDiag;
        }
        else {
            $translate(['collector.errors.unavailableToDownload'])
            .then(translations => {
                $scope.text = translations['collector.errors.unavailableToDownload'] + ' ' + $scope.path;
            });
        };
    };

    var getUrl =  function getUrl(){
        var url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        return url;
    };

    whenMqttReady().then( function() {
        changeBtnText('collector.buttons.collect');
        return DiagnosticProxy.status();
    }
    ).then(function(payload) {
        if (payload == "1"){
                $scope.btnVisible = true;
            }
    });

    var diag = function() {
        $scope.btnEnabled = false;
        changeBtnText('collector.states.collecting');
        DiagnosticProxy.diag()
            .then( path => {
              $scope.path = path;
              var url = getUrl();
              var filename = path.substring(14);
              fileIsOk('http://' + url + '/diag/' + filename, callbackFileIsOk);
            }, err=> {
              changeBtnText('collector.errors.timeout');
            })
    };

    var downloadDiag = function() {
        var filename = $scope.path.substring(14);
        window.location.href = 'diag/' + filename;
    };

    $scope.btnMethod = diag;
  }
}

export default DiagnosticCtrl;
