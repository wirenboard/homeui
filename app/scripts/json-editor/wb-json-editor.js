'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';
import JsonEditorRussianTranslation from './json-editor-ru';
import makeLazyTabsArrayEditor from './lazy-tabs-array-editor';
import makeDisabledEditorWrapper from './disabled-editor-wrapper';
import makeTranslatedInfoEditor from './translated-info-editor';
import makeIntegerEditorWithSpecialValue from './integer-editor-with-special-value';
import makeReadonlyOneOfEditor from './readonly-oneof-editor';
import makeMergedDefaultValuesEditor from './merged-default-values-editor';
import makeEditWithDropdownEditor from './edit-with-dropdown';
import makeCollapsibleArrayEditor from './collapsible-array-editor';
import makeCollapsibleMultipleEditor from './collapsible-multiple-editor';
import makeObjectEditorWithButtonsOnTop from './object-editor-with-buttons-on-top';
import makeUnknownDeviceEditor from './unknown-device-editor';
import makeSelectWithHiddenItems from './select-with-hidden-items';
import makeGroupsEditor from './group-editor';
import makeOptionalEditorWithDropDown from './optional-editor-with-dropdown';
import makeWbBootstrap3Theme from './wb-bootstrap3-theme';
import makeWbBootstrap3Iconlib from './wb-bootstrap3-iconlib';
import makeWbArrayEditor from './wb-array-editor';
import { compileTemplate } from '../services/dumbtemplate';

var needOverride = true;

export function createJSONEditor(element, schema, value, locale, root) {
  if (needOverride) {
    overrideJSONEditor();
    needOverride = false;
  }

  // Commit changes in text fields immediately.
  // FIXME: should make this an option (and perhaps file a pull request for JSONEditor)
  // FIXME: ipv4 input type seems to be an invention of JSONEditor author
  element.addEventListener('input', e => {
    if (
      e.type == 'textarea' ||
      (e.type == 'input' && (e.target.type == 'text' || e.target.type == 'ipv4'))
    ) {
      e.target.dispatchEvent(new Event('change'));
    }
  });

  var translateFn = function (msg) {
    var langs = [];
    if (schema.translations) {
      langs.push(locale);
      if (locale !== 'en') {
        langs.push('en');
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
    startval: value,
    schema: schema,
    form_name_root: root || 'root',
    translateProperty: translateFn,
    template: {
      compile: function (template) {
        return compileTemplate(template, translateFn);
      },
    },
  };

  if (schema.strictProps) {
    options.no_additional_properties = true;
  }
  if (schema.limited) {
    options.disable_properties = true;
    options.disable_edit_json = true;
  }

  JSONEditor.defaults.language = locale;

  return new JSONEditor(element, options);
}

function overrideJSONEditor() {
  JSONEditor.defaults.options.show_errors = 'always';
  JSONEditor.defaults.options.iconlib = 'wb-bootstrap3';
  JSONEditor.defaults.options.theme = 'wb-bootstrap3';

  JSONEditor.defaults.custom_validators.push((schema, value, path) => {
    const errors = [];
    if (
      schema.required &&
      schema.properties &&
      schema.properties[schema.required[0]] &&
      schema.properties[schema.required[0]].enum &&
      schema.properties[schema.required[0]].enum.length == 1 &&
      (!value.hasOwnProperty(schema.required[0]) ||
        !(value[schema.required[0]] === schema.properties[schema.required[0]].enum[0]))
    ) {
      throw new Error('Stop object validation');
    }
    return errors;
  });

  JSONEditor.defaults.custom_validators.push((schema, value, path) => {
    if (
      schema.options &&
      schema.options.wb &&
      schema.options.wb.groups &&
      schema.format != 'wb-multiple'
    ) {
      var paramValues = [];
      var paramNames = [];
      Object.entries(value).forEach(([k, v]) => {
        paramNames.push(k);
        paramValues.push(v);
      });
      paramNames = paramNames.join(',');
      var checkCondition = function (condition) {
        try {
          return new Function(paramNames, 'return ' + condition + ';').apply(null, paramValues);
        } catch (e) {
          return false;
        }
      };
      Object.entries(schema.properties).forEach(([key, subSchema]) => {
        if (subSchema.hasOwnProperty('oneOf')) {
          subSchema.oneOf.forEach(item => {
            if (item.condition && !checkCondition(item.condition)) {
              angular.merge(item.options, { wb: { error: 'disabled' } });
            } else {
              if (item.options && item.options.wb) {
                delete item.options.wb.error;
              }
            }
          });
        }
      });
    }
    return [];
  });

  JSONEditor.defaults.custom_validators.push((schema, value, path) => {
    const errors = [];
    if (schema.options && schema.options.wb && schema.options.wb.error) {
      errors.push({
        path: path,
        property: 'custom validator',
        message: schema.options.wb.error,
      });
    }
    return errors;
  });

  JSONEditor.defaults.languages.ru = JsonEditorRussianTranslation;

  JSONEditor.defaults.resolvers.unshift(schema => {
    if (schema.options && schema.options.show_opt_in) {
      switch (schema.type) {
        case 'integer':
          return schema.enum ? 'slWb' : 'inWb';
        case 'number':
          return 'nmWb';
      }
    }
  });
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'integer' && schema.format === 'siWb' && 'siWb'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'string' && schema.format === 'slWb' && 'slWb'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema =>
      (schema.type === 'integer' || schema.type === 'string') && schema.format === 'edWb' && 'edWb'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'array' && schema.format === 'lazy-tabs' && 'lazy-tabs'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'array' && schema.format === 'collapsible-list' && 'collapsible-list'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.oneOf && schema.format === 'roMultiple' && 'roMultiple'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.oneOf && schema.format === 'wb-multiple' && 'wb-multiple'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'object' && schema.format === 'merge-default' && 'merge-default'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'object' && schema.format === 'wb-object' && 'wb-object'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'object' && schema.format === 'groups' && 'groups'
  );
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.format === 'unknown-device' && 'unknown-device'
  );
  JSONEditor.defaults.resolvers.unshift(schema => schema.format === 'wb-optional' && 'wb-optional');
  JSONEditor.defaults.resolvers.unshift(
    schema => schema.type === 'array' && schema.format === 'wb-array' && 'wb-array'
  );

  JSONEditor.defaults.editors['select'] = makeSelectWithHiddenItems();
  JSONEditor.defaults.editors['inWb'] = makeDisabledEditorWrapper(
    JSONEditor.defaults.editors['integer']
  );
  JSONEditor.defaults.editors['nmWb'] = makeDisabledEditorWrapper(
    JSONEditor.defaults.editors['number']
  );
  JSONEditor.defaults.editors['slWb'] = makeDisabledEditorWrapper(
    JSONEditor.defaults.editors['select']
  );
  JSONEditor.defaults.editors['info'] = makeTranslatedInfoEditor();
  JSONEditor.defaults.editors['siWb'] = makeIntegerEditorWithSpecialValue();
  JSONEditor.defaults.editors['lazy-tabs'] = makeLazyTabsArrayEditor();
  JSONEditor.defaults.editors['roMultiple'] = makeReadonlyOneOfEditor();
  JSONEditor.defaults.editors['merge-default'] = makeMergedDefaultValuesEditor();
  JSONEditor.defaults.editors['edWb'] = makeEditWithDropdownEditor();
  JSONEditor.defaults.editors['collapsible-list'] = makeCollapsibleArrayEditor();
  JSONEditor.defaults.editors['wb-multiple'] = makeCollapsibleMultipleEditor();
  JSONEditor.defaults.editors['wb-object'] = makeObjectEditorWithButtonsOnTop();
  JSONEditor.defaults.editors['unknown-device'] = makeUnknownDeviceEditor();
  JSONEditor.defaults.editors['groups'] = makeGroupsEditor();
  JSONEditor.defaults.editors['wb-optional'] = makeOptionalEditorWithDropDown();
  JSONEditor.defaults.editors['wb-array'] = makeWbArrayEditor();

  JSONEditor.defaults.languages.en.error_oneOf = 'One or more parameters are invalid';

  JSONEditor.defaults.themes['wb-bootstrap3'] = makeWbBootstrap3Theme();
  JSONEditor.defaults.iconlibs['wb-bootstrap3'] = makeWbBootstrap3Iconlib();
}
