'use strict';

angular.module('homeuiApp')
  .controller('DeviceCtrl', ['$scope', '$location', '$rootScope', '$interval', 'mqttClient', 'HomeUIDevices', 'HomeUIControls', 'HomeUIRooms', 'HomeUIWidgets', function($scope, $location, $rootScope, $interval, mqttClient, HomeUIDevices, HomeUIControls, HomeUIRooms, HomeUIWidgets) {

    $scope.devices = HomeUIDevices.list();

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    var wookmarkOptions = {
      autoResize: true,
      container: $('.wookmark-list'),
      offset: 10
    };

    mqttClient.onMessage(function(message) {
      var pathItems = message.destinationName.split('/');

      parseMsg(pathItems, message);

      $scope.$apply(function (){
        $(".wookmark-list ul li").wookmark(wookmarkOptions);
      });
    });

    function parseMsg(pathItems, message){
      switch(pathItems[2]) {
        case "devices":
          parseDeviceMsg(pathItems, message);
          break;
        case "config":
          parseConfigMsg(pathItems, message);
          break;
        default:
          console.log("ERROR: Unknown message");
          return null;
          break;
      }
    };

    function parseDeviceMsg(pathItems, message){
      var device = {};
      findOrInitDevice(device, pathItems, message);
    };

    function findOrInitDevice(device, pathItems, message){
      var deviceName = pathItems[3];
      if($scope.devices[deviceName] != null){ // We already register the device, change it
        device = $scope.devices[deviceName];
      }else {
        device = {name: deviceName, controls: {}};
        HomeUIDevices.add(deviceName, device);
      }
      parseDeviceInfo(device, pathItems, message);
    }

    function parseDeviceInfo(device, pathItems, message){
      switch(pathItems[4]) {
        case "meta":
          parseMeta(device, pathItems[5], message);
          break;
        case "controls":
          parseControls(device, pathItems, message);
          break;
      }
    }

    function parseMeta(obj, attrName, message){
      obj['meta' + capitalizeFirstLetter(attrName)] = message.payloadString;
    };

    function parseControls(device, pathItems, message){
      var controlName = pathItems[5];
      var control = {};
      if(device.controls[controlName] != null) {
        control = device.controls[controlName];
      } else {
        control = device.controls[controlName] = {name: controlName, value: 0};
      }

      switch(pathItems[6]) {
        case "meta":
          parseMeta(control, pathItems[7], message);
          break;
        case undefined:
          if(message.payloadBytes[0] === 48 || message.payloadBytes[0] === 49){
            control.value = parseInt(String.fromCharCode.apply(null, message.payloadBytes));
          }else
            control.value = String.fromCharCode.apply(null, message.payloadBytes);
          control.topic = message.destinationName;
      }
      HomeUIControls.add(controlName, control);
    };

    function parseConfigMsg(pathItems, message){
      switch(pathItems[3]) {
        case "widgets":
          parseWidgetMsg(pathItems, message);
          break;
        case "rooms":
          parseRoomMsg(pathItems, message);
          break;
        default:
          console.log("ERROR: Unknown config message");
          return null;
          break;
      }
    };

    function parseWidgetMsg(pathItems, message){
      var widgetUID = pathItems[4];
      var widget = {controls: {}};
      var widgets = HomeUIWidgets.list();

      if(widgets[widgetUID] != null){
        widget = widgets[widgetUID];
      } else {
        widget['uid'] = widgetUID;
      }
      if(pathItems[5] === 'controls'){
        widget.controls[pathItems[6]] = HomeUIDevices.find(message.payloadString);
      }else{
        widget[pathItems[5]] = message.payloadString;
      }
      HomeUIWidgets.add(widgetUID, widget);
      if(widget.room){
        HomeUIRooms.addWidget(widget.room, widget);
      };
    };

    function parseRoomMsg(pathItems, message){
      var room = { uid: pathItems[4], name: message.payloadString, widgets: {} };
      HomeUIRooms.add(room.uid, room);
    };

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

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