'use strict';

angular.module('homeuiApp')
  .controller('HomeCtrl', ['$scope', 'CommonCode', function ($scope, CommonCode){
    $scope.data = CommonCode.data;
  }]);
