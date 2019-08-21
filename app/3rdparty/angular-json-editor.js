// Based off 0.1.8 version of https://github.com/rodikh/angular-json-editor
// This version does actually call onChange handler

'use strict';

angular.module('angular-json-editor', []).provider('JSONEditor', function () {
    var configuration = {
        defaults: {
            options: {
                iconlib: 'bootstrap3',
                theme: 'bootstrap3'
            }
        }
    };

    this.configure = function (options) {
        this.extendDeep(configuration, options);
    };

    this.$get = ['$window', function ($window) {
        var JSONEditor = $window.JSONEditor;


        this.extendEditor(JSONEditor);
        this.extendDeep(JSONEditor, configuration);

        require('./editors/editor-channel-select');

        return $window.JSONEditor;
    }];

    this.extendEditor = function (JSONEditor) {

        JSONEditor.defaults.resolvers.unshift(function (schema) {

            // TEMPORARY SUPPORT
            if (schema.type === 'string' && schema.title === 'MQTT Device (from topic name)') {
                schema.format = 'channelSelect';
            }
            if (schema.type === 'string' && schema.title === 'MQTT topic pattern') {
                //schema.format = 'channelSelect';
                //schema.options = {
                //    pattern: true,
                //};
            }


            if (schema.type === 'string' && schema.format === 'channelSelect') {
                return 'channelSelect';
            }
        });
    };

    this.extendDeep = function (dst) {
        angular.forEach(arguments, (obj) => {
            if (obj !== dst) {
                angular.forEach(obj, (value, key) => {
                    if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
                        this.extendDeep(dst[key], value);
                    }
                    else {
                        dst[key] = value;
                    }
                });
            }
        });
        return dst;
    };

}).directive('jsonEditor', ['$q', 'JSONEditor', '$compile', function ($q, JSONEditor, $compile) {

    return {
        restrict: 'E',
        transclude: true,
        scope: {
            schema: '=',
            startval: '=',
            options: '=',
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
            var valueToResolve;
            var startValPromise = $q.when({});
            var schemaPromise = $q.when(null);
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

            function renderDirective() {
                var components = Object.values(element[0].getElementsByClassName('render'));
                if (components.length) {
                    components.forEach((component) => {
                        angular.element(component).removeClass('render');
                        $compile(component)(scope);
                    });
                }
                console.log(components);
            }

            // Wait for the start value and schema to resolve before building the editor.
            $q.all([schemaPromise, startValPromise]).then(function (result) {

                // Support $http promise response with the 'data' property.
                var schema = result[0] ? result[0].data || result[0] : null;
                var startVal = result[1];
                if (schema === null) {
                    throw new Error('json-editor: could not resolve schema data.');
                }

                // Commit changes in text fields immediately.
                // FIXME: should make this an option (and perhaps file a pull request for JSONEditor)
                // FIXME: ipv4 input type seems to be an invention of JSONEditor author
                element.on('input', 'input[type=text], input[type=ipv4], textarea', function () {
                    var e = document.createEvent('HTMLEvents');
                    e.initEvent('change', false, true);
                    this.dispatchEvent(e);
                });

                var options = {
                    startval: startVal,
                    schema: schema
                };
                if (scope.options) {
                    angular.extend(options, scope.options);
                }

                scope.editor = new JSONEditor(element[0], options);

                var editor = scope.editor;

                editor.on('ready', function () {
                    scope.isValid = (editor.validate().length === 0);

                    renderDirective();
                });

                editor.on('change', function () {
                    scope.$apply(function () {
                        var errors = editor.validate();
                        scope.isValid = (errors.length === 0);
                        // Fire the onChange callback
                        var onChange = scope.onChange();

                        renderDirective();

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
