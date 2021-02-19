// Based off 0.1.8 version of https://github.com/rodikh/angular-json-editor
// This version does actually call onChange handler

'use strict';

//const JSONEditor = require("@json-editor/json-editor").JSONEditor;
import { JSONEditor} from "./jsoneditor";

angular.module('angular-json-editor', []).provider('JSONEditor', function () {
    var configuration = {
        defaults: {
            options: {
                iconlib: 'bootstrap3',
                theme: 'bootstrap3'
            }
        }
    };

    overrideJSONEditor();

    this.configure = function (options) {
        extendDeep(configuration, options);
    };

    this.$get = ['$window', function ($window) {
        var jse = JSONEditor;
        extendDeep(jse, configuration);
        return jse;
    }];

    function extendDeep(dst) {
        angular.forEach(arguments, function (obj) {
            if (obj !== dst) {
                angular.forEach(obj, function (value, key) {
                    if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
                        extendDeep(dst[key], value);
                    } else {
                        dst[key] = value;
                    }
                });
            }
        });
        return dst;
    }

}).directive('jsonEditor', ['$q', 'JSONEditor', function ($q, JSONEditor) {

    return {
        restrict: 'E',
        transclude: true,
        scope: {
            schema: '=',
            startval: '=',
            options: "=",
            buttonsController: '@',
            onChange: '&'
        },
        controller: ['$scope', '$attrs', '$controller', function ($scope, $attrs, $controller) {

            var controller, controllerScope, controllerName = $attrs.buttonsController;
            if (angular.isString(controllerName) && controllerName !== '') {
                controllerScope = {
                    $scope: $scope
                };

                try {
                    controller = $controller(controllerName, controllerScope);
                } catch (e) {
                    // Any exceptions thrown will probably be because the controller specified does not exist
                    throw new Error('json-editor: buttons-controller attribute must be a valid controller.');
                }
            }

        }],
        link: function (scope, element, attrs, controller, transclude) {
            var valueToResolve,
                startValPromise = $q.when({}),
                schemaPromise = $q.when(null);

            scope.isValid = false;

            if (!angular.isString(attrs.schema)) {
                throw new Error('json-editor: schema attribute has to be defined.');
            }
            if (angular.isObject(scope.schema)) {
                schemaPromise = $q.when(scope.schema);
            }
            if (angular.isObject(scope.startval)) {
                // Support both $http (i.e. $q) and $resource promises, and also normal object.
                valueToResolve = scope.startval;
                if (angular.isDefined(valueToResolve.$promise)) {
                    startValPromise = $q.when(valueToResolve.$promise);

                } else {
                    startValPromise = $q.when(valueToResolve);
                }
            }

            // Wait for the start value and schema to resolve before building the editor.
            $q.all([schemaPromise, startValPromise]).then(function (result) {

                // Support $http promise response with the 'data' property.
                var schema = result[0] ? result[0].data || result[0] : null,
                    startVal = result[1];
                if (schema === null) {
                    throw new Error('json-editor: could not resolve schema data.');
                }

                // Commit changes in text fields immediately.
                // FIXME: should make this an option (and perhaps file a pull request for JSONEditor)
                // FIXME: ipv4 input type seems to be an invention of JSONEditor author
                element.on("input", "input[type=text], input[type=ipv4], textarea", function () {
                    var e = document.createEvent("HTMLEvents");
                    e.initEvent("change", false, true);
                    this.dispatchEvent(e);
                });

                var options = {
                    startval: startVal,
                    schema: schema
                };
                if (scope.options)
                    angular.extend(options, scope.options);
                scope.editor = new JSONEditor(element[0], options);

                var editor = scope.editor;

                editor.on('ready', function () {
                    scope.isValid = (editor.validate().length === 0);
                });

                editor.on('change', function () {
                    scope.$apply(function () {
                        var errors = editor.validate();
                        scope.isValid = (errors.length === 0);
                        // Fire the onChange callback
                        var onChange = scope.onChange();
                        if (typeof onChange === 'function') {
                            onChange(editor.getValue(), errors, editor);
                        }
                    });
                });

                // Transclude the buttons at the bottom.
                var buttons = transclude(scope, function (clone) {
                    return clone;
                });

                element.append(buttons);
            });
        }
    };

}]);

function overrideJSONEditor() {
    JSONEditor.defaults.custom_validators.push((schema, value, path) => {
        const errors = [];
        if (   schema.required
            && schema.properties 
            && schema.properties[schema.required[0]] 
            && schema.properties[schema.required[0]].options
            && schema.properties[schema.required[0]].options.hidden
            && schema.properties[schema.required[0]].enum
            && (schema.properties[schema.required[0]].enum.length == 1)
            && (   !value[schema.required[0]]
                || !(value[schema.required[0]] === schema.properties[schema.required[0]].enum[0]))) {
              throw new Error("Stop object validation");
        }
        return errors;
    });
}
