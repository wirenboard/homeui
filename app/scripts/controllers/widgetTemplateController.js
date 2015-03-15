'use strict';

angular.module('homeuiApp')
  .controller('WidgetTemplateCtrl', ['$scope', 'HomeUIData', function($scope, HomeUIData){
    $scope.widgetTemplates = HomeUIData.list().widget_templates;

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);