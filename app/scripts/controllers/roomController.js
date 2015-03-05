'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', '$rootScope', 'HomeUIRooms', 'HomeUIWidgets', '$timeout', 'mqttClient', function($scope, $rootScope, HomeUIRooms, HomeUIWidgets, $timeout, mqttClient){

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    $scope.room = {};

    $scope.rooms = HomeUIRooms.list();
    $scope.roomsArray = HomeUIRooms.to_a();
    $scope.widgets = HomeUIWidgets.to_a();
    $scope.selectedWidget = null;
    $scope.selectedRoom = null;

    $scope.addOrUpdateRoom = function(){
      $scope.rooms[$scope.room.uid] = $scope.room;
      mqttClient.send('/user/config/rooms/' + $scope.room.uid + '/name', $scope.room.name);
      $scope.room = {};
    };

    $scope.addWidgetToRoom = function(){
      mqttClient.send('/user/config/widgets/' + $scope.selectedWidget.uid + '/room', $scope.selectedRoom.uid);
      var oldRoom = $scope.rooms[$scope.selectedWidget.room];
      delete oldRoom.widgets[$scope.selectedWidget.uid];
      $scope.selectedWidget.room = $scope.selectedRoom.uid;
      var room = $scope.rooms[$scope.selectedRoom.uid];
      room.widgets[$scope.selectedWidget.uid] = $scope.selectedWidget;
    };

    mqttClient.onMessage(function(message) {
      $scope.$apply(function (){
        initWookmark();
      });
    });

    function initWookmark(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('#rooms-list'),
        offset: 10
      };

      $("#rooms-list ul li").wookmark(wookmarkOptions);
    };

    $timeout(initWookmark, 0);
  }])
  .directive('roomWidget', function(){
    return{
      restrict: 'E',
      templateUrl: 'views/widgets/rooms/widget.html'
    };
  });