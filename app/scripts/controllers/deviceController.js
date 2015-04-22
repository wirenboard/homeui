'use strict';

angular.module('homeuiApp')
  .controller('DeviceCtrl', ['$scope', 'CommonCode', function($scope, CommonCode) {

    $scope.data = CommonCode.data;
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
  .directive("transformRgb", function(){
    return{
      restrict: 'A',
      require: "ngModel",
      link: function (scope, element, attrs, ngModel) {
        ngModel.$formatters.push(function(value) {
          return "rgb(" + value.replace(/;/g, ", ") + ")";
        });
        ngModel.$parsers.push(function(value) {
          return value.replace(/^rgb\s*\(\s*|\s*\)\s*$/g, "").replace(/\s*,\s*/g, ";");
        });
      }
    };
  })
  .directive('controlRgb', function(){
    return{
      restrict: 'A',
      scope: "",
      templateUrl: 'views/devices/controls/control-rgb.html'
    };
  })
  .directive('controlValue', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/devices/controls/control-value.html'
    };
  })
  ;
