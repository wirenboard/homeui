'use strict';

angular.module('homeuiApp')
  .controller('WidgetCtrl', ['$scope', '$rootScope', 'HomeUIData', function($scope, $rootScope, HomeUIData){
    $scope.widgets = HomeUIData.list().widgets;
    $scope.rooms = HomeUIData.list().rooms;
    $scope.controls = HomeUIData.list().controls;
    $scope.widgetTemplates = HomeUIData.list().widget_templates;
    $scope.widget = { controls: {}, options: {} };

    $scope.addOrUpdateWidget = function(){
      console.log('Start creating...');
      var topic = '/config/widgets/' + $scope.widget.uid;
      var widget = $scope.widget;
      for(var c in widget.controls){
        var control = widget.controls[c];
        widget.controls[control.uid] = { uid: control.uid, topic: control.topic.topic };
      };
      widget.room = widget.room.uid;
      widget.template = widget.template.uid;

      $rootScope.mqttSendCollection(topic, widget);

      $scope.widget = {};
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

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);