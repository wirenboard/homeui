"use strict";

angular.module("homeuiApp")
  .controller("RoomCtrl", function ($scope, uiConfig, $routeParams) {
    var defaultRoom = {};
    function getRoom () {
      return ($routeParams.id && uiConfig.data.rooms.find(room => room.id == $routeParams.id)) || defaultRoom;
    }

    $scope.$watch(getRoom, newRoom => {
      $scope.room = newRoom;
      if (!$scope.room.hasOwnProperty("name"))
        $scope.room.name = "";
      if (!$scope.room.hasOwnProperty("widgets"))
        $scope.room.widgets = [];
    });

    $scope.addWidget = () => {
      $scope.room.widgets.push({
        name: "",
        compact: true,
        cells: [],
        new: true
      });
    };
  });
