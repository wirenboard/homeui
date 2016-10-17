'use strict';

angular.module('homeuiApp')
  .controller('NavigationCtrl', function($scope, $location, EditorProxy, ConfigEditorProxy, mqttClient, whenMqttReady, errors, uiConfig) {
    $scope.isActive = function(viewLocation){
      return viewLocation === $location.path();
    };

    $scope.dashboards = () => {
      return uiConfig.data.dashboards.filter(dashboard => !dashboard.isNew);
    };

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
