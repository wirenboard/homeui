'use strict';

angular.module('homeuiApp.commonServiceModule', [])
    .factory('CommonCode', ['$rootScope', '$location', '$window', '$routeParams', 'mqttClient', 'HomeUIData', function($rootScope, $location, $window, $routeParams, mqttClient, HomeUIData) {
        var commonCode = {};
        var globalPrefix = '';

        $rootScope.Math = window.Math;

        commonCode.tryConnect = commonCode.tryConnect;
        commonCode.disconnect = commonCode.disconnect;
        commonCode.data = HomeUIData.list();

        $rootScope._mqttTopicCache = {};

        commonCode.isConnected = function() {
            return mqttClient.isConnected();
        };


        commonCode.tryConnect = function() {
            if ($window.localStorage['port'] == undefined) {
                $window.localStorage['port'] = 18883;
            }

            if ($window.localStorage['host'] == undefined) {
                $window.localStorage['host'] = $window.location.hostname;
            }

            if (0) {
                if ($window.localStorage['user'] == undefined) {
                    $window.localStorage['user'] = 'wb_test1';
                }
                if ($window.localStorage['password'] == undefined) {
                    $window.localStorage['password'] = 'testpass';
                }
                if ($window.localStorage['prefix'] == undefined) {
                    $window.localStorage['prefix'] = "true"
                }
            }



            commonCode.loginData = {};
            commonCode.loginData.host = $window.localStorage['host'];
            commonCode.loginData.port = $window.localStorage['port'];
            commonCode.loginData.user = $window.localStorage['user'];
            commonCode.loginData.password = $window.localStorage['password'];
            commonCode.loginData.prefix = $window.localStorage['prefix'];

            if (commonCode.loginData.host && commonCode.loginData.port) {
                var clientID = 'contactless-' + randomString(10);
                console.log('Try to connect as ' + clientID);
                mqttClient.connect(commonCode.loginData.host, commonCode.loginData.port, clientID, commonCode.loginData.user, commonCode.loginData.password);
                console.log('Successfully logged in ' + clientID);
            } else {
                console.log('Вам нужно перейти в настройки и заполнить данные для входа');
            };
        };

        commonCode.deleteWidget = function(widget) {
            console.log("click_delete widget");
            console.log(widget);
            widget.name += "-";

            var uid = widget.uid;
            delete commonCode.data.widgets[uid];

            $rootScope.mqttDeleteByPrefix("/config/widgets/" + uid + "/");

            for (var dashboard_id in commonCode.data.dashboards) {
                var dashboard = commonCode.data.dashboards[dashboard_id];

                for (var widget_key in dashboard.widgets) {
                    var dashboard_widget = dashboard.widgets[widget_key];
                    if (dashboard_widget.uid == uid) {
                        delete dashboard.widgets[widget_key];

                        //fixme: use dashboard.uid instead of dashboard_id ?
                        $rootScope.mqttDeleteByPrefix('/config/dashboards/' + dashboard_id + '/widgets/' + widget_key + '/');
                    }
                }
            }


            for (var room_id in commonCode.data.rooms) {
                var room = commonCode.data.rooms[room_id];
                console.log(room);
                for (var i = 0; i < room.widgets.length; i++) {
                    if (room.widgets[i] == uid) {
                        room.widgets.splice(i, 1);
                    }
                }
            }
        };


        $rootScope.change = function(control) {
            console.log('changed: ' + control.name + ' value: ' + control.value);
            var payload = control.value;
            var retained = false;
            if (control.metaType == 'switch' && (control.value === true || control.value === false)) {
                payload = control.value ? '1' : '0';
            } else if (control.metaType == 'pushbutton') {
                payload = "1";
            }
            var topic = control.topic + '/on';
            mqttClient.send(topic, payload, retained);
        };

        commonCode.disconnect = function() {
            mqttClient.disconnect();
        };

        $rootScope.$watch('$viewContentLoaded', function() {
            commonCode.tryConnect();
        });

        mqttClient.onMessage(function(message) {
            if ($window.localStorage['prefix'] === 'true') globalPrefix = '/client/' + $window.localStorage['user'];
            $rootScope._mqttTopicCache[message.destinationName.replace(globalPrefix, '')] = message.payloadBytes;

            HomeUIData.parseMsg(message);
            $rootScope.$apply();
        });

        $rootScope.mqttSendCollection = function(topic, collection, backTo) {
            for (var key in collection) {
                if (collection.hasOwnProperty(key)) {
                    if (typeof collection[key] === "object")
                        $rootScope.mqttSendCollection(topic + '/' + key, collection[key]);
                    else {
                        console.log(topic + "/" + key + " -> " + collection[key]);
                        mqttClient.send(topic + "/" + key, String(collection[key]));
                    }
                };
            };

            $rootScope.showCreated = true;

            if (backTo) {
                var currentPath = $location.path().split("#").pop();
                backTo = backTo.split("#").pop();
                if (backTo === currentPath) backTo = '/';
                $location.path(backTo);
            };
        };

        $rootScope.mqttDeleteByPrefix = function(prefix) {
            //~ debugger;
            for (var topic in $rootScope._mqttTopicCache) {

                if (topic.slice(0, prefix.length) == prefix) {
                    //~ payload = $rootScope._mqttTopicsCache[msg];
                    console.log("undefined -> " + topic);
                    mqttClient.send(topic, null);


                }
            }
        };

        $rootScope.isEmpty = function(collection) {
            return angular.equals({}, collection);
        };

        $rootScope.switchOff = function(control) {
            control.value = "0";
            $rootScope.change(control);
        };

        $rootScope.switchOn = function(control) {
            control.value = control.metaMax;
            $rootScope.change(control);
        };

        function randomString(length) {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < length; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        return commonCode;
    }]);
