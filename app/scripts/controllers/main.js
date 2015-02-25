'use strict';

/**
 * @ngdoc function
 * @name homeuiApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the homeuiApp
 */
angular.module('homeuiApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
