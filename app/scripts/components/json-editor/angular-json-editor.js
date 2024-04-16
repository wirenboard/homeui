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
    'DeviceData',
    function ($locale, DeviceData) {
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
            let additionalData;
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

            if (Object.values(schema.properties).some((item) => item.format === 'wb-autocomplete'
              && item.options?.wb?.data === 'devices')) {
              additionalData = Object.keys(DeviceData.cells).filter((item) => !item.startsWith('system__'));
            }

            scope.editor = createJSONEditor(element[0], schema, startVal, $locale.id, undefined, additionalData);

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
