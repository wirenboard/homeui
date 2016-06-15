"use strict";

angular.module("homeuiApp")
  .controller("DashboardCtrl", function ($scope, uiConfig, $routeParams) {
    var defaultDashboard = {};
    function getDashboard () {
      return uiConfig.getDashboard($routeParams.id);
    }

    uiConfig.whenReady().then(() => {
      $scope.$watch(getDashboard, newDashboard => {
        $scope.dashboard = newDashboard;
      });

      $scope.addWidget = () => {
        $scope.dashboard.widgets.push(uiConfig.addWidget());
      };

      $scope.removeWidget = (widget) => {
        $scope.dashboard.removeWidgetFromDashboard(widget);
      };

      $scope.deleteWidget = (widget) => {
        uiConfig.deleteWidget(widget);
      };
    });
  });
