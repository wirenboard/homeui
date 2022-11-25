// Based on 0.1.8 version of https://github.com/rodikh/angular-json-editor
// This version does actually call onChange handler

'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";
import JsonEditorRussianTranslation from "./json-editor-ru";
import makeLazyTabsArrayEditor from "./lazy-tabs-array-editor";
import makeDisabledEditorWrapper from "./disabled-editor-wrapper";
import makeTranslatedInfoEditor from "./translated-info-editor";
import makeIntegerEditorWithSpecialValue from "./integer-editor-with-special-value";
import makeReadonlyOneOfEditor from "./readonly-oneof-editor";
import makeMergedDefaultValuesEditor from "./merged-default-values-editor";
import makeEditWithDropdownEditor from "./edit-with-dropdown";
import makeCollapsibleArrayEditor from "./collapsible-array-editor";
import makeCollapsibleMultipleEditor from "./collapsible-multiple-editor";
import makeObjectEditorWithButtonsOnTop from "./object-editor-with-buttons-on-top"
import makeUnknownDeviceEditor from "./unknown-device-editor";
import makeSelectWithHiddenItems from "./select-with-hidden-items";
import makeGroupsEditor from "./group-editor";
import makeOptionalEditorWithDropDown from "./optional-editor-with-dropdown";
import makeWbBootstrap3Theme from "./wb-bootstrap3-theme";
import makeWbBootstrap3Iconlib from "./wb-bootstrap3-iconlib";
import makeWbArrayEditor from "./wb-array-editor";

const AngularJsonEditorModule = angular.module('angular-json-editor', []).provider('JSONEditor', function () {
    var configuration = {
        defaults: {
            options: {
                show_errors: "always",
                iconlib: 'wb-bootstrap3',
                theme: 'wb-bootstrap3'
            }
        }
    };

    overrideJSONEditor();

    this.configure = function (options) {
        extendDeep(configuration, options);
    };

    this.$get = [function () {
        var jse = JSONEditor;
        extendDeep(jse, configuration);
        jse.defaults.resolvers.unshift(schema => {
            if(schema.options && schema.options.show_opt_in) {
                switch (schema.type) {
                    case "integer": return schema.enum ? "slWb" : "inWb";
                    case "number": return "nmWb";
                }
            }
        });
        jse.defaults.resolvers.unshift(schema => schema.type === 'integer' && schema.format === 'siWb' && 'siWb');
        jse.defaults.resolvers.unshift(schema => (schema.type === 'integer' || schema.type === 'string') && schema.format === 'edWb' && 'edWb');
        jse.defaults.resolvers.unshift(schema => schema.type === 'array' && schema.format === 'lazy-tabs' && 'lazy-tabs');
        jse.defaults.resolvers.unshift(schema => schema.type === 'array' && schema.format === 'collapsible-list' && 'collapsible-list');
        jse.defaults.resolvers.unshift(schema => schema.oneOf && schema.format === 'roMultiple' && 'roMultiple');
        jse.defaults.resolvers.unshift(schema => schema.oneOf && schema.format === 'wb-multiple' && 'wb-multiple');
        jse.defaults.resolvers.unshift(schema => schema.type === 'object' && schema.format === 'merge-default' && 'merge-default');
        jse.defaults.resolvers.unshift(schema => schema.type === 'object' && schema.format === 'wb-object' && 'wb-object');
        jse.defaults.resolvers.unshift(schema => schema.type === 'object' && schema.format === 'groups' && 'groups');
        jse.defaults.resolvers.unshift(schema => schema.format === 'unknown-device' && 'unknown-device');
        jse.defaults.resolvers.unshift(schema => schema.format === 'wb-optional' && 'wb-optional');
        jse.defaults.resolvers.unshift(schema => schema.type === 'array' && schema.format === 'wb-array' && 'wb-array');

        jse.defaults.editors["select"] = makeSelectWithHiddenItems();
        jse.defaults.editors["inWb"] = makeDisabledEditorWrapper(jse.defaults.editors["integer"]);
        jse.defaults.editors["nmWb"] = makeDisabledEditorWrapper(jse.defaults.editors["number"]);
        jse.defaults.editors["slWb"] = makeDisabledEditorWrapper(jse.defaults.editors["select"]);
        jse.defaults.editors["info"] = makeTranslatedInfoEditor();
        jse.defaults.editors["siWb"] = makeIntegerEditorWithSpecialValue();
        jse.defaults.editors["lazy-tabs"] = makeLazyTabsArrayEditor();
        jse.defaults.editors["roMultiple"] = makeReadonlyOneOfEditor();
        jse.defaults.editors["merge-default"] = makeMergedDefaultValuesEditor();
        jse.defaults.editors["edWb"] = makeEditWithDropdownEditor();
        jse.defaults.editors["collapsible-list"] = makeCollapsibleArrayEditor();
        jse.defaults.editors["wb-multiple"] = makeCollapsibleMultipleEditor();
        jse.defaults.editors["wb-object"] = makeObjectEditorWithButtonsOnTop();
        jse.defaults.editors["unknown-device"] = makeUnknownDeviceEditor();
        jse.defaults.editors["groups"] = makeGroupsEditor();
        jse.defaults.editors["wb-optional"] = makeOptionalEditorWithDropDown();
        jse.defaults.editors["wb-array"] = makeWbArrayEditor();

        jse.defaults.languages.en.error_oneOf = 'One or more parameters are invalid'

        jse.defaults.themes["wb-bootstrap3"] = makeWbBootstrap3Theme();
        jse.defaults.iconlibs["wb-bootstrap3"] = makeWbBootstrap3Iconlib();
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

}).directive('jsonEditor', ['$q', 'JSONEditor', '$locale', 'DumbTemplate', function ($q, JSONEditor, $locale, DumbTemplate) {

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
            scope.isValid = false;

            if (!angular.isString(attrs.schema)) {
                throw new Error('json-editor: schema attribute has to be defined.');
            }

            scope.$watch('schema', function (newValue, oldValue) {
                if (newValue === undefined) {
                    return
                }

                var schema = newValue;
                var startVal = scope.startval;

                if (schema === null) {
                    throw new Error('json-editor: could not resolve schema data.');
                }

                if (scope.editor && angular.equals(newValue, oldValue)) {
                    scope.editor.setValue(startVal)
                    return
                }

                // Commit changes in text fields immediately.
                // FIXME: should make this an option (and perhaps file a pull request for JSONEditor)
                // FIXME: ipv4 input type seems to be an invention of JSONEditor author
                element.on("input", "input[type=text], input[type=ipv4], textarea", function () {
                    var e = document.createEvent("HTMLEvents");
                    e.initEvent("change", false, true);
                    this.dispatchEvent(e);
                });

                var translateFn = function(msg) {
                    var langs = [];
                    if (schema.translations) {
                        langs.push($locale.id);
                        if ($locale.id !== "en") {
                            langs.push("en");
                        }
                    }
                    for (const lang of langs) {
                        if (schema.translations[lang]) {
                            const tr = schema.translations[lang][msg];
                            if (tr !== undefined) {
                                return tr;
                            }
                        }
                    }
                    return msg;
                };

                var options = {
                    startval: startVal,
                    schema: schema,
                    translateProperty: translateFn,
                    template: {
                        compile: function (template) {
                            return DumbTemplate.compile(template, translateFn);
                        }
                    }
                };
                if (scope.options)
                    angular.extend(options, scope.options);
                JSONEditor.defaults.language = $locale.id;
                if (scope.editor) {
                    scope.editor.destroy();
                }
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

}]).name;

export default AngularJsonEditorModule;

function overrideJSONEditor() {
    JSONEditor.defaults.custom_validators.push((schema, value, path) => {
        const errors = [];
        if (   schema.required
            && schema.properties 
            && schema.properties[schema.required[0]] 
            && schema.properties[schema.required[0]].enum
            && (schema.properties[schema.required[0]].enum.length == 1)
            && (   !value.hasOwnProperty(schema.required[0])
                || !(value[schema.required[0]] === schema.properties[schema.required[0]].enum[0]))) {
              throw new Error("Stop object validation");
        }
        return errors;
    });

    
    JSONEditor.defaults.custom_validators.push((schema, value, path) => {
        if (schema.options && schema.options.wb && schema.options.wb.groups && schema.format != "wb-multiple") {
            var paramValues = []
            var paramNames = []
            Object.entries(value).forEach(([k, v]) => {
                paramNames.push(k)
                paramValues.push(v)
            })
            paramNames = paramNames.join(',')
            var checkCondition = function(condition) {
                try {
                    return new Function(paramNames, 'return ' + condition + ';').apply(null, paramValues)
                } catch (e) {
                    return false
                }
            }
            Object.entries(schema.properties).forEach(([key, subSchema]) => {
                if (subSchema.hasOwnProperty('oneOf')) {
                    subSchema.oneOf.forEach(item => {
                        if (item.condition && !checkCondition(item.condition)) {
                            angular.merge(item.options, { wb: { error: 'disabled'}})
                        } else {
                            if (item.options && item.options.wb) {
                                delete item.options.wb.error
                            }
                        }
                    })
                }
            })
        }
        return [];
    });

    JSONEditor.defaults.custom_validators.push((schema, value, path) => {
        const errors = [];
        if (schema.options && schema.options.wb && schema.options.wb.error) {
            errors.push({
                path: path,
                property: 'custom validator',
                message: schema.options.wb.error
              })
        }
        return errors;
    });

    JSONEditor.defaults.languages.ru = JsonEditorRussianTranslation;
}
