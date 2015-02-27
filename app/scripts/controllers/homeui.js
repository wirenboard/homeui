'use strict';

/**
 * @ngdoc function
 * @name homeuiApp.controller:HomeuiCtrl
 * @description
 * # HomeuiCtrl
 * Controller of the homeuiApp
 */
angular.module('homeuiApp')
  .controller('HomeuiCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
