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
      $rootScope.isHMI = params.hmi;
      $rootScope.hmiColor = $rootScope.isHMI && params.hmicolor !== '' ? params.hmicolor : '';
      document.getElementById('page-wrapper').style.backgroundColor = $rootScope.hmiColor;

      scope.store = new ViewSvgDashboardPageStore();
      scope.store.setForceFullscreen($rootScope.forceFullscreen);
      // Faster set styles in AngularJs code
      reaction(
        () => scope.store.fullscreen.isFullscreen,
        () => {
          $rootScope.$apply();
        }
      );

      scope.store.setEditDashboardFn(dashboardId =>
        $state.go('dashboard-svg-edit', { id: dashboardId })
      );
      scope.store.setMoveToDashboardFn(dashboardId => {
        const dashboard = uiConfig.getDashboard(dashboardId);
        if (dashboard) {
          if (dashboard.content.isSvg) {
            $state.go(
              'dashboard-svg',
              {
                id: dashboardId,
                hmi: $rootScope.isHMI,
                fullscreen: $rootScope.forceFullscreen,
                hmicolor: $rootScope.hmiColor,
              },
              {
                custom: {
                  noreload: true,
                },
              }
            );
          } else {
            $state.go('dashboard', { id: dashboardId });
          }
        }
      });

      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateViewSvgDashboardPage({ pageStore: scope.store }));

      mqttClient
        .whenReady()
        .then(() => uiConfig.whenReady())
        .then(() => {
          scope.store.setDeviceData(DeviceData);
          scope.store.setDashboards(uiConfig.filtered().dashboards);
          scope.store.setDashboard(scope.id);
        });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default viewSvgDashboardDirective;
