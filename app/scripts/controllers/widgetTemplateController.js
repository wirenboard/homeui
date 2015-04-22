'use strict';

angular.module('homeuiApp')
  .controller('WidgetTemplateCtrl', ['$scope', 'CommonCode', function($scope, CommonCode){
    $scope.data = CommonCode.data;
    $scope.widgetTemplates = $scope.data.widget_templates;
  }]);
