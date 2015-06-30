'use strict';

angular.module('homeuiApp')
  .controller('NavigationCtrl', ['$scope', '$location', 'CommonCode', 'EditorProxy', 'mqttClient', 'whenMqttReady', function($scope, $location, CommonCode, EditorProxy, mqttClient, whenMqttReady){
    $scope.isActive = function(viewLocation){
      return viewLocation === $location.path();
    };
    $scope.data = CommonCode.data;
    $scope.rooms = $scope.data.rooms;
    $scope.dashboards = $scope.data.dashboards;
    $scope.widgets = $scope.data.widgets;
    $scope.widget_templates = $scope.data.widget_templates;
    $scope.isConnected = function () {
      return mqttClient.isConnected();
    };

    var scripts = [], needToLoadFiles = false;

    whenMqttReady().then(function () {
      needToLoadFiles = true;
      mqttClient.subscribe("/wbrules/updates/+", function () {
        needToLoadFiles = true;
      });
    });

    $scope.getScripts = function () {
      if (needToLoadFiles) {
        needToLoadFiles = false;
        EditorProxy.List().then(function (result) {
          scripts = result;
        }, function (err) {
          console.error("error listing scripts: %s", err.message);
        });
      }
      return scripts;
    };
  }])
  .directive('roomMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/rooms/menu-item.html'
    };
  })
  .directive('dashboardMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/dashboards/menu-item.html'
    };
  })
  .directive('widgetMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/menu-item.html'
    };
  })
  .directive('widgetTemplateMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/template-menu-item.html'
    };
  });
