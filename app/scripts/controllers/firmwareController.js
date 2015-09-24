'use strict';

angular.module('homeuiApp')
  .controller('FirmwareCtrl', function ($scope, $timeout, Upload, mqttClient, whenMqttReady) {
  $scope.busy = false;
  $scope.done = false;
  $scope.showState = false;

  var showInfo = function(msg) {
    $scope.stateMsg = msg;
    $scope.stateType = 'info';
  }

  var showError = function(msg) {
    $scope.stateMsg = msg;
    $scope.stateType = 'danger';
  }

  $scope.upload = function(file) {
    $scope.f = file;
    $scope.busy = true;
    $scope.showState = false;
    if (file && !file.$error) {
      showInfo('Uploading firmware file')
      file.upload = Upload.upload({
        url: '/fwupdate/upload',
        file: file
      }).progress(function (evt) {
        $scope.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
      })
      .success(function (data, status, headers, config) {
        $scope.progress = 0;
        showInfo('Upload complete')
        $scope.showState = true;
        $scope.log = '';
        whenMqttReady().then(function() {
          mqttClient.subscribe('/firmware/log', function(msg) {
            $scope.log = $scope.log + "\n" + msg.payload;
          })
          mqttClient.subscribe('/firmware/progress', function(msg) {
            $scope.progress = parseInt(msg.payload);
            if ($scope.progress == 100) {
                $scope.progress = 0;
            }
          })
          mqttClient.subscribe('/firmware/status', function(msg) {
            var p = msg.payload.indexOf(' ');
            var type = (p < 0) ? msg.payload : msg.payload.substr(0, p);
            var payload = (p < 0) ? msg.payload : msg.payload.substr(p+1, msg.payload.length);

            if (type == 'DONE') {
                $scope.busy = true;
                $scope.done = true;
            } else {
              if (type == 'OK') {
                showInfo(payload);
              } else if (type == 'ERROR') {
                showError(payload);
              }
            }
          })
        })
      })
      .error(function (data, status, headers, config) {
        $scope.progress = 0;
        showError(status + ': ' + data)
      })

    }
  }
});
