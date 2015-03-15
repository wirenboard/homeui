'use strict';

angular.module('homeuiApp')
  .controller('NavigationCtrl', ['$scope', '$location', 'HomeUIData', function($scope, $location, HomeUIData){
    $scope.isActive = function(viewLocation){
      return viewLocation === $location.path();
    }
    $scope.rooms = HomeUIData.list().rooms;
  }])
  .directive('roomMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/rooms/menu-item.html'
    };
  });