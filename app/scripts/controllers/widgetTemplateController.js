'use strict';

angular.module('homeuiApp')
  .controller('WidgetTemplateCtrl', ['$scope', '$rootScope', 'mqttClient', 'HomeUIData', function($scope, $rootScope, mqttClient, HomeUIData){
    $scope.widgetTemplates = HomeUIData.list().widget_templates;
    $scope.widgetTemplate = { slots: {}, options:{} };

    $scope.addOrUpdateWidgetTemplate = function(){
      console.log('Start creating...');
      var topic = '/config/widget_templates/' + $scope.widgetTemplate.uid;

      $rootScope.mqttSendCollection(topic, $scope.widgetTemplate);

      $scope.widgetTemplate = {};
      console.log('Successfully created!');
    };

    $scope.addSlot = function (widgetTemplate) {
      var slotName = "slot" + $rootScope.objectsKeys(widgetTemplate.slots).length;
      widgetTemplate.slots[slotName] = { name:'', uid: slotName };
    };

    $scope.addOption = function (widgetTemplate) {
      var optionName = "option" + $rootScope.objectsKeys(widgetTemplate.options).length;
      widgetTemplate.options[optionName] = { name:'', uid: optionName };
    };

    $scope.search = function() {
      var widget_template = $scope.widgetTemplates[$scope.widgetTemplate.uid];
      if(widget_template) $scope.widgetTemplate = widget_template;
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