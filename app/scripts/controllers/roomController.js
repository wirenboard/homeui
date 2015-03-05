'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', '$rootScope', 'HomeUIRooms', '$timeout', 'mqttClient', function($scope, $rootScope, HomeUIRooms, $timeout, mqttClient){

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

    $scope.addOrUpdateRoom = function(){

      var room_index = $scope.rooms.map(function(e) {return e.uid; }).indexOf($scope.room.uid);

      if(room_index >= 0){
        $scope.rooms[room_index].name = $scope.room.name;
      }else{
        $scope.rooms.push($scope.room);
      }
      $scope.room = {};
    };

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