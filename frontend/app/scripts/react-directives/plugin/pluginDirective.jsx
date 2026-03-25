import React from 'react';
import ReactDOM from 'react-dom/client';
import { PluginHost } from '@/components/plugin-host/plugin-host';

export default function pluginDirective($stateParams) {
  'ngInject';
  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      const pluginId = $stateParams.pluginId;
      const componentName = $stateParams.componentName;

      const root = ReactDOM.createRoot(element[0]);
      root.render(
        React.createElement(PluginHost, {
          pluginId: pluginId,
          componentName: componentName,
        })
      );

      element.on('$destroy', () => {
        root.unmount();
      });
    },
  };
}
