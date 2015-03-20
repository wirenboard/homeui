'use strict';

angular.module('homeuiApp')
  .controller('WidgetTemplateCtrl', ['$scope', 'CommonСode', function($scope, CommonСode){
    $scope.data = CommonСode.data;
    $scope.widgetTemplates = $scope.data.widget_templates;

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);