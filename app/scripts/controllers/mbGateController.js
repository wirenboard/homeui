'use strict';

import mbGateDirective from '../react-directives/mbgate/mbgate';

class MbGateController {
  constructor() {
    'ngInject';
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.mbgate', [])
  .controller('MbGateController', MbGateController)
  .directive('mbGatePage', mbGateDirective);
