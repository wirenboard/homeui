'use strict';

angular.module('homeuiApp')
  .controller('NavigationCtrl', function($scope, $location, CommonCode, EditorProxy, ConfigEditorProxy, mqttClient, whenMqttReady, errors) {
    $scope.isActive = function(viewLocation){
      return viewLocation === $location.path();
    };
    $scope.data = CommonCode.data;
    $scope.rooms = $scope.data.rooms;
    $scope.dashboards = $scope.data.dashboards;
    $scope.widgets = $scope.data.widgets;
    $scope.widget_templates = $scope.data.widget_templates;
    $scope.isConnected = function () {
      return mqttClient.isConnected();
    };

    var scripts = [], rules = [], devices = [], configs = [],
        needToLoadScripts = false,
        needToLoadConfigs = false;

    whenMqttReady().then(function () {
      needToLoadScripts = needToLoadConfigs = true;
      mqttClient.subscribe("/wbrules/updates/+", function () {
        needToLoadScripts = true;
      });
    });

    function collectLocs(scripts, member) {
      var m = {};
      scripts.forEach(function (script) {
        (script[member] || []).forEach(function (loc) {
          m[loc.name] = {
            virtualPath: script.virtualPath,
            name: loc.name,
            line: loc.line
          };
        });
      });
      var r = [];
      Object.keys(m).sort().forEach(function (name) {
        r.push(m[name]);
      });
      return r;
    }

    $scope.getScripts = function () {
      if (needToLoadScripts) {
        needToLoadScripts = false;
        EditorProxy.List().then(function (result) {
          scripts = result;
          rules = collectLocs(scripts, "rules");
          devices = collectLocs(scripts, "devices");
        }).catch(errors.catch("Error listing the scripts"));
      }
      return scripts;
    };

    $scope.getRules = function getRules () {
      this.getScripts();
      return rules;
    };

    $scope.getVirtualDevices = function getVirtualDevices () {
      this.getScripts();
      return devices;
    };

    $scope.getConfigs = function () {
      if (needToLoadConfigs) {
        needToLoadConfigs = false;
        ConfigEditorProxy.List().then(function (result) {
          configs = result;
        }).catch(errors.catch("Error listing the configs"));
      }
      return configs;
    };
  })
  .directive('roomMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/rooms/menu-item.html'
    };
  })
  .directive('dashboardMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/dashboards/menu-item.html'
    };
  })
  .directive('widgetMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/menu-item.html'
    };
  })
  .directive('widgetTemplateMenuItem', function(){
    return{
      restrict: 'A',
      templateUrl: 'views/widgets/template-menu-item.html'
    };
  });
