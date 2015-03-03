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

    $scope.change = function(control) {
      console.log(control);
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    var wookmarkOptions = {
      autoResize: true,
      container: $('#devices-list'),
      offset: 10
    };

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

      $scope.$apply(function (){
        $("#devices-list ul li").wookmark(wookmarkOptions);
      });
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
          if(message.payloadBytes[0] === 48 || message.payloadBytes[0] === 49){
            control.value = parseInt(String.fromCharCode.apply(null, message.payloadBytes));
          }else
            control.value = String.fromCharCode.apply(null, message.payloadBytes);
          control.topic = message.destinationName;
      }
    }
  }])
  .directive('deviceName', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/device-name.html'
    };
  })
  .directive('deviceControl', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/devices/device-control.html'
    };
  })
  .directive('controlRange', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-range.html'
    };
  })
  .directive('controlPushbutton', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-button.html'
    };
  })
  .directive('controlSwitch', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-switch.html'
    };
  })
  .directive('controlTextbox', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-textbox.html'
    };
  });