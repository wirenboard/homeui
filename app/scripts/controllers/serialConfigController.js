function CreateNewDevice(schema, slaveId) {
  let res = { slave_id: String(slaveId) };
  schema.required.forEach(paramName => {
    if (paramName === 'slave_id') {
      return;
    }
    const paramSchema = schema.properties[paramName];
    if (paramSchema?.hasOwnProperty('default')) {
      res[paramName] = paramSchema.default;
      return;
    }
    if (paramSchema?.hasOwnProperty('enum')) {
      res[paramName] = paramSchema.enum[0];
    }
  });
  return res;
}

function GetDeviceSchema(schema, deviceType) {
  return schema.definitions.device.oneOf.find(deviceSchema => {
    return deviceSchema?.properties?.device_type?.default === deviceType;
  });
}

function FirmwareIsNewer(fw1, fw2) {
  if (fw1 === undefined) {
    return true;
  }
  if (fw2 === undefined) {
    return false;
  }
  return fw1.localeCompare(fw2, undefined, { numeric: true, sensitivity: 'base' }) == -1;
}

function GetTemplateDeviceType(deviceSignature, fw, schema) {
  let lastFwVersion = undefined;
  let deviceType = undefined;
  schema.definitions.device.oneOf.forEach(deviceSchema => {
    deviceSchema?.hw?.forEach(hw => {
      console.log(hw.fw);
      console.log(fw);
      if (
        hw.signature == deviceSignature &&
        FirmwareIsNewer(hw.fw, fw) &&
        FirmwareIsNewer(lastFwVersion, hw.fw)
      ) {
        lastFwVersion = hw.fw;
        deviceType = deviceSchema?.properties?.device_type?.default;
      }
    });
  });
  return deviceType;
}

function AddToConfig(config, devices, schema) {
  let res = { unknownDevices: [], added: false };
  devices.forEach(device => {
    const deviceType = GetTemplateDeviceType(device.device_signature, device.fw, schema);
    if (!deviceType) {
      res.unknownDevices.push(device);
      return;
    }
    let port = config.ports.find(p => p.path == device.port);
    if (!port) {
      return;
    }
    if (!port.devices.find(d => d.slave_id == device.slave_id && d.device_type == deviceType)) {
      port.devices.push(CreateNewDevice(GetDeviceSchema(schema, deviceType), device.slave_id));
      res.added = true;
    }
  });
  return res;
}

function MakeUnknownDevicesError(unknownDevices) {
  return {
    msg: 'configurations.errors.unknown_device',
    data: {
      devices: unknownDevices
        .map(d => `\t\t${d.title}:${d.slave_id} (${d.fw}): ${d.device_signature}`)
        .join('\n'),
    },
  };
}

class SerialConfigCtrl {
  constructor(
    $scope,
    $stateParams,
    rolesFactory,
    ConfigEditorProxy,
    whenMqttReady,
    PageState,
    errors
  ) {
    'ngInject';

    const path = '/var/lib/wb-mqtt-confed/schemas/wb-mqtt-serial.schema.json';

    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if (!this.haveRights) return;
    $scope.file = {
      schemaPath: path,
      configPath: '',
      loaded: false,
      valid: true,
      content: {},
      schema: undefined,
    };

    if (!/^\//.test($scope.file.schemaPath)) $scope.file.schemaPath = '/' + $scope.file.schemaPath;

    $scope.canSave = function () {
      return PageState.isDirty() && $scope.file.valid;
    };

    $scope.onChange = function (content, errors) {
      if (!angular.equals($scope.file.content, content)) {
        PageState.setDirty(true);
        $scope.file.content = content;
      }
      $scope.file.valid = !errors.length;
    };

    var load = function () {
      ConfigEditorProxy.Load({ path: $scope.file.schemaPath })
        .then(function (r) {
          $scope.file.configPath = r.configPath;
          const addResult = AddToConfig(r.content, $stateParams.devices, r.schema);
          if (addResult.unknownDevices.length) {
            errors.showError(MakeUnknownDevicesError(addResult.unknownDevices));
          }
          PageState.setDirty(addResult.added);
          $scope.file.content = r.content;
          $scope.file.schema = r.schema;
          $scope.file.loaded = true;
        })
        .catch(errors.catch('configurations.errors.load'));
    };

    $scope.save = function () {
      PageState.setDirty(false);
      ConfigEditorProxy.Save({ path: $scope.file.schemaPath, content: $scope.file.content })
        .then(function () {
          $scope.file.content = angular.merge({}, $scope.file.content);
          if ($scope.file.schema.needReload) load();
        })
        .catch(function (e) {
          PageState.setDirty(true);
          errors.showError(
            { msg: 'configurations.errors.save', data: { name: $scope.file.configPath } },
            e
          );
        });
    };

    whenMqttReady().then(load);
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.config', [])
  .controller('SerialConfigCtrl', SerialConfigCtrl);
