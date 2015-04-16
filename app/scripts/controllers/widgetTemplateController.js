'use strict';

angular.module('homeuiApp')
  .controller('WidgetTemplateCtrl', ['$scope', 'CommonСode', function($scope, CommonСode){
    $scope.data = CommonСode.data;
    $scope.widgetTemplates = $scope.data.widget_templates;
  }]);
