'use strict';

angular.module('homeuiApp')
  .controller('DeviceCtrl', ['$scope', 'CommonСode', function($scope, CommonСode) {

    $scope.data = CommonСode.data;
    $scope.devices = $scope.data.devices;

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
  })
  .directive('controlValue', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-value.html'
    };
  })
  ;
