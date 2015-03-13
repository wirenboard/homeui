'use strict';

angular.module('homeuiApp.dataServiceModule', [])
  .factory('HomeUIData', function() {
    var data = { devices:{}, controls:{}, widgets:{}, widget_templates:{}, rooms:{} };
    var dataService = {};

    dataService.parseMsg = function(message) {
      var pathItems = message.destinationName.split('/');

      parseMsg(pathItems, message);

      // console.log('======================');
      // console.log(data);
      // console.log('======================');
    };

    dataService.list = function() {
      return data;
    };

    dataService.addDevice = function(uid, device) {
      data.devices[uid] = device;
    };

    function parseMsg(pathItems, message){
      switch(pathItems[1]) {
        case "devices":
          parseDeviceMsg(pathItems, message);
          break;
        case "config":
          parseConfigMsg(pathItems, message);
          break;
        default:
          console.log("ERROR: Unknown message");
          return null;
          break;
      }
    };

    function parseDeviceMsg(pathItems, message){
      var device = {};
      var deviceName = pathItems[2];
      if(data.devices[deviceName] != null){ // We already register the device, change it
        device = data.devices[deviceName];
      }else {
        device = {name: deviceName, controls: {}};
        dataService.addDevice(deviceName, device);
      }
      parseDeviceInfo(pathItems, message);
    };

    function parseDeviceInfo(pathItems, message){
      switch(pathItems[3]) {
        case "meta":
          parseDeviceMeta(pathItems, message);
          break;
        case "controls":
          parseControls(pathItems, message);
          break;
      }
    }

    function parseDeviceMeta(pathItems, message){
      var deviceName = pathItems[2];
      data.devices[deviceName]['meta' + capitalizeFirstLetter(pathItems[4])] = message.payloadString;
    };

    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

    function parseControls(pathItems, message){
      var deviceName = pathItems[2];
      var controlName = pathItems[4];
      var control = {};

      if(data.controls[controlName] != null) {
        control = data.controls[controlName];
      } else {
        control = data.controls[controlName] = {name: controlName, value: 0};
      };

      control.topic = pathItems.slice(0,5).join('/');

      switch(pathItems[5]) {
        case "meta":
          parseControlMeta(pathItems, message);
          break;
        case undefined:
          var value = message.payloadString;
          if(message.payloadBytes[0] === 48 || message.payloadBytes[0] === 49) value = parseInt(message.payloadString);
          control.value = value;
      };

      data.devices[deviceName].controls[controlName] = control;
    };

    function parseControlMeta(pathItems, message){
      var controlName = pathItems[4];
      data.controls[controlName]['meta' + capitalizeFirstLetter(pathItems[6])] = message.payloadString;
    };

    function parseConfigMsg(pathItems, message){
      switch(pathItems[2]) {
        case "widgets":
          parseWidgetMsg(pathItems, message);
          break;
        case "rooms":
          parseRoomMsg(pathItems, message);
          break;
        case "widget_templates":
          parseWidgetTemplateMsg(pathItems, message);
          break;
        default:
          console.log("ERROR: Unknown config message");
          return null;
          break;
      };
    };

    function parseWidgetMsg(pathItems, message){
      var deviceInfo = message.payloadString.split('/');
      var deviceName = deviceInfo[2];
      var controlName = deviceInfo[4];
      var widgetUID = pathItems[3];
      var widget = {controls: {}, options: {}};

      if(data.widgets[widgetUID] != null){
        widget = data.widgets[widgetUID];
      } else {
        widget['uid'] = widgetUID;
      };

      if(pathItems[4] === 'controls'){
        widget.controls[pathItems[5]] = widget.controls[pathItems[5]] || {};
        switch(pathItems[6]) {
          case "uid":
            widget.controls[pathItems[5]]['uid'] = message.payloadString;
            break;
          case "topic":
            widget.controls[pathItems[5]]['topic'] = data.devices[deviceName].controls[controlName];
            break;
          default:
            console.log("ERROR: Unknown control message");
            return null;
            break;
        };
      }else if(pathItems[4] === 'options'){
        widget.options[pathItems[5]] = widget.options[pathItems[5]] || {};
        widget.options[pathItems[5]][pathItems[6]] = message.payloadString;
      }
      else{
        widget[pathItems[4]] = message.payloadString;
      };

      if(pathItems[4] === 'room'){
        widget[pathItems[4]] = data.rooms[message.payloadString];
        data.rooms[message.payloadString].widgets[widgetUID] = widget;
      };

      if(pathItems[4] === 'template'){
        widget[pathItems[4]] = data.widget_templates[message.payloadString];
      };

      data.widgets[widgetUID] = widget;
    };

    function parseRoomMsg(pathItems, message){
      data.rooms[pathItems[3]] = { uid: pathItems[3], name: message.payloadString, widgets: {} };
    };

    function parseWidgetTemplateMsg(pathItems, message){
      var widgetTemplateUID = pathItems[3];
      var widgetTemplate = { slots: {}, options:{} };
      if(data.widget_templates[widgetTemplateUID] != null){
        widgetTemplate = data.widget_templates[widgetTemplateUID];
      } else {
        widgetTemplate['uid'] = widgetTemplateUID;
      };
      switch(pathItems[4]) {
        case "name":
          widgetTemplate['name'] = message.payloadString;
          break;
        case "slots":
          if(widgetTemplate.slots[pathItems[5]] === undefined){
            var slot = {};
            slot[pathItems[6]] = message.payloadString;
            widgetTemplate.slots[pathItems[5]] = slot;
          }else{
            widgetTemplate.slots[pathItems[5]][pathItems[6]] = message.payloadString;
          }
          break;
        case "options":
          if(widgetTemplate.options[pathItems[5]] === undefined){
            var option = {};
            option[pathItems[6]] = message.payloadString;
            widgetTemplate.options[pathItems[5]] = option;
          }else{
            widgetTemplate.options[pathItems[5]][pathItems[6]] = message.payloadString;
          }
          break;
        default:
          console.log("ERROR: Unknown widget template message");
          return null;
          break;
      };
      data.widget_templates[widgetTemplateUID] = widgetTemplate;
    };

    return dataService;
  });