import firmwareIsNewer from '../utils/fwUtils';

function createNewDevice(schema, slaveId) {
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
  Object.entries(schema.properties).forEach(([key, value]) => {
    if (value.hasOwnProperty('requiredProp')) {
      res[key] = value.default;
    }
  });
  return res;
}

function getDeviceSchema(schema, deviceType) {
  return schema.definitions.device.oneOf.find(deviceSchema => {
    return deviceSchema?.properties?.device_type?.default === deviceType;
  });
}

function getTemplateDeviceType(deviceSignature, fw, schema) {
  let lastFwVersion = undefined;
  let deviceType = undefined;
  schema.definitions.device.oneOf.forEach(deviceSchema => {
    deviceSchema?.hw?.forEach(hw => {
      if (
        hw.signature == deviceSignature &&
        firmwareIsNewer(hw.fw, fw) &&
        firmwareIsNewer(lastFwVersion, hw.fw)
      ) {
        lastFwVersion = hw.fw;
        deviceType = deviceSchema?.properties?.device_type?.default;
      }
    });
  });
  return deviceType;
}

/**
 * Add scanned devices to wb-mqtt-serial config
 *
 * @typedef {object} Scanned_Device_Config
 * @property {number} slave_id
 * @property {number} baud_rate
 * @property {string} parity
 * @property {number} data_bits
 * @property {number} stop_bits
 *
 * @typedef {object} Scanned_Device
 * @property {string} title
 * @property {string} device_signature
 * @property {string} port
 * @property {Scanned_Device_Config} cfg
 * @property {string} fw
 *
 * @typedef {object} Add_Result
 * @property {Scanned_Device[]} unknown unknown devices
 * @property {Scanned_Device[]} misconfigured misconfigured devices
 * @property {added} added true if something is added to config
 *
 * @param {object} config wb-mqtt-serial config
 * @param {Scanned_Device[]} devices scanned devices
 * @param {object} schema JSON-schema for json-editor
 * @returns {Add_Result}
 */
function addToConfig(config, devices, schema) {
  let res = { unknown: [], misconfigured: [], added: false };
  devices.forEach(device => {
    const deviceType = getTemplateDeviceType(device.device_signature, device.fw, schema);
    if (!deviceType) {
      res.unknown.push(device);
      return;
    }
    let port = config.ports.find(p => p.path == device.port);
    if (!port) {
      return;
    }
    if (!port.devices.find(d => d.slave_id == device.cfg.slave_id && d.device_type == deviceType)) {
      port.devices.push(createNewDevice(getDeviceSchema(schema, deviceType), device.cfg.slave_id));
      res.added = true;
      if (
        device.cfg.baud_rate != port.baud_rate ||
        device.cfg.data_bits != port.data_bits ||
        device.cfg.parity != port.parity ||
        device.cfg.stop_bits != port.stop_bits
      ) {
        res.misconfigured.push(device);
      }
    }
  });
  return res;
}

function makeUnknownDeviceError(device, first) {
  return {
    msg: first
      ? 'configurations.errors.first_unknown_device'
      : 'configurations.errors.unknown_device',
    data: device,
  };
}

function makeMisconfiguredDeviceError(device, first) {
  return {
    msg: first
      ? 'configurations.errors.first_misconfigured_device'
      : 'configurations.errors.misconfigured_device',
    data: device,
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
          const res = addToConfig(r.content, $stateParams.devices, r.schema);
          errors.showErrors(
            res.unknown
              .map((dev, i) => makeUnknownDeviceError(dev, i == 0))
              .concat(res.misconfigured.map((dev, i) => makeMisconfiguredDeviceError(dev, i == 0)))
          );
          PageState.setDirty(res.added);
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
