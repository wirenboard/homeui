'use strict';

angular.module('homeuiApp')
  .controller('NavigationCtrl', ['$scope', '$location', 'CommonCode', function($scope, $location, CommonCode){
    $scope.isActive = function(viewLocation){
      return viewLocation === $location.path();
    };
    $scope.data = CommonCode.data;
    $scope.rooms = $scope.data.rooms;
    $scope.dashboards = $scope.data.dashboards;
    $scope.widgets = $scope.data.widgets;
    $scope.widget_templates = $scope.data.widget_templates;
    $scope.isConnected = function () {
      return CommonCode.isConnected();
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
