'use strict';

import ReactDOM from 'react-dom/client';
import CreateEditSvgDashboardPage from './editSvgDashboardPage';
import EditSvgDashboardPageStore from './pageStore';

function editSvgDashboardDirective(mqttClient, uiConfig, $state, DeviceData, $locale) {
  'ngInject';

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
        id => $state.go('dashboard-svg', { id: id })
      );
      scope.store.setOriginalId(scope.id);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateEditSvgDashboardPage({ pageStore: scope.store }));

      mqttClient
        .whenReady()
        .then(() => uiConfig.whenReady())
        .then(() => {
          scope.store.setDashboard(
            scope.id ? uiConfig.getDashboard(scope.id) : uiConfig.addDashboardWithSvg(),
            DeviceData,
            $locale.id,
            uiConfig.filtered().dashboards
          );
        })
        .catch(err => {
          scope.store.setError(err.message);
        });

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default editSvgDashboardDirective;
