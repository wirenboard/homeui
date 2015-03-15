'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', 'HomeUIData', '$routeParams', function($scope, HomeUIData, $routeParams){
    $scope.room_name = HomeUIData.list().rooms[$routeParams.id].name;
    $scope.widgets = HomeUIData.list().rooms[$routeParams.id].widgets;

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);