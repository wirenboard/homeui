'use strict';

angular.module('homeuiApp')
  .controller('WidgetCtrl', ['$scope', '$rootScope', '$routeParams', '$location', 'HomeUIData', 'mqttClient', function($scope, $rootScope, $routeParams, $location, HomeUIData, mqttClient){
    $scope.widgets = HomeUIData.list().widgets;
    $scope.rooms = HomeUIData.list().rooms;
    $scope.controls = HomeUIData.list().controls;
    $scope.widgetTemplates = HomeUIData.list().widget_templates;
    $scope.widget = { controls: {}, options: {} };
    $scope.action = 'New';
    $scope.created = $routeParams.created;

    if($routeParams.id){
      $scope.action = 'Edit';
      $scope.widget = $scope.widgets[$routeParams.id]
    }

    $scope.hoverIn = function(widget){
      widget.canEdit = true;
    };

    $scope.hoverOut = function(widget){
      widget.canEdit = false;
    };

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    $scope.addOrUpdateWidget = function(){
      console.log('Start creating...');

      delete $scope.widget['canEdit'];

      $scope.widget.uid = $scope.widget.uid || ('widget' + ($rootScope.objectsKeys($scope.widgets).length + 1));

      var topic = '/config/widgets/' + $scope.widget.uid;

      var widget = $scope.widget;
      for(var c in widget.controls){
        var control = widget.controls[c];
        widget.controls[control.uid] = { uid: control.uid, topic: control.topic.topic };
      };
      widget.room = widget.room.uid;
      widget.template = widget.template.uid;

      console.log(widget);

      $rootScope.mqttSendCollection(topic, widget);

      $scope.submit();

      console.log('Successfully created!');
    };

    $scope.renderFieldsForTemplate = function(){
      $scope.widget.controls = {};
      $scope.widget.options = {};
      if($scope.widget.template){
        for(var slot in $scope.widget.template.slots){
          $scope.widget.controls[slot] = { uid: slot };
        };
        for(var option in $scope.widget.template.options){
          $scope.widget.options[option] = { uid: option };
        };
      };
    };

    $scope.search = function() {
      var widget = $scope.widgets[$scope.widget.uid];
      if(widget) $scope.widget = widget;
    };

    $scope.submit = function() {
      $location.path('/widgets').search({created: true});;
    }

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }])
  .directive('widget', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/widgets/show.html'
    };
  })
  .directive('widgetControl', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/widgets/controls/control.html'
    };
  })
  .directive('widgetControlRange', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/controls/control-range.html'
    };
  })
  .directive('widgetControlPushbutton', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/controls/control-button.html'
    };
  })
  .directive('widgetControlSwitch', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/controls/control-switch.html'
    };
  })
  .directive('widgetControlTextbox', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/controls/control-textbox.html'
    };
  });