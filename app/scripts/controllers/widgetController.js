'use strict';

angular.module('homeuiApp')
  .controller('WidgetCtrl', ['$scope', '$rootScope', '$routeParams', 'CommonCode', function($scope, $rootScope, $routeParams, CommonCode){
    $scope.data = CommonCode.data;

    $scope.widgets = $scope.data.widgets;
    $scope.rooms = $scope.data.rooms;
    $scope.controls = $scope.data.controls;
    $scope.widgetTemplates = $scope.data.widget_templates;
    $scope.widget = { controls: {}, options: {} };
    $scope.action = 'New';

    if($routeParams.id){
      $scope.action = 'Edit';
      $scope.widgetID = $routeParams.id;
      $scope.$watch('widgets.' + $scope.widgetID, function(){
        $scope.widget = $scope.widgets[$scope.widgetID];
        if($scope.widget){
          $scope.$watch('widget.room', function(){
            $scope.$watch('rooms.' + $scope.widget.room, function(){
              $scope.room = $scope.rooms[$scope.widget.room];
            });
          });
          $scope.$watch('widget.template', function(){
            $scope.$watch('widgetTemplates.' + $scope.widget.template, function(){
              $scope.template = $scope.widgetTemplates[$scope.widget.template];
            });
          });
          delete $scope.widget['canEdit'];
        };
      });
    };

    $scope.deleteWidget = CommonCode.deleteWidget;


    $scope.hoverIn = function(widget){
      widget.canEdit = true;
    };

    $scope.hoverOut = function(widget){
      widget.canEdit = false;
    };

    $scope.addOrUpdateWidget = function(){
      console.log('Start creating...');

      $scope.widget.room = $scope.room.uid;
      $scope.widget.template = $scope.template.uid;

      if (!$scope.widget.uid) {
			var max_uid_index = 0;
			for (var key in $scope.widgets) {
				var  uid_index = parseInt(key.slice("widget".length));
				if (uid_index > max_uid_index) {
					max_uid_index = uid_index;
				}
			}

		  $scope.widget.uid = "widget" + (max_uid_index + 1);
	  }



      var topic = '/config/widgets/' + $scope.widget.uid;


      $scope.mqtt_widget = angular.copy($scope.widget);

      for(var c in $scope.mqtt_widget.controls){
        var control = $scope.mqtt_widget.controls[c];
        $scope.mqtt_widget.controls[control.uid] = { uid: control.uid, topic: control.topic.topic };
      };

      $scope.mqttSendCollection(topic, $scope.mqtt_widget, $rootScope.refererLocation);

      console.log('Successfully created!');
    };

    $scope.renderFieldsForTemplate = function(){
      $scope.widget.controls = {};
      $scope.widget.options = {};
      if($scope.template){
        for(var slot in $scope.template.slots){
          $scope.widget.controls[slot] = { uid: slot };
        };
        for(var option in $scope.template.options){
          $scope.widget.options[option] = { uid: option };
        };
      };
    };
  }])
  .directive('widget', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/widgets/show.html'
    };
  })
  .directive('widgetTemplate', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/widgets/templates/template.html'
    };
  })
  .directive('widgetDimmableLight', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-dimmable-light.html'
    };
  })
  .directive('widgetLight', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-light.html'
    };
  })
  .directive('widgetRgb', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-rgb.html'
    };
  })
  .directive('widgetSensor', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-sensor.html'
    };
  })
  .directive('widgetControlValue', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/control-value.html'
    };
  })
  .directive('widgetOpenClosedSensor', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-open-closed-sensor.html'
    };
  })
  .directive('widgetTemperature', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-temperature.html'
    };
  })
  .directive('widgetHumidity', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-humidity.html'
    };
  })
  .directive('widgetIlluminance', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-illuminance.html'
    };
  })
  .directive('widgetAirQuality', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-air-quality.html'
    };
  })
  .directive('widgetLeakage', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-leakage.html'
    };
  })
  .directive('widgetMotion', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-motion.html'
    };
  })
  .directive('widgetBinarySensor', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-binary-sensor.html'
    };
  })
  .directive('widgetAlarm', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-alarm.html'
    };
  })
  .directive('widgetFan', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/templates/widget-fan.html'
    };
  });
