'use strict';

angular.module('homeuiApp.dataServiceModule', [])
  .factory('HomeUIData', function($window) {
    var data = { devices:{}, controls:{}, widgets:{}, widget_templates:{}, rooms:{}, dashboards:{}, defaults: {} };
    var dataService = {};
    var globalPrefix = '';

    data.widget_templates = {
      light: { uid: 'light', name: 'Light control relay',
               options: {},
               slots: {
                 slot0: { name: 'Switch', uid: 'slot0', type: 'switch' }
               }
             },
      dimmable_light: { uid: 'dimmable_light', name: 'Dimmable light control',
                        options: {},
                        slots: {
                          slot0: { name: 'Dimmer', uid: 'slot0', type: 'range' }
                        }
                      },
      rgb: { uid: 'rgb', name: 'RGB light',
               options: {},
               slots: {
                 slot0: { name: 'RGB control', uid: 'slot0', type: 'rgb' }
               }
             },
      sensor: { uid: 'sensor', name: 'Generic Sensor',
                options: {},
                slots: {
                  slot0: { name: 'Sensor Value', uid: 'slot0' }
                }
              },
      open_closed_sensor: {
                            uid: 'open_closed_sensor', name: 'Open/close sensor',
                            slots: {
                              slot0: { name: 'Sensor', uid: 'slot0' }
                            }
                          },
      temperature: { uid: 'temperature', name: 'Temperature',
                options: {},
                slots: {
                  slot0: { name: 'Temperature sensor', uid: 'slot0', type: 'temperature' }
                }
              },
      humidity: { uid: 'humidity', name: 'Humidity',
                options: {},
                slots: {
                  slot0: { name: 'Himudity sensor', uid: 'slot0', type: 'rel_humidity' }
                }
              },
      illuminance: { uid: 'illuminance', name: 'Illuminance',
                options: {},
                slots: {
                  slot0: { name: 'Illuminance sensor', uid: 'slot0' }
                }
              },
      air_quality: { uid: 'air_quality', name: 'Air quality',
                options: {},
                slots: {
                  slot0: { name: 'Sensor', uid: 'slot0' }
                }
              },
      leakage: { uid: 'leakage', name: 'Leakage',
                options: {},
                slots: {
                  slot0: { name: 'Sensor', uid: 'slot0' }
                }
              },
      motion: { uid: 'motion', name: 'Motion',
                options: {},
                slots: {
                  slot0: { name: 'Sensor', uid: 'slot0' }
                }
              },
      alarm: { uid: 'alarm', name: 'Alarm',
                options: {},
                slots: {
                  slot0: { name: 'Sensor', uid: 'slot0', type: 'switch' }
                }
             },
      fan: { uid: 'fan', name: 'Fan',
                options: {},
                slots: {
                  slot0: { name: 'Fan control relay', uid: 'slot0', type: 'switch' }
                }
             }
    };

    dataService.parseMsg = function(message) {
      if($window.localStorage['prefix'] === 'true') globalPrefix = '/client/' + $window.localStorage['user'];
      var pathItems = message.destinationName.replace(globalPrefix, '').split('/');

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
          console.log("WARNING: Unknown message: " + pathItems[1]);
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
      var topic = pathItems.slice(0,5).join('/');
      var control = {};

      if(data.controls[topic] != null) {
        control = data.controls[topic];
      } else {
        control = data.controls[topic] = {name: controlName, value: 0};
      };

      control.topic = topic;

      switch(pathItems[5]) {
        case "meta":
          parseControlMeta(pathItems, message);
          break;
        case undefined:
          var value = message.payloadString;
          //FIXME: implement proper parsing of value based on meta type?
          if (message.payloadString == "1") {
              value = 1;
          } else if (message.payloadString == "0") {
              value = 0;
          }
          control.value = value;
      };

      data.devices[deviceName].controls[controlName] = control;
    };

    function parseControlMeta(pathItems, message){
      var topic = pathItems.slice(0,5).join('/');
      data.controls[topic]['meta' + capitalizeFirstLetter(pathItems[6])] = message.payloadString;
    };

    function parseConfigMsg(pathItems, message){
      switch(pathItems[2]) {
        case "widgets":
          parseWidgetMsg(pathItems, message);
          break;
        case "rooms":
          parseRoomMsg(pathItems, message);
          break;
        case "dashboards":
          parseDashboardMsg(pathItems, message);
          break;
        case "default_dashboard":
          data.defaults["dashboard"] = message.payloadString;
          break;
        default:
          console.log("WARNING: Unknown config message: " + pathItems[2]);
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
		if (message.payloadString == "") {
			return;
		}
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
            console.log("WARNING: Unknown control message: " + pathItems[6]);
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
        widget[pathItems[4]] = message.payloadString;

        data.rooms[message.payloadString].widgets.push(widget.uid);
      };

      if(pathItems[4] === 'template'){
        widget[pathItems[4]] = message.payloadString;
      };

      data.widgets[widgetUID] = widget;
    };

    function parseRoomMsg(pathItems, message){
      if(pathItems[4] === 'name'){
        data.rooms[pathItems[3]] = { uid: pathItems[3], name: message.payloadString, widgets: [] };
      };
    };

    function parseDashboardMsg(pathItems, message){
      var dashboardUID = pathItems[3];
      var dashboard = { widgets: {} };

	  //FIXME: properly handle null messages
      if (message.payloadString == "") {
		return;
      }


      if(data.dashboards[dashboardUID] != null){
        dashboard = data.dashboards[dashboardUID];
      } else {
        dashboard['uid'] = dashboardUID;
      };

      if(pathItems[4] === 'widgets'){
        dashboard.widgets[pathItems[5]] = dashboard.widgets[pathItems[5]] || {};
        switch(pathItems[6]) {
          case "uid":
            //~ dashboard.widgets[pathItems[5]]['uid'] = data.widgets[message.payloadString];
            dashboard.widgets[pathItems[5]] = data.widgets[message.payloadString];
            break;
          default:
            console.log("WARNING: Unknown dashboard message: " + pathItems[6]);
            return null;
            break;
        };
      }
      else{
        dashboard[pathItems[4]] = message.payloadString;
      };

      data.dashboards[dashboardUID] = dashboard;
    };

    return dataService;
  });
