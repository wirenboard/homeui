class DiagnosticCtrl {
  constructor($scope, $translate, DiagnosticProxy, errors, whenMqttReady, mqttClient) {
    'ngInject';

    $scope.started = false;
    $scope.btnVisible = false;
    $scope.btnEnabled = true;
    $scope.collecting = false;
    $scope.pathMessage = false;
    $scope.text = '';
    $scope.href = '';

    $scope.path = undefined;
    $scope.basename = undefined;

    var changeBtnText = function changeBtnText(name) {
      $translate([name]).then(translations => {
        $scope.text = translations[name];
      });
    };

    var fileIsOk = function httpGet(theUrl, callback) {
      fetch(theUrl, { method: 'HEAD' }).then(function (response) {
        callback(response.headers.get('Content-Type'));
      });
    };

    var callbackFileIsOk = function callbackFileIsOk(contentType) {
      $scope.collecting = false;
      if (contentType == 'application/zip') {
        $scope.btnEnabled = true;
        changeBtnText('collector.buttons.download');
        $scope.href = 'diag/' + $scope.basename;
      } else {
        $scope.btnVisible = false;
        $scope.pathMessage = true;
      }
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
          return '-1';
        } else {
          return DiagnosticProxy.status();
        }
      })
      .then(function (payload) {
        if (payload != '1') {
          changeBtnText('collector.errors.unavailable');
          $scope.btnEnabled = false;
        } else {
          changeBtnText('collector.buttons.collect');
          $scope.started = true;
        }
        $scope.btnVisible = true;
      })
      .catch(errors.catch('Error while checking availableness of service'));

    mqttClient.addStickySubscription('/wb-diag-collect/artifact', function (msg) {
      if ($scope.collecting && msg.payload) {
        const data = JSON.parse(msg.payload);
        $scope.path = data['fullname'];
        $scope.basename = data['basename'];
        const url = getUrl();
        fileIsOk(`${location.protocol}//${url}/diag/${$scope.basename}`, callbackFileIsOk);
      }
    });

    var diag = function () {
      $scope.btnEnabled = false;
      changeBtnText('collector.states.collecting');
      DiagnosticProxy.diag().then(
        () => {
          $scope.collecting = true;
        },
        () => {
          $scope.collecting = false;
          changeBtnText('collector.errors.checkLogs');
        }
      );
    };
    $scope.btnMethod = diag;
  }
}

export default DiagnosticCtrl;
