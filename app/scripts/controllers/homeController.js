'use strict';

angular.module('homeuiApp')
  .controller('HomeCtrl', ['$scope', 'CommonСode', function ($scope, CommonСode){
    $scope.data = CommonСode.data;
  }]);
