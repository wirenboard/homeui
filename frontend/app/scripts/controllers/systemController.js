import { setReactLocale } from '../react-directives/locale';
import cloudStatusMetaDirective from '../react-directives/cloud-status/cloud-meta-status';
import firmwareUpdateDirective from '../react-directives/firmware-update/firmware-update';
import { getDeviceInfo } from '@/utils/httpsUtils';

function SystemCtrl(rolesFactory) {
  'ngInject';

  this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
  setReactLocale();

  getDeviceInfo().then(res => {
    this.showTestingOffer =
      res.release_suite === 'stable'
      && !localStorage.getItem('hide-stable-notice')
      && rolesFactory.current.role == rolesFactory.ROLE_THREE;
  });

  this.closeTestingOffer = () => {
    this.showTestingOffer = false;
    localStorage.setItem('hide-stable-notice', true);
  };
}

export default angular
  .module('homeuiApp.system', [])
  .controller('SystemCtrl', SystemCtrl)
  .directive('cloudStatusMetaWidget', cloudStatusMetaDirective)
  .directive('firmwareUpdateWidget', firmwareUpdateDirective);
