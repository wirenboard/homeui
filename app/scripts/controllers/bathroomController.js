'use strict';

angular.module('homeuiApp')
  .controller('bathroomCtrl', ['$scope', '$rootScope', 'HomeUIData', function($scope, $rootScope, HomeUIData){
    $scope.widgets = HomeUIData.list().rooms['bathroom'].widgets;

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);