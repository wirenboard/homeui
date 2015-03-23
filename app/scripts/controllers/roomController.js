'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', '$routeParams', '$rootScope', 'CommonСode', function($scope, $routeParams, $rootScope, CommonСode){
    $scope.data = CommonСode.data;
    $scope.rooms = $scope.data.rooms;
    $scope.all_widgets = $scope.data.widgets;
    $scope.action = 'New';
    $scope.created = $routeParams.created;
    $scope.widgets = {};

    if($routeParams.id){
      $scope.action = 'Edit';
      $scope.roomID = $routeParams.id;
      $scope.$watch('rooms.' + $scope.roomID, function(){
        $scope.room = $scope.rooms[$routeParams.id];
        if($scope.room){
          $scope.$watch('room.widgets.length', function(){
            $scope.room.widgets.forEach(function(widget_uid) {
              if ($scope.all_widgets.hasOwnProperty(widget_uid)) {
                $scope.widgets[widget_uid] = $scope.all_widgets[widget_uid];
              };
            });
          });
        };
      });
    };

    $scope.hoverIn = function(widget){
      widget.canEdit = true;
    };

    $scope.hoverOut = function(widget){
      widget.canEdit = false;
    };

    $scope.addOrUpdateRoom = function(){
      console.log('Start creating...');
      var room = {};

      room.uid = $scope.room.uid || ('room' + ($rootScope.objectsKeys($scope.rooms).length + 1));

      room.name = $scope.room.name;

      $scope.rooms[room.uid] = {uid: room.uid, name: room.name, widgets: $scope.room.widgets};

      var topic = '/config/rooms/' + room.uid;

      $scope.mqttSendCollection(topic, room, '/rooms');

      console.log('Successfully created!');
    };
  }]);