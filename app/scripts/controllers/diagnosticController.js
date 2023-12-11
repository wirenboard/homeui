class DiagnosticCtrl {
  constructor($scope, $translate, DiagnosticProxy, errors, whenMqttReady) {
    'ngInject';

    $scope.started = false;
    $scope.btnVisible = false;
    $scope.btnEnabled = true;
    $scope.collecting = false;
    $scope.pathMessage = false;
    $scope.text = "";

    $scope.path = undefined;
    $scope.basename = undefined;

    var changeBtnText = function changeBtnText(name) {
      $translate([name])
        .then(translations => {
          $scope.text = translations[name];
        });
    };

    var fileIsOk = function httpGet(theUrl, callback) {
      fetch(theUrl, { method: 'HEAD' })
        .then(
          function (response) {
            callback(response.headers.get('Content-Type'));
          }
        );
    };

    var callbackFileIsOk = function callbackFileIsOk(contentType) {
      $scope.collecting = false;
      if (contentType == 'application/zip') {
        $scope.btnEnabled = true;
        changeBtnText('collector.buttons.download');
        $scope.btnMethod = downloadDiag;
      }
      else {
        $scope.btnVisible = false;
        $scope.pathMessage = true;
      };
    };

    var getUrl = function getUrl() {
      var url = window.location.href;
      url = url.substring(url.indexOf('//') + 2);
      url = url.substring(0, url.indexOf('/'));
      return url;
    };

    whenMqttReady()
      .then(() => DiagnosticProxy.hasMethod('diag'))
      .then(function (result) {
        if (!result) {
          return "-1";
        } else {
          return DiagnosticProxy.status();
        };
      }
      ).then(function (payload) {
        if (payload != "1") {
          changeBtnText('collector.errors.unavailable');
          $scope.btnEnabled = false;
        } else {
          changeBtnText('collector.buttons.collect');
          $scope.started = true;
        };
        $scope.btnVisible = true;
      }).catch(errors.catch("Error while checking availableness of service"));

    var diag = function () {
      $scope.btnEnabled = false;
      changeBtnText('collector.states.collecting');
      $scope.collecting = true;
      DiagnosticProxy.diag()
        .then(names => {
          $scope.path = names['fullname'];
          $scope.basename = names['basename'];
          var url = getUrl();
          fileIsOk(location.protocol + '//' + url + '/diag/' + $scope.basename, callbackFileIsOk);
        }, err => {
          $scope.collecting = false;
          changeBtnText('collector.errors.timeout');
        })
    };

    var downloadDiag = function () {
      var filename = $scope.basename;
      window.location.href = 'diag/' + filename;
    };

    $scope.btnMethod = diag;
  }
}

export default DiagnosticCtrl;
