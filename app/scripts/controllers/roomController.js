'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', 'HomeUIData', '$routeParams', 'mqttClient', '$location', '$rootScope', function($scope, HomeUIData, $routeParams, mqttClient, $location, $rootScope){

    $scope.rooms = HomeUIData.list().rooms;
    $scope.action = 'New';
    $scope.created = $routeParams.created;

    if($routeParams.id){
      $scope.action = 'Edit';
      $scope.room = HomeUIData.list().rooms[$routeParams.id];
    }

    $scope.hoverIn = function(widget){
      widget.canEdit = true;
    };

    $scope.hoverOut = function(widget){
      widget.canEdit = false;
    };

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    $scope.addOrUpdateRoom = function($location){
      console.log('Start creating...');

      $scope.room.uid = $scope.room.uid || ('room' + ($rootScope.objectsKeys($scope.rooms).length + 1));

      var topic = '/config/rooms/' + $scope.room.uid;

      $rootScope.mqttSendCollection(topic, $scope.room);

      $scope.submit();

      console.log('Successfully created!');
    };

    $scope.submit = function() {
      $location.path('/rooms').search({created: true});;
    }

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);