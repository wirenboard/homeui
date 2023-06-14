'use strict';

import ReactDOM from 'react-dom/client';
import CreateViewSvgDashboardPage from './viewSvgDashboardPage';
import ViewSvgDashboardPageStore from './pageStore';
import { checkFullscreen } from '../components/fullscreen/fullscreenStore';
import { reaction } from 'mobx';

function viewSvgDashboardDirective(
  mqttClient,
  uiConfig,
  $location,
  $rootScope,
  DeviceData,
  $state
) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function (scope, element) {
      const params = $location.search();
      $rootScope.forceFullscreen = params.fullscreen;
      $rootScope.checkFullscreen = () => {
        return checkFullscreen() || $rootScope.forceFullscreen;
      };
      $rootScope.isHMI = params.hmi === true;
      const bgColor = $rootScope.isHMI && params.hmicolor !== '' ? params.hmicolor : '';
      document.getElementById('page-wrapper').style.backgroundColor = bgColor;

      if (scope.root) {
        scope.root.unmount();
      }

      scope.store = new ViewSvgDashboardPageStore();
      scope.store.setForceFullscreen($rootScope.forceFullscreen);
      // Faster set styles in AngularJs code
      reaction(
        () => scope.store.fullscreen.isFullscreen,
        () => {
          $rootScope.$apply();
        }
      );

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateViewSvgDashboardPage({ pageStore: scope.store }));

      mqttClient
        .whenReady()
        .then(() => uiConfig.whenReady())
        .then(() => {
          scope.store.setDashboard(uiConfig.getDashboard(scope.id));
          scope.store.setDeviceData(DeviceData);
          scope.store.setEditFn(() => $state.go('dashboard-svg-edit', { id: scope.id }));
        });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default viewSvgDashboardDirective;
