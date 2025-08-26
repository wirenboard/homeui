import { reaction } from 'mobx';
import ReactDOM from 'react-dom/client';
import { checkFullscreen } from '../components/fullscreen/fullscreenStore';
import { setReactLocale } from '../locale';
import ViewSvgDashboardPageStore from './pageStore';
import CreateViewSvgDashboardPage from './viewSvgDashboardPage';

function viewSvgDashboardDirective(
  mqttClient,
  uiConfig,
  $rootScope,
  DeviceData,
  $state,
  rolesFactory
) {
  'ngInject';

  setReactLocale();
  return {
    restrict: 'E',
    scope: {
      id: '=',
    },
    link: function (scope, element) {
      const params = $state.params;
      $rootScope.forceFullscreen = params.fullscreen === true;
      $rootScope.checkFullscreen = () => {
        return checkFullscreen() || $rootScope.forceFullscreen;
      };
      $rootScope.isHMI = params.hmi === true;
      $rootScope.hmiColor = $rootScope.isHMI && params.hmicolor !== '' ? params.hmicolor : '';
      document.getElementById('page-wrapper').style.backgroundColor = $rootScope.hmiColor;

      scope.store = new ViewSvgDashboardPageStore(rolesFactory);
      scope.store.setForceFullscreen($rootScope.forceFullscreen);
      // Faster set styles in AngularJs code
      const disposeFullScreenReaction = reaction(
        () => scope.store.fullscreen.isFullscreen,
        () => {
          $rootScope.$apply();
        }
      );

      scope.store.setEditDashboardFn((dashboardId) =>
        $state.go('dashboard-svg-edit', { id: dashboardId })
      );

      scope.store.setMoveToDashboardFn((dashboardId, sourceDashboardId) => {
        const dashboard = uiConfig.getDashboard(dashboardId);
        if (dashboard) {
          let newParams = {
            id: dashboardId,
          };
          if ($rootScope.forceFullscreen) {
            newParams.fullscreen = $rootScope.forceFullscreen;
          }
          if ($rootScope.isHMI) {
            newParams.hmi = $rootScope.isHMI;
          }
          if ($rootScope.hmiColor) {
            newParams.hmicolor = $rootScope.hmiColor;
          }
          if (dashboard.content.isSvg) {
            $state.go('dashboard-svg', newParams, {
              custom: {
                noreload: true,
              },
            });
            $rootScope.$apply();
          } else {
            newParams.sourceDashboardId = sourceDashboardId;
            $state.go('dashboard', newParams);
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
        disposeFullScreenReaction();
        scope.store.dispose();
        scope.root.unmount();
      });
    },
  };
}

export default viewSvgDashboardDirective;
