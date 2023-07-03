'use strict';

import { JSONEditor } from '../../../3rdparty/jsoneditor';
import { createJSONEditor } from '../../json-editor/wb-json-editor';

const AngularJsonEditorModule = angular
  .module('angular-json-editor', [])
  .provider('JSONEditor', function () {
    this.$get = [
      function () {
        return JSONEditor;
      },
    ];
  })
  .directive('jsonEditor', [
    '$locale',
    function ($locale) {
      return {
        restrict: 'E',
        scope: {
          schema: '=',
          startval: '=',
          onChange: '&',
        },
        link: function (scope, element, attrs) {
          scope.isValid = false;

          if (!angular.isString(attrs.schema)) {
            throw new Error('json-editor: schema attribute has to be defined.');
          }

          scope.$watch('schema', function (newValue, oldValue) {
            if (newValue === undefined) {
              return;
            }

            var schema = newValue;
            var startVal = scope.startval;

            if (schema === null) {
              throw new Error('json-editor: could not resolve schema data.');
            }

            if (scope.editor && angular.equals(newValue, oldValue)) {
              scope.editor.setValue(startVal);
              return;
            }

            if (scope.editor) {
              scope.editor.destroy();
            }
            scope.editor = createJSONEditor(element[0], schema, startVal, $locale.id);

            scope.editor.on('ready', () => {
              scope.isValid = scope.editor.validate().length === 0;
            });

            scope.editor.on('change', () => {
              scope.$apply(() => {
                var errors = scope.editor.validate();
                scope.isValid = errors.length === 0;
                // Fire the onChange callback
                var onChange = scope.onChange();
                if (typeof onChange === 'function') {
                  onChange(scope.editor.getValue(), errors, scope.editor);
                }
              });
            });
          });
        },
      };
    },
  ]).name;

export default AngularJsonEditorModule;
