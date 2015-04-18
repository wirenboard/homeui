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
  .directive("transformRgb", function(){
    return{
      restrict: 'A',
      require: "ngModel",
      link: function (scope, element, attrs, ngModel) {
        ngModel.$formatters.push(function(value) {
          var r = "rgb(" + value.replace(/;/g, ", ") + ")";
          console.log("formatting: %s -> %s", value, r);
          return r;
        });
        ngModel.$parsers.push(function(value) {
          var r = value.replace(/^rgb\s*\(\s*|\s*\)\s*$/g, "").replace(/\s*,\s*/g, ";");
          console.log("parsing: %s -> %s", value, r);
          return r;
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
