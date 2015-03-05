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
      return devices[query[2]].controls[query[4]];
    };
    return devicesService;
  });