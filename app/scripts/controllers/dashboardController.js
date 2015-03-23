'use strict';

angular.module('homeuiApp')
  .controller('DashboardCtrl', ['$scope', '$rootScope', '$routeParams', 'CommonСode', function($scope, $rootScope, $routeParams, CommonСode){
    $scope.data = CommonСode.data;
    $scope.dashboards = $scope.data.dashboards;
    $scope.widgets = $scope.data.widgets;
    $scope.dashboard = { widgets: {} };
    $scope.action = 'New';

    if($routeParams.id){
      $scope.action = 'Edit';
      $scope.dashboardID = $routeParams.id;
      $scope.$watch('dashboards.' + $scope.dashboardID, function(){
        $scope.dashboard = $scope.dashboards[$scope.dashboardID];
      });
    };

    $scope.hoverIn = function(dashboard){
      dashboard.canEdit = true;
    };

    $scope.hoverOut = function(dashboard){
      dashboard.canEdit = false;
    };

    $scope.addWidget = function (dashboard) {
      var widgetName = "widget" + $rootScope.objectsKeys(dashboard.widgets).length;
      dashboard.widgets[widgetName] = { name:'', uid: widgetName };
    };

    $scope.addOrUpdateDashboard = function(){
      console.log('Start creating...');

      delete $scope.dashboard['canEdit'];

      $scope.dashboard.uid = $scope.dashboard.uid || ('dashboard' + ($rootScope.objectsKeys($scope.dashboards).length + 1));

      var topic = '/config/dashboards/' + $scope.dashboard.uid;

      var dashboard = $scope.dashboard;
      for(var w in dashboard.widgets){
        var widget = dashboard.widgets[w];
        dashboard.widgets[w] = { uid: widget.uid.uid };
      };

      $scope.mqttSendCollection(topic, dashboard, $rootScope.refererLocation);

      console.log('Successfully created!');
    };
  }])
  .directive('dashboard-widget', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/dashboards/widgets/show.html'
    };
  });