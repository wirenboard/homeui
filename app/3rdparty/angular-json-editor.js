// Based off 0.1.8 version of https://github.com/rodikh/angular-json-editor
// This version does actually call onChange handler

'use strict';

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

    this.$get = ['$locale', function ($locale) {
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
        jse.defaults.editors["inWb"] = makeDisabledEditorWrapper(jse.defaults.editors["integer"]);
        jse.defaults.editors["nmWb"] = makeDisabledEditorWrapper(jse.defaults.editors["number"]);
        jse.defaults.editors["slWb"] = makeDisabledEditorWrapper(jse.defaults.editors["select"]);
        jse.defaults.editors["info"] = makeTranslatedInfoEditor();
        jse.defaults.language = $locale.id;
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

}).directive('jsonEditor', ['$q', 'JSONEditor', '$locale', function ($q, JSONEditor, $locale) {

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
                    schema: schema,
                    translateProperty: function(msg) {
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
                    }
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

    JSONEditor.defaults.languages.ru = {
        /**
         * When a property is not set
         */
        error_notset: 'Свойство должно быть задано',
        /**
        * When a string must not be empty
        */
        error_notempty: 'Необходимо задать значение',
        /**
        * When a value is not one of the enumerated values
        */
        error_enum: 'Значение должно соответствовать одному из списка',
        /**
        * When a value is not equal to the constant
        */
        error_const: 'Значение должно быть равно константе',
        /**
        * When a value doesn't validate any schema of a 'anyOf' combination
        */
        error_anyOf: 'Значение должно соответствовать одной из заданных схем',
        /**
        * When a value doesn't validate
        * @variables This key takes one variable: The number of schemas the value does not validate
        */
        error_oneOf: 'Значение должно соответствовать только одной заданной схеме. Сейчас оно соответствует {{0}} схемам.',
        /**
        * When a value does not validate a 'not' schema
        */
        error_not: 'Значение не должно соответствовать схеме',
        /**
        * When a value does not match any of the provided types
        */
        error_type_union: 'Значение должно быть одного из заданных типов',
        /**
        * When a value does not match the given type
        * @variables This key takes one variable: The type the value should be of
        */
        error_type: 'Тип значения должен быть {{0}}',
        /**
        *  When the value validates one of the disallowed types
        */
        error_disallow_union: 'Значение не должно соответствовать ни одному из запрещённых типов',
        /**
        *  When the value validates a disallowed type
        * @variables This key takes one variable: The type the value should not be of
        */
        error_disallow: 'Тип значения не должен быть {{0}}',
        /**
        * When a value is not a multiple of or divisible by a given number
        * @variables This key takes one variable: The number mentioned above
        */
        error_multipleOf: 'Значение должно быть кратно {{0}}',
        /**
        * When a value is greater than it's supposed to be (exclusive)
        * @variables This key takes one variable: The maximum
        */
        error_maximum_excl: 'Значение должно быть меньше {{0}}',
        /**
        * When a value is greater than it's supposed to be (inclusive
        * @variables This key takes one variable: The maximum
        */
        error_maximum_incl: 'Значение должно быть не больше {{0}}',
        /**
        * When a value is lesser than it's supposed to be (exclusive)
        * @variables This key takes one variable: The minimum
        */
        error_minimum_excl: 'Значение должно быть больше {{0}}',
        /**
        * When a value is lesser than it's supposed to be (inclusive)
        * @variables This key takes one variable: The minimum
        */
        error_minimum_incl: 'Значение должно быть не меньше {{0}}',
        /**
        * When a value have too many characters
        * @variables This key takes one variable: The maximum character count
        */
        error_maxLength: 'Значение должно содержать не более {{0}} символов',
        /**
        * When a value does not have enough characters
        * @variables This key takes one variable: The minimum character count
        */
        error_minLength: 'Значение должно содержать не менее {{0}} символов',
        /**
        * When a value does not match a given pattern
        */
        error_pattern: 'Значение должно соответствовать шаблону {{0}}',
        /**
        * When an array has additional items whereas it is not supposed to
        */
        error_additionalItems: 'Массив не может содержать дополнительных значений',
        /**
        * When there are to many items in an array
        * @variables This key takes one variable: The maximum item count
        */
        error_maxItems: 'В массиве должно быть не более {{0}} элементов',
        /**
        * When there are not enough items in an array
        * @variables This key takes one variable: The minimum item count
        */
        error_minItems: 'В массиве должно быть не менее {{0}} элементов',
        /**
        * When an array is supposed to have unique items but has duplicates
        */
        error_uniqueItems: 'Все элементы массива должны быть уникальными',
        /**
        * When there are too many properties in an object
        * @variables This key takes one variable: The maximum property count
        */
        error_maxProperties: 'Объект может содержать не более {{0}} свойств',
        /**
        * When there are not enough properties in an object
        * @variables This key takes one variable: The minimum property count
        */
        error_minProperties: 'Объект должне содерзать не менее {{0}} свойств',
        /**
        * When a required property is not defined
        * @variables This key takes one variable: The name of the missing property
        */
        error_required: "Объект не содержит обязательное свойство '{{0}}'",
        /**
        * When there is an additional property is set whereas there should be none
        * @variables This key takes one variable: The name of the additional property
        */
        error_additional_properties: 'Объект не должен содержать дополнительных свойств, но {{0}} задан',
        /**
        * When there is a propertyName that sets a max length and a property name exceeds the max length
        * @variables This key takes one variable: The name of the invalid property
        */
        error_property_names_exceeds_maxlength: 'Имя свойства {{0}} превышает максимальную длину',
        /**
        * When there is a propertyName that sets an enum and a property name matches none of the possible enum
        * @variables This key takes one variable: The name of the invalid property
        */
        error_property_names_enum_mismatch: 'Имя свойства {{0}} не соответствует ни одному допустимому значению',
        /**
        * When there is a propertyName that sets a const and a property does not match the const value
        * @variables This key takes one variable: The name of the invalid property
        */
        error_property_names_const_mismatch: 'Имя свойства {{0}} должно быть фиксированным',
        /**
        * When there is a propertyName that sets a pattern and a property name does not match the pattern
        * @variables This key takes one variable: The name of the invalid property
        */
        error_property_names_pattern_mismatch: 'Имя свойства {{0}} не соответствует шаблону',
        /**
        * When the propertyName is set to false and there is at least one property
        * @variables This key takes one variable: The name of the invalid property
        */
        error_property_names_false: 'Некорректная максимальная длина имени свойства {{0}}',
        /**
        * When the propertyName specifies a maxLength that is not a number
        * @variables This key takes one variable: The name of the current property
        */
        error_property_names_maxlength: 'Property name {{0}} cannot match invalid maxLength',
        /**
        * When the propertyName specifies an enum that is not an array
        * @variables This key takes one variable: The name of the current property
        */
        error_property_names_enum: 'Некорректный список возможных имён свойства {{0}}',
        /**
        * When the propertyName specifies a pattern that is not a string
        * @variables This key takes one variable: The name of the current property
        */
        error_property_names_pattern: 'Некорректный шаблон имени свойства {{0}}',
        /**
        * When the propertyName is unsupported
        * @variables This key takes one variable: The name of the invalid propertyName
        */
        error_property_names_unsupported: 'Неподдерживаемое название свойства {{0}}',
        /**
        * When a dependency is not resolved
        * @variables This key takes one variable: The name of the missing property for the dependency
        */
        error_dependency: 'Должно быть задано свойство {{0}}',
        /**
        * When a date is in incorrect format
        * @variables This key takes one variable: The valid format
        */
        error_date: 'Дата должны иметь формат {{0}}',
        /**
        * When a time is in incorrect format
        * @variables This key takes one variable: The valid format
        */
        error_time: 'Время должно иметь формат {{0}}',
        /**
        * When a datetime-local is in incorrect format
        * @variables This key takes one variable: The valid format
        */
        error_datetime_local: 'Дата и время должны иметь формат {{0}}',
        /**
        * When a integer date is less than 1 January 1970
        */
        error_invalid_epoch: 'Дата должна быть позднее 1 Января 1970',
        /**
        * When an IPv4 is in incorrect format
        */
        error_ipv4: 'Необходимо задать корректный адрес IPv4 в виде 4 чисел, разделённых точкой',
        /**
        * When an IPv6 is in incorrect format
        */
        error_ipv6: 'Необходимо задать корректный адрес IPv6',
        /**
        * When a hostname is in incorrect format
        */
        error_hostname: 'Имя сервера задано в неверном формате',
        /**
        * Text/Title on Save button
        */
        button_save: 'Сохранить',
        /**
        * Text/Title on Copy button
        */
        button_copy: 'Скопировать',
        /**
        * Text/Title on Cancel button
        */
        button_cancel: 'Отменить',
        /**
        * Text/Title on Add button
        */
        button_add: 'Добавить',
        /**
        * Text on Delete All buttons
        */
        button_delete_all: 'Все',
        /**
        * Title on Delete All buttons
        */
        button_delete_all_title: 'Удалить все',
        /**
        * Text on Delete Last buttons
        * @variable This key takes one variable: The title of object to delete
        */
        button_delete_last: 'Последний {{0}}',
        /**
        * Title on Delete Last buttons
        * @variable This key takes one variable: The title of object to delete
        */
        button_delete_last_title: 'Удалить последний {{0}}',
        /**
        * Title on Add Row buttons
        * @variable This key takes one variable: The title of object to add
        */
        button_add_row_title: 'Добавить {{0}}',
        /**
        * Title on Move Down buttons
        */
        button_move_down_title: 'Опустить',
        /**
        * Title on Move Up buttons
        */
        button_move_up_title: 'Поднять',
        /**
        * Text on Object Properties buttons
        */
        properties: 'cвойства',
        property_name_placeholder: 'Название свойства...',
        duplicate_property_error: 'Свойство с таким названием уже задано',
        /**
        * Text on Object Properties buttons
        */
        edit_properties: 'Свойства',
        /**
        * Title on Object Properties buttons
        */
        button_object_properties: 'Свойства объекта',
        /**
        * Title on Copy Row button
        * @variable This key takes one variable: The title of object to delete
        */
        button_copy_row_title: 'Скопировать {{0}}',
        /**
        * Title on Delete Row buttons
        * @variable This key takes one variable: The title of object to delete
        */
        button_delete_row_title: 'Удалить {{0}}',
        /**
        * Title on Delete Row buttons, short version (no parameter with the object title)
        */
        button_delete_row_title_short: 'Удалить',
        /**
        * Title on Copy Row buttons, short version (no parameter with the object title)
        */
        button_copy_row_title_short: 'Скопировать',
        /**
        * Title on Collapse buttons
        */
        button_collapse: 'Свернуть',
        /**
        * Title on Expand buttons
        */
        button_expand: 'Развернуть',
        /**
        * Title on Edit JSON buttons
        */
        button_edit_json: 'Редактировать JSON',
        /**
        * Text/Title on Upload buttons
        */
        button_upload: 'Загрузить',
        /**
        * Title on Flatpickr toggle buttons
        */
        flatpickr_toggle_button: 'Переключить',
        /**
        * Title on Flatpickr clear buttons
        */
        flatpickr_clear_button: 'Очистить',
        /**
        * Choices input field placeholder text
        */
        choices_placeholder_text: 'Укажите значение',
        /**
        * Default title for array items
        */
        default_array_item_title: 'элемент',
        /**
        * Warning when deleting a node
        */
        button_delete_node_warning: 'Вы уверены, что хотите удалить этот элемент?',

        unknown: 'неизвестно'
      };
}

function makeDisabledEditorWrapper (Base) {
    return class extends Base {
      build () {
        super.build()
        this.disabledEditor = this.theme.getFormInputField(this.input_type)
        this.disabledEditor.style.display = 'none'
        this.disabledEditor.disabled = true
        this.disabledEditor.value = this.translate('unknown')
        this.control.insertBefore(this.disabledEditor, this.description)
      }
  
      enable () {
        this.input.style.display = ''
        this.disabledEditor.style.display = 'none'
        super.enable()
      }
  
      disable (alwaysDisabled) {
        super.disable(alwaysDisabled)
        this.input.style.display = 'none'
        this.disabledEditor.style.display = ''
      }
    }
  }

  function makeTranslatedInfoEditor () {
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
          super(options, defaults)
        }

        build () {
          this.input = this.theme.getFormInputField("text")
          this.input.disabled = true
          this.container.appendChild(this.input)
        }

        setValue (value) {
          this.input.value = this.translateProperty(value);
        }
    }
}
