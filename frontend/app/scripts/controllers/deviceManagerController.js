'use strict';

import deviceManagerDirective from '../react-directives/device-manager/device-manager';

class DeviceManagerController {
  constructor() {
    'ngInject';

  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.deviceManager', [])
  .controller('DeviceManagerController', DeviceManagerController)
  .directive('deviceManagerPage', deviceManagerDirective)

