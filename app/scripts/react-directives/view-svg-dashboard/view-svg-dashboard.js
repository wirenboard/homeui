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
      console.log(params);
      $rootScope.isHMI = params.hmi;
      $rootScope.hmiColor = $rootScope.isHMI && params.hmicolor !== '' ? params.hmicolor : '';
      document.getElementById('page-wrapper').style.backgroundColor = $rootScope.hmiColor;

      if (!$rootScope.svgViewReactRoot) {
        $rootScope.svgViewReactStore = new ViewSvgDashboardPageStore();
        $rootScope.svgViewReactStore.setForceFullscreen($rootScope.forceFullscreen);
        // Faster set styles in AngularJs code
        reaction(
          () => $rootScope.svgViewReactStore.fullscreen.isFullscreen,
          () => {
            $rootScope.$apply();
          }
        );

        $rootScope.svgViewReactStore.setEditDashboardFn(dashboardId =>
          $state.go('dashboard-svg-edit', { id: dashboardId })
        );
        $rootScope.svgViewReactStore.setMoveToDashboardFn(dashboardId => {
          const dashboard = uiConfig.getDashboard(dashboardId);
          if (dashboard) {
            if (dashboard.content.isSvg) {
              $state.go('dashboard-svg', {
                id: dashboardId,
                hmi: $rootScope.isHMI,
                fullscreen: $rootScope.forceFullscreen,
                hmicolor: $rootScope.hmiColor,
              });
            } else {
              $state.go('dashboard', { id: dashboardId });
            }
          }
        });

        $rootScope.svgViewReactElement = document.createElement('div');
        $rootScope.svgViewReactElement.style.height = '100%';
        $rootScope.svgViewReactRoot = ReactDOM.createRoot($rootScope.svgViewReactElement);
        $rootScope.svgViewReactRoot.render(
          CreateViewSvgDashboardPage({ pageStore: $rootScope.svgViewReactStore })
        );
      }

      mqttClient
        .whenReady()
        .then(() => uiConfig.whenReady())
        .then(() => {
          $rootScope.svgViewReactStore.setDeviceData(DeviceData);
          $rootScope.svgViewReactStore.setDashboards(uiConfig.filtered().dashboards);
          $rootScope.svgViewReactStore.setDashboard(scope.id);
        });

      element[0].appendChild($rootScope.svgViewReactElement);

      element.on('$destroy', function () {
        element[0].removeChild($rootScope.svgViewReactElement);
      });
    },
  };
}

export default viewSvgDashboardDirective;
