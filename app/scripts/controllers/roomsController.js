"use strict";

angular.module("homeuiApp")
  .controller("RoomsCtrl", function ($scope, uiConfig) {
    var savedRooms;
    $scope.data = uiConfig.data;

    $scope.addRoom = function () {
      var roomIds = {};
      $scope.data.rooms.forEach(room => {
        roomIds[room.id] = true;
      });
      var n = 1;
      while (roomIds.hasOwnProperty("room" + n))
        n++;
      $scope.data.rooms.push({ name: "", id: "room" + n });
    };

    $scope.deleteRoom = function (room) {
      var index = $scope.data.rooms.indexOf(room);
      if (index >= 0)
        $scope.data.rooms.splice(index, 1);
    };

    $scope.checkNonEmpty = function (value, msg) {
      if (!/\S/.test(value))
        return msg;
      return true;
    };

    $scope.checkId = function (value, room) {
      var r = this.checkNonEmpty(value, "Empty room id is not allowed");
      if (r !== true)
        return r;
      value = value.replace(/^\s+|\s+$/g, "");
      return $scope.data.rooms.some(function (otherRoom) {
        return otherRoom !== room && otherRoom.id == value;
      }) ? "Duplicate room ids are not allowed" : true;
    };

    $scope.cancel = function () {
      $scope.data.rooms = savedRooms;
    };

    $scope.show = function () {
      savedRooms = angular.copy($scope.data.rooms);
    };
  });
