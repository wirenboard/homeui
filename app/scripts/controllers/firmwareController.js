'use strict';

angular.module('homeuiApp')
  .controller('FirmwareCtrl', function ($scope, $timeout, Upload, mqttClient, whenMqttReady) {
  $scope.busy = false;
  $scope.done = false;

  var log = $('#firmwareLog')

  var showState = function(type, msg) {
    if ($scope.progress == 0) {
      $scope.progress = 100;
    }
    $scope.stateType = type;
    $scope.stateMsg = msg;
  }

  $scope.upload = function(file) {
    $scope.f = file;
    $scope.busy = true;
    if (file && !file.$error) {
      showState('info', 'Uploading firmware file');
      $scope.log = '';
      file.upload = Upload.upload({
        url: '/fwupdate/upload',
        file: file
      }).progress(function (evt) {
        $scope.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
      })
      .success(function (data, status, headers, config) {
        $scope.progress = 0;
        showState('info', 'Upload complete')
        whenMqttReady().then(function() {
          mqttClient.subscribe('/firmware/log', function(msg) {
            log.append($scope.log + "\n" + msg.payload);
            if (log.length) {
              log.scrollTop(log[0].scrollHeight - log.height());
            }
          })
          mqttClient.subscribe('/firmware/progress', function(msg) {
            $scope.progress = parseInt(msg.payload);
          })
          mqttClient.subscribe('/firmware/status', function(msg) {
            var p = msg.payload.indexOf(' ');
            var type = (p < 0) ? msg.payload : msg.payload.substr(0, p);
            var payload = (p < 0) ? msg.payload : msg.payload.substr(p+1, msg.payload.length);

            if (type == 'DONE') {
                showState('success', 'All done');
                $scope.busy = true;
                $scope.done = true;
            } else if (type == 'REBOOT') {
                showState('warning', 'Rebooting, please wait');
            } else if (type == 'OK') {
                showState('info', payload);
            } else if (type == 'ERROR') {
                showError('danger', payload);
            }
          })
        })
      })
      .error(function (data, status, headers, config) {
        $scope.progress = 0;
        showState('error', status + ': ' + data)
      })

    }
  }
});
