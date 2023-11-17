'use strict';

import ReactDOM from 'react-dom/client';
import CreateScriptEditorPage from './scriptEditorPage';
import ScriptEditorStore from './pageStore';

function scriptEditorDirective(whenMqttReady, EditorProxy, rolesFactory, $location) {
  'ngInject';

  return {
    restrict: 'E',
    scope: {
      path: '=',
      isNew: '=',
    },
    link: function (scope, element) {
      const save = async (title, content) => {
        return new Promise((resolve, reject) => {
          EditorProxy.Save({ path: title, content: content })
            .then(reply => {
              if (scope.isNew) {
                $location.path('/rules/edit/' + reply.path);
              }
              if (reply.error) {
                reject({
                  message: reply.error,
                  traceback: reply.traceback,
                });
              } else {
                resolve();
              }
            })
            .catch(err => reject(err));
        });
      };

      scope.store = new ScriptEditorStore(rolesFactory, save, scope.path);
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(CreateScriptEditorPage({ store: scope.store }));

      if (!scope.store.isNew) {
        whenMqttReady()
          .then(() => {
            return EditorProxy.Load({ path: scope.path });
          })
          .then(r => {
            scope.store.setRuleText(r.content);
            scope.store.setError(r.error);
          })
          .catch(e => {
            scope.store.setError(e);
          });
      }

      element.on('$destroy', function () {
        scope.root.unmount();
      });
    },
  };
}

export default scriptEditorDirective;
