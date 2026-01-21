import ReactDOM from 'react-dom/client';
import { setReactLocale } from '../locale';
import CreateEditSvgDashboardPage from './editSvgDashboardPage';
import EditSvgDashboardPageStore from './pageStore';

function editSvgDashboardDirective(
  mqttClient,
  uiConfig,
  $state,
  DeviceData,
  $locale,
  $rootScope,
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
      if (scope.root) {
        scope.root.unmount();
      }
      scope.store = new EditSvgDashboardPageStore(
        () => $state.go('dashboards'),
        async (id) => {
          // this loaddata needs until we move to one datasourse (dashboardstore)
          await $rootScope.dashboardsStore.loadData();
          $state.go('dashboard-svg', { id: id });
        },
        rolesFactory
      );
      scope.store.setOriginalId(scope.id);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateEditSvgDashboardPage({ pageStore: scope.store }));

      mqttClient
        .whenReady()
        .then(() => uiConfig.whenReady())
        .then(() => {
          scope.store.setDashboard(scope.id, uiConfig, DeviceData, $locale.id);
        })
        .catch((err) => {
          scope.store.setError(err.message);
        });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default editSvgDashboardDirective;
