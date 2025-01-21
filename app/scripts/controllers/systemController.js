'use strict';

import { setReactLocale } from '../react-directives/locale';
import cloudStatusMetaDirective from '../react-directives/cloud-status/cloud-meta-status';
import firmwareUpdateDirective from '../react-directives/firmware-update/firmware-update';

function SystemCtrl(rolesFactory) {
  'ngInject';

  rolesFactory.asyncCheckRights(rolesFactory.ROLE_THREE, () => {
    this.haveRights = true;
  });
  setReactLocale();
}

export default angular
  .module('homeuiApp.system', [])
  .controller('SystemCtrl', SystemCtrl)
  .directive('cloudStatusMetaWidget', cloudStatusMetaDirective)
  .directive('firmwareUpdateWidget', firmwareUpdateDirective);
