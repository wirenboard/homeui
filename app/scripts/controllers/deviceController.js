'use strict';

/**
 * @ngdoc function
 * @name homeuiApp.controller:HomeuiCtrl
 * @description
 * # HomeuiCtrl
 * Controller of the homeuiApp
 */
angular.module('homeuiApp')
  .controller('DeviceCtrl', ['$scope', '$location', '$rootScope', '$interval', 'mqttClient', function($scope, $location, $rootScope, $interval, mqttClient) {
    $scope.devices = {};

    $scope.change = function(device) { console.log('Track change!') };

    mqttClient.onMessage(function(message) {
      var pathItems = message.destinationName.split('/');
      if(pathItems[1] != "devices") {
        console.log("Message not about device, ignoring");
        return null;
      }

      var deviceName = pathItems[2];
      var device;

      if($scope.devices[deviceName] != null){
        // We already register the device, change it
        device = $scope.devices[deviceName];
      }else {
        device = {name: deviceName, meta: {}, controls: {}};
        $scope.devices[deviceName] = device;
      }

      parseMessage(device, pathItems, message);

      $scope.$apply(function (){ console.log('Track apply!') });
    });

    function parseMessage(device, pathItems, message) {
      switch(pathItems[3]) {
        case "meta":
          parseDeviceMeta(device, pathItems, message);
          break;
        case "controls":
          parseControls(device, pathItems, message);
      }
    }

    function parseDeviceMeta(device, pathItems, message) {
      var attributeName = pathItems[4], value = message.payloadString;

      switch(attributeName) {
        case "name":
          device.metaName = value;
          break;
        case "room":
          device.metaRoom = value;
          break;
        default:
          device.meta[attributeName] = value;
          break;
      }
    }

    function parseControlsMeta(control, pathItems, message) {
      var attributeName = pathItems[6], value = message.payloadString;
      switch(attributeName) {
        case "name":
          control.metaName = value;
          break;
        case "type":
          control.metaType = value;
          break;
        case "order":
          control.metaOrder = value;
          break;
        default:
          control.meta[attributeName] = value;
          break;
      }
    }

    function parseControls(device, pathItems, message) {
      var controlName = pathItems[4];
      var control;
      if(device.controls[controlName] == null) {
        // create new control
        control = device.controls[controlName] = {name: controlName, meta: {}, metaType: "NONE", value: 0};
      } else
        control = device.controls[controlName];

      switch(pathItems[5]) {
        case "meta":
          parseControlsMeta(control, pathItems, message);
          break;
        case undefined:
          control.value = message.payloadBytes[0];
      }
    }
  }]);