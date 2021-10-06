class DiagnosticCtrl {
  constructor($scope, $translate, DiagnosticProxy, whenMqttReady) {
    'ngInject';

    $scope.btnVisible = false;
    $scope.btnEnabled = true;
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
            callback(response.status);
          }
        );
    };

    var callbackFileIsOk = function callbackFileIsOk(status) {
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

    var getUrl = function getUrl() {
      var url = window.location.href;
      url = url.substring(url.indexOf('//') + 2);
      url = url.substring(0, url.indexOf('/'));
      return url;
    };

    whenMqttReady()
    .then( () => DiagnosticProxy.hasMethod('diag'))
    .then(function (result) {
      console.log(result);
      if (!result) {
          return "-1";
      } else {
          return DiagnosticProxy.status();
      };
    }
    ).then(function (payload) {
      if (payload != "1") {
        console.log(payload);
        changeBtnText('collector.states.unavailable');
      } else {
        console.log(payload);
        changeBtnText('collector.buttons.collect');
      };
      $scope.btnVisible = true;
      console.log("finished");
      console.log($scope.text);
    });

    var diag = function () {
      $scope.btnEnabled = false;
      changeBtnText('collector.states.collecting');
      DiagnosticProxy.diag()
        .then(names => {
          $scope.path = names['fullname'];
          $scope.basename = names['basename'];
          var url = getUrl();
          fileIsOk('http://' + url + '/diag/' + $scope.basename, callbackFileIsOk);
        }, err => {
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
