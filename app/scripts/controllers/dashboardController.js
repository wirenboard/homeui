'use strict';

angular.module('homeuiApp')
  .controller('DashboardCtrl', ['$scope', '$rootScope', '$routeParams', 'CommonCode', function($scope, $rootScope, $routeParams, CommonCode){
    $scope.data = CommonCode.data;
    $scope.dashboards = $scope.data.dashboards;
    $scope.widgets = $scope.data.widgets;
    $scope.devices = $scope.data.devices;
    $scope.dashboard = { widgets: {} , type: 'widgets'};
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
      dashboard.widgets[widgetName] = {};//{ name:'', uid: widgetName };
    };


    $scope.dashboardDeleteWidget = function (widget) {
        for(var w in $scope.dashboard.widgets){
			if ($scope.dashboard.widgets[w].uid == widget.uid) {
				console.log(widget);
				console.log(w);

	            delete $scope.dashboard.widgets[w];
	            $scope.mqttDeleteByPrefix( '/config/dashboards/' + $scope.dashboard.uid + '/widgets/' + w + '/');
			}
		}


	};
	$scope.deleteDashboard = function(dashboard) {
		console.log($scope.dashboards);
		console.log(dashboard);
        for(var key in $scope.dashboards){
			if ($scope.dashboards[key] == dashboard) {
				var uid = dashboard.uid;
				delete $scope.dashboards[key];
				$scope.mqttDeleteByPrefix( '/config/dashboards/' + uid + '/');

				if ($scope.data.defaults.dashboard == uid) {
					$scope.data.defaults.dashboard = '';
			        mqttClient.send('/config/default_dashboard/uid', '');
				}
			}
		}

	};


    $scope.addOrUpdateDashboard = function(){
      console.log('Start creating...');

      delete $scope.dashboard['canEdit'];


      if (!$scope.dashboard.uid) {
			var max_uid_index = 0;
			for (var key in $scope.dashboards) {
				var  uid_index = parseInt(key.slice("dashboard".length));
				if (uid_index > max_uid_index) {
					max_uid_index = uid_index;
				}
			}

		  $scope.dashboard.uid = "dashboard" + (max_uid_index + 1);
      }


      var topic = '/config/dashboards/' + $scope.dashboard.uid;

      var dashboard = $scope.dashboard;

      for(var w in dashboard.widgets){
        var widget = dashboard.widgets[w];
        if (widget == null) {
            delete dashboard.widgets[w];
            $scope.mqttDeleteByPrefix( topic + '/widgets/' + w + '/');
        } else {
            dashboard.widgets[w] = widget;
        };
      }



	  //~ debugger;
      $scope.mqttSendCollection(topic, dashboard, $rootScope.refererLocation);

      console.log('Successfully created!');
    };
  }])
  .directive('dashboardWidgetTemplate', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/dashboards/widget-template.html'
    };
  })
  .directive('dashboardTemplate', function(){
    return{
      restrict: 'E',
      scope: {
        dashboard: "=",
        devices: "=",
      },
      templateUrl: 'views/dashboards/dashboard-template.html'
    };
  });

