'use strict';

/**
 * @ngdoc function
 * @name homeuiApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the homeuiApp
 */
angular.module('homeuiApp')
  .controller('AboutCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
  });
