'use strict';

angular.module('homeuiApp')
  .controller('DashboardCtrl', ['$scope', '$rootScope', '$routeParams', 'HomeUIData', 'mqttClient', function($scope, $rootScope, $routeParams, HomeUIData, mqttClient){
    $scope.dashboards = HomeUIData.list().dashboards;
    $scope.widgets = HomeUIData.list().widgets;
    $scope.dashboard = $scope.dashboards[$routeParams.id] || { widgets: {} };

    $scope.hoverIn = function(dashboard){
      dashboard.canEdit = true;
    };

    $scope.hoverOut = function(dashboard){
      dashboard.canEdit = false;
    };

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    $scope.addWidget = function (dashboard) {
      var widgetName = "widget" + $rootScope.objectsKeys(dashboard.widgets).length;
      dashboard.widgets[widgetName] = { name:'', uid: widgetName };
    };

    $scope.addOrUpdateDashboard = function(){
      console.log('Start creating...');
      var topic = '/config/dashboards/' + $scope.dashboard.uid;
      var dashboard = $scope.dashboard;
      for(var w in dashboard.widgets){
        var widget = dashboard.widgets[w];
        dashboard.widgets[w] = { uid: widget.uid.uid };
      };

      $rootScope.mqttSendCollection(topic, dashboard);

      $scope.dashboard = {};
      console.log('Successfully created!');
    };

    $scope.search = function() {
      var dashboard = $scope.dashboards[$scope.dashboard.uid];
      if(dashboard) $scope.dashboard = dashboard;
    };

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }])
  .directive('dashboard-widget', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/dashboards/widgets/show.html'
    };
  });