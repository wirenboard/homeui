// Based off 0.1.8 version of https://github.com/rodikh/angular-json-editor
// This version does actually call onChange handler

'use strict';

import angular from "angular";
import {JSONEditor} from "@json-editor/json-editor";

const AngularJsonEditorModule = angular.module('angular-json-editor', []).provider('JSONEditor', function () {
    var configuration = {
        defaults: {
            options: {
                show_errors: "always",
                iconlib: 'bootstrap3',
                theme: 'bootstrap3'
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
        jse.defaults.resolvers.unshift(schema => schema.type === 'array' && schema.format === 'tabs' && 'lazy-tabs');
        jse.defaults.resolvers.unshift(schema => schema.oneOf && schema.format === 'roMultiple' && 'roMultiple');
        jse.defaults.resolvers.unshift(schema => schema.type === 'object' && schema.format === 'merge-default' && 'merge-default');

        jse.defaults.editors["inWb"] = makeDisabledEditorWrapper(jse.defaults.editors["integer"]);
        jse.defaults.editors["nmWb"] = makeDisabledEditorWrapper(jse.defaults.editors["number"]);
        jse.defaults.editors["slWb"] = makeDisabledEditorWrapper(jse.defaults.editors["select"]);
        jse.defaults.editors["info"] = makeTranslatedInfoEditor();
        jse.defaults.editors["siWb"] = makeIntegerEditorWithSpecialValue(jse.defaults.editors["integer"]);
        jse.defaults.editors["lazy-tabs"] = makeLazyTabsArrayEditor(jse.defaults.editors["array"]);
        jse.defaults.editors["roMultiple"] = makeReadonlyOneOfEditor(jse.defaults.editors["multiple"]);
        jse.defaults.editors["merge-default"] = makeMergedDefaultValuesEditor(jse.defaults.editors["object"]);
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
        error_notempty: 'Введите значение',
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
        error_minProperties: 'Объект должен содержать не менее {{0}} свойств',
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
        error_ipv4: 'Задайте IP-адрес в формате IPv4, например 192.168.0.1',
        /**
        * When an IPv6 is in incorrect format
        */
        error_ipv6: 'Задайте IP-адрес в формате IPv6',
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
        properties: 'свойства',
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
          this.input.setAttribute('size', this.input.value.length);
        }
    }
}

// The editor is used for poll_interval setting of a channel.
// poll_interval is edited in table's cell.
// We want to show empty editors for poll_intervals that are not set, but
// json-editor sets default values to properties in tables cells.
// -1 is used as a default value to mark that poll_interval is not set.
// The editor handles the special case and shows an empty edit
function makeIntegerEditorWithSpecialValue (Base) {
    return class extends Base {
        build() {
            super.build();
            if (this.input) {
                this.input.setAttribute('size', this.input.getAttribute('placeholder').length);
            }
        }

        setValue (value) {
            if (value != -1) {
                super.setValue(value);
            }
        }

        getValue () {
            if (!(this.input && this.input.value)) {
              return undefined;
            }
            return super.getValue();
        }
    }
}

function makeLazyTabsArrayEditor (Base) {
    return class extends Base {

        unregister () {
            if (this.jsoneditor) {
                this.jsoneditor.unregisterEditor(this)
            }
            if (this.rows) {
                this.rows.forEach(row => row && row.has_editor && row.unregister())
            }
        }

        register () {
            this.jsoneditor.registerEditor(this)
            this.onChange()
            if (this.rows) {
                this.rows.forEach(row => row && row.has_editor && row.register())
            }
        }

        enable () {
            if (!this.always_disabled) {
                this.setAvailability(this, false)
          
                if (this.rows) {
                  this.rows.forEach(row => {
                    if (row.has_editor) {
                        row.enable()
                        this.setAvailability(row, false)
                    }
                  })
                }
                this.disabled = false
              }
        }

        disable (alwaysDisabled) {
            if (alwaysDisabled) this.always_disabled = true
            this.setAvailability(this, true)
        
            if (this.rows) {
              this.rows.forEach(row => {
                  if (row.has_editor) {
                      row.disable(alwaysDisabled)
                      this.setAvailability(row, true)
                  }
              })
            }
            this.disabled = true
        }

        preBuild () {
            this.valueToSet = []
            super.preBuild()
        }

        build () {
            this.schema.format = 'tabs'
            super.build()
        }

        destroyRow (row, hard) {
            if (!row) {
                return
            }
            const holder = row.container
            if (hard) {
                if (row.has_editor) {
                    row.destroy()
                    if (holder.parentNode) holder.parentNode.removeChild(holder)
                }
                if (this.checkParent(row.tab)) row.tab.parentNode.removeChild(row.tab)
            } else {
                if (row.tab) row.tab.style.display = 'none'
                if (row.has_editor) {
                    row.unregister()
                    holder.style.display = 'none'
                }
            }
        }

        refreshTabs (refreshHeaders) {
            this.rows.forEach((row, i) => {
                if (!row.tab) {
                    return
                }

                if (!row.has_editor) {
                    if (refreshHeaders) {
                        this.updateTabTextContent(i, this.valueToSet[i]);
                    }
                    return
                }

                if (refreshHeaders) {
                    row.tab_text.textContent = row.getHeaderText()
                } else if (row.tab === this.active_tab) {
                    this.theme.markTabActive(row)
                } else {
                    this.theme.markTabInactive(row)
                }
            })
        }

        setValue (value = [], initial) {
            value = this.ensureArraySize(value)
            const serialized = JSON.stringify(value)
            if (serialized === this.serialized) return
            this.valueToSet = value
            value.forEach((val, i) => {
                if (this.rows[i]) {
                    if (this.rows[i].has_editor) {
                        this.rows[i].setValue(val, initial)
                    }
                } else {
                    const editor = this.addRow(val, initial)
                    this.jsoneditor.trigger('addRow', editor)
                }
            })
            for (let j = value.length; j < this.rows.length; j++) {
                this.destroyRow(this.rows[j])
                this.rows[j] = null
            }
            this.rows = this.rows.slice(0, value.length)
            
            /* Set the active tab */
            const row = this.rows.find(row => row.tab === this.active_tab)
            let newActiveTab = typeof row !== 'undefined' ? row.tab : null
            if (!newActiveTab && this.rows.length) newActiveTab = this.rows[0].tab
            this.active_tab = newActiveTab
            this.refreshValue(true)
            this.refreshTabs(true)
            this.refreshTabs()
            this.onChange()
        }

        refreshValue (force) {
            const oldi = this.value ? this.value.length : 0
            
            /* Get the value for this editor */
            this.value = (this.valueToSet || []).map(i => i);
            this.rows.forEach((row, i) => {
                if (row.has_editor) {
                    this.value[i] = row.getValue()
                }
            })

            if (oldi !== this.value.length || force) {
              /* If we currently have minItems items in the array */
              const minItems = this.schema.minItems && this.schema.minItems >= this.rows.length
        
              this.rows.forEach((editor, i) => {
                if (editor.has_editor) {
                    /* Hide the move down button for the last row */
                    if (editor.movedown_button) {
                      const display = (i !== this.rows.length - 1)
                      this.setVisibility(editor.movedown_button, display)
                    }
            
                    /* Hide the delete button if we have minItems items */
                    if (editor.delete_button) {
                      this.setVisibility(editor.delete_button, !minItems)
                    }
                }
              })
              if (!this.collapsed && this.setupButtons(minItems)) {
                this.controls.style.display = 'inline-block'
              } else {
                this.controls.style.display = 'none'
              }
            }
            this.serialized = JSON.stringify(this.value)
        }

        reallyAddRow(i, value, initial) {
            var tab_text = this.rows[i].tab_text
            var tab = this.rows[i].tab
            this.rows[i] = this.getElementEditor(i)
            this.row_cache[i] = this.rows[i]
            this.rows[i].tab = tab
            this.rows[i].tab_text = tab_text
            this.rows[i].register()
            if (typeof value !== 'undefined') {
                this.rows[i].setValue(value, initial)
            }
            this.rows[i].has_editor = true

            if (!this.rows[i].title_controls) {
                this.rows[i].array_controls = this.theme.getButtonHolder()
                if (!this.hide_delete_buttons || this.show_copy_button || !this.hide_move_buttons) {
                    this.rows[i].container.appendChild(this.rows[i].array_controls)
                }
            }

            const controlsHolder = this.rows[i].title_controls || this.rows[i].array_controls

            /* Buttons to delete row, move row up, and move row down */
            if (!this.hide_delete_buttons) {
                this.rows[i].delete_button = this._createDeleteButton(i, controlsHolder)
            }

            /* Button to copy an array element and add it as last element */
            if (this.show_copy_button) {
                this.rows[i].copy_button = this._createCopyButton(i, controlsHolder)
            }

            if (i && !this.hide_move_buttons) {
                this.rows[i].moveup_button = this._createMoveUpButton(i, controlsHolder)
            }

            if (!this.hide_move_buttons) {
                this.rows[i].movedown_button = this._createMoveDownButton(i, controlsHolder)
            }
        }

        updateTabTextContent(i, value) {
            var schema = this.getItemSchema(i)
            schema = this.jsoneditor.expandRefs(schema)
            if (schema.headerTemplate) {
                var header_template = this.jsoneditor.compileTemplate(this.translateProperty(schema.headerTemplate), this.template_engine)
                this.rows[i].tab_text.textContent = header_template({self:value, i0: i, i1: i + 1});
            } else {
                this.rows[i].tab_text.textContent = 'tab';
            }
        }

        addRow (value, initial, force) {
            const i = this.rows.length
            this.rows[i] = {}
            if (i == 0 || force) {
                this.reallyAddRow(i, value, initial)
            }
            this.rows[i].tab_text = document.createElement('span')
            this.updateTabTextContent(i, value)
            this.rows[i].path = `${this.path}.${i}`
            this.rows[i].tab = this.theme.getTab(this.rows[i].tab_text, this.getValidId(this.rows[i].path))
            this.theme.addTab(this.tabs_holder, this.rows[i].tab)
            this.rows[i].tab.addEventListener('click', (e) => {
                if (!this.rows[i].has_editor) {
                    this.reallyAddRow(i, this.valueToSet[i], true)
                }
                this.active_tab = this.rows[i].tab
                this.refreshTabs(true)
                this.refreshTabs()
                e.preventDefault()
                e.stopPropagation()
            })
            return this.rows[i]
        }

        _createAddRowButton () {
            const button = this.getButton(this.getItemTitle(), 'add', 'button_add_row_title', [this.getItemTitle()])
            button.classList.add('json-editor-btntype-add')
            button.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                const i = this.rows.length
                let editor
                if (this.row_cache[i]) {
                    editor = this.rows[i] = this.row_cache[i]
                    this.rows[i].setValue(this.rows[i].getDefault(), true)
                    this.rows[i].container.style.display = ''
                    if (this.rows[i].tab) this.rows[i].tab.style.display = ''
                        this.rows[i].register()
                } else {
                    editor = this.addRow([], true, true)
                }
                this.active_tab = this.rows[i].tab
                this.refreshTabs(true)
                this.refreshTabs()
                this.refreshValue()
                this.onChange(true)
                this.jsoneditor.trigger('addRow', editor)
            })
            this.controls.appendChild(button)
            return button
        }

        _createMoveButton(i, holder, name, title, step) {
            const button = this.getButton('', name, title)
            button.classList.add(name, 'json-editor-btntype-move')
            button.setAttribute('data-i', i)
            button.addEventListener('click', e => {
                e.preventDefault()
                e.stopPropagation()
                const i = e.currentTarget.getAttribute('data-i') * 1

                const rows = this.getValue()
                if (step == 0 || (step < 0 && i <= 0) || (step > 0 && i >= rows.length - 1)) return
                const newIndex = i + step
                const tmp = rows[newIndex]
                rows[newIndex] = rows[i]
                rows[i] = tmp

                this.setValue(rows)
                this.active_tab = this.rows[newIndex].tab
                if (!this.rows[newIndex].has_editor) {
                    this.reallyAddRow(newIndex, rows[newIndex], true)
                    this.refreshTabs(true)
                }
                this.refreshTabs()
                this.onChange(true)
                this.jsoneditor.trigger('moveRow', this.rows[newIndex])
            })
        
            if (holder) {
                holder.appendChild(button)
            }
            return button
        }

        _createMoveUpButton (i, holder) {
            return this._createMoveButton(i, holder, 'moveup', 'button_move_up_title', -1);
        }

        _createMoveDownButton (i, holder) {
            return this._createMoveButton(i, holder, 'movedown', 'button_move_down_title', 1);
        }

        _createDeleteButton (i, holder) {
            const button = this.getButton(this.getItemTitle(), 'delete', 'button_delete_row_title', [this.getItemTitle()])
            button.classList.add('delete', 'json-editor-btntype-delete')
            button.setAttribute('data-i', i)
            button.addEventListener('click', e => {
                e.preventDefault()
                e.stopPropagation()

                if (!this.askConfirmation()) {
                    return false
                }

                const i = e.currentTarget.getAttribute('data-i') * 1
                const newval = this.getValue().filter((row, j) => j !== i)
                const editor = this.rows[i]

                var newTabIndex = -1
                if (this.rows[i]) {
                    newTabIndex = i
                } else if (this.rows[i - 1]) {
                    newTabIndex = i - 1
                }

                if (newTabIndex >= 0) {
                    this.active_tab = this.rows[newTabIndex].tab
                    if (!this.rows[newTabIndex].has_editor) {
                        this.reallyAddRow(newTabIndex, this.valueToSet[newTabIndex], true)
                    }
                    this.refreshTabs(true)
                    this.refreshTabs()
                }
                this.setValue(newval)
                this.onChange(true)
                this.jsoneditor.trigger('deleteRow', editor)
            })
        
            if (holder) {
                holder.appendChild(button)
            }
            return button
        }

        showValidationErrors (errors) {
            /* Get all the errors that pertain to this editor */
            const myErrors = []
            const otherErrors = []
            errors.forEach(error => {
                if (error.path === this.path) {
                    myErrors.push(error)
                } else {
                    otherErrors.push(error)
                }
            })

            /* Show errors for this editor */
            if (this.error_holder) {
                if (myErrors.length) {
                    this.error_holder.innerHTML = ''
                    this.error_holder.style.display = ''
                    myErrors.forEach(error => {
                    this.error_holder.appendChild(this.theme.getErrorMessage(error.message))
                    })
                    /* Hide error area */
                } else {
                    this.error_holder.style.display = 'none'
                }
            }

            /* Show errors for child editors */
            this.rows.forEach(row =>
                row.has_editor && row.showValidationErrors(otherErrors)
            )
        }
    }
}

// The editor is derived from multiple editor.
// It is used with oneOf nodes when changing of type is prohibited
function makeReadonlyOneOfEditor (Base) {
    return class extends Base {
        build() {
            super.build();
            this.switcher.style.display = 'none';
            this.header.style.display = 'none';
        }

        switchEditor(i) {
            // Remove previous editor from DOM
            if (this.type) {
                this.editor_holder.removeChild(this.editor_holder.childNodes[0]);
                this.editors[this.type] = null;
            }

            super.switchEditor(i)

            if (this.editors[i].header) {
                this.editors[i].header.style.display = ''
            }

            if (this.editors[i].schema.options && this.editors[i].schema.options.wb && this.editors[i].schema.options.wb.controls_on_top) {
                this.title_controls = this.editors[i].controls;
            } else {
                this.title_controls = undefined;
            }
        }
    }
}

// The editor merges default value to a value passed to setValue function
// and also removes all default values from result.
// It can be used to show editors for all possible object's properties even if they are not set.
function makeMergedDefaultValuesEditor (Base) {
    return class extends Base {

        setValue (value, initial) {
            value = angular.merge(this.getDefault(), value)
            super.setValue(value, initial)
        }

        getValue() {
            var subtractValue = function (v1, v2) {
                if (!angular.isObject(v1) || !angular.isObject(v2)) {
                    return
                }
                Object.entries(v2).forEach(([k, v]) => {
                    if (v1.hasOwnProperty(k)) {
                        if (v1[k] === v) {
                            delete v1[k];
                        } else {
                            subtractValue(v1[k], v);
                            if (angular.isObject(v1[k]) && Object.keys(v1[k]).length == 0) {
                                delete v1[k]
                            }
                        }
                    }
                });
            };
            var value = super.getValue();
            subtractValue(value, this.getDefault());
            return value;
        }
    }
}
