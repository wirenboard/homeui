'use strict';

angular.module('homeuiApp')
  .controller('RoomCtrl', ['$scope', 'HomeUIData', '$routeParams', 'mqttClient', function($scope, HomeUIData, $routeParams, mqttClient){
    $scope.room_name = HomeUIData.list().rooms[$routeParams.id].name;
    $scope.widgets = HomeUIData.list().rooms[$routeParams.id].widgets;

    $scope.change = function(control) {
      console.log('changed: ' + control.name + ' value: ' + control.value);
      var payload = control.value;
      if(control.metaType == 'switch' && (control.value === true || control.value === false)){
        payload = control.value ? '1' : '0';
      }
      mqttClient.send(control.topic, payload);
    };

    $scope.wookmarkIt = function(){
      var wookmarkOptions = {
        autoResize: true,
        container: $('.wookmark-list'),
        offset: 10
      };

      $(".wookmark-list ul li").wookmark(wookmarkOptions);
    };
  }]);