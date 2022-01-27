'use strict';

const JsonEditorRussianTranslation = {
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
    error_property_names_maxlength: 'Параметр maxLength у свойства {{0}} должен быть числом',
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

    unknown: 'неизвестно',

    collapse_all: 'Свернуть все элементы',

    unknown_device_warning: 'Шаблон для устройства отсутствует или содержит ошибки'
};

export default JsonEditorRussianTranslation;
