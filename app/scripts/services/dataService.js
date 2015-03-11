'use strict';

angular.module('homeuiApp.dataServiceModule', [])
  .factory('HomeUIControls', function() {
    var controls = {};
    var controlsService = {};

    controlsService.add = function(controlName, control) {
      controls[controlName] = control;
    };
    controlsService.list = function() {
      return controls;
    };
    controlsService.to_a = function() {
      var controls_array = $.map(controls, function(value, index) {
          return [value];
      });
      return controls_array;
    };

    return controlsService;
  })
  .factory('HomeUIRooms', function() {
    var rooms = {};
    var roomsService = {};

    roomsService.add = function(uid, room) {
      rooms[uid] = room;
    };
    roomsService.list = function() {
      return rooms;
    };
    roomsService.addWidget = function(uid, widget) {
      rooms[uid].widgets[widget.uid] = widget;
    }
    roomsService.to_a = function() {
      var roomsArray = $.map(rooms, function(value, index) {
          return [value];
      });
      return roomsArray;
    };

    return roomsService;
  })
  .factory('HomeUIWidgets', function() {
    var widgets = {};
    var widgetsService = {};

    widgetsService.add = function(uid, widget) {
      widgets[uid] = widget;
    };
    widgetsService.list = function() {
      return widgets;
    };
    widgetsService.to_a = function() {
      var widgets_array = $.map(widgets, function(value, index) {
          return [value];
      });
      return widgets_array;
    };

    return widgetsService;
  })
  .factory('HomeUIDevices', function(){
    var devices = {};
    var devicesService = {};

    devicesService.add = function(uid, device) {
      devices[uid] = device;
    };
    devicesService.list = function() {
      return devices;
    };
    devicesService.find = function(query) {
      query = query.split('/');
      return devices[query[3]].controls[query[5]];
    };
    return devicesService;
  });