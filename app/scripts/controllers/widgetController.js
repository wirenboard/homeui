'use strict';

angular.module('homeuiApp')
  .controller('WidgetCtrl', ['$scope', '$rootScope', '$timeout', 'HomeUIWidgets', 'HomeUIControls', 'mqttClient', function($scope, $rootScope, $timeout, HomeUIWidgets, HomeUIControls, mqttClient){
    $scope.widget = {controls: {}};

    $scope.change = function(control) {
      console.log('Widget changed');
    };

    $scope.widgets = HomeUIWidgets.list();
    $scope.widgetsArray = HomeUIWidgets.to_a();
    $scope.controls = HomeUIControls.to_a();
    $scope.selectedControl = null;
    $scope.selectedWidget = null;

    $scope.addOrUpdateWidget = function(){
      HomeUIWidgets.add($scope.widget.uid, $scope.widget);
      mqttClient.send('/user/config/widgets/' + $scope.widget.uid + '/name', $scope.widget.name);
      mqttClient.send('/user/config/widgets/' + $scope.widget.uid + '/type', $scope.widget.type);
      $scope.widget = {};
    };

    $scope.addControlToWidget = function(){
      mqttClient.send('/user/config/widgets/' + $scope.selectedWidget.uid + '/controls/slot0', $scope.selectedControl.topic);
      $scope.selectedWidget.controls['slot0'] = $scope.selectedControl.topic;
      var widget = $scope.widgets[$scope.selectedWidget.uid];
      widget.controls[$scope.selectedControl.uid] = $scope.selectedControl;
    };

    mqttClient.onMessage(function(message) {
      console.log('Hello from Widget!');
      $scope.$apply(function (){
        initWookmark();
      });
    });

    function initWookmark(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('#widgets-list'),
        offset: 10
      };

      $("#widgets-list ul li").wookmark(wookmarkOptions);
    };

    $timeout(initWookmark, 0);
  }]);