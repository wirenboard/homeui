'use strict';

import { BooleanStore } from './booleanStore';
import { FormStore } from './formStore';
import { NumberStore } from './numberStore';
import { StringStore } from './stringStore';
import { ArrayStore } from './arrayStore';
import { OneOfStore } from './oneOfStore';
import { OptionsStore } from './optionsStore';

class Translator {
  constructor(translations, lang) {
    this.translations = translations || {};
    this.lang = lang;
  }

  find(key) {
    return this.translations?.[this.lang]?.[key] || this.translations?.['en']?.[key] || key;
  }
}

function matchRequired(required, value) {
  const keys = Object.keys(value);
  return required.every(key => keys.includes(key));
}

function getRealSchema(schema, definitions) {
  if (schema?.$ref) {
    const ref = schema.$ref.replace('#/definitions/', '');
    return definitions[ref];
  }
  return schema;
}

function makeBooleanStore(schema, translator) {
  return new BooleanStore({
    name: translator.find(schema?.title),
    value: schema?.default || false,
  });
}

function makeOptionsStore(schema, translator) {
  const titlesSource = schema?.options?.enum_titles || schema?.enum;
  const optionsTitles = titlesSource.map(value => translator.find(value));
  return new OptionsStore({
    name: translator.find(schema?.title),
    options: schema?.enum.map((value, index) => ({
      value: value,
      label: optionsTitles[index] || value,
    })),
    value: schema?.default,
  });
}

function makeStringStore(schema, translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  return new StringStore({
    name: translator.find(schema?.title),
    description: translator.find(schema?.description),
    value: schema?.default,
    placeholder: translator.find(schema?.options?.inputAttributes?.placeholder),
    readOnly: schema?.readOnly,
  });
}

function makeIntegerStore(schema, translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  return new NumberStore({
    type: 'integer',
    name: translator.find(schema?.title),
    description: translator.find(schema?.description),
    min: schema?.minimum,
    max: schema?.maximum,
    value: schema?.default,
    strict: true,
  });
}

function makeNumberStore(schema, translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  return new NumberStore({
    name: translator.find(schema?.title),
    description: translator.find(schema?.description),
    min: schema?.minimum,
    max: schema?.maximum,
    value: schema?.default,
    strict: true,
  });
}

function comparePropertyOrder([key1, schema1], [key2, schema2]) {
  const order1 = schema1?.propertyOrder || 10000;
  const order2 = schema2?.propertyOrder || 10000;
  if (order1 === order2) {
    return key1.localeCompare(key2);
  }
  return order1 - order2;
}

function makeObjectStore(schema, translator, definitions) {
  if (schema?.properties === undefined) {
    return undefined;
  }
  let store = new FormStore(translator.find(schema?.title));
  Object.entries(schema.properties)
    .sort(comparePropertyOrder)
    .forEach(([key, value]) => {
      store.add(key, createStore(value, translator, definitions));
    });
  return store;
}

function makeArrayStore(schema, translator, definitions) {
  if (schema?.items === undefined || typeof schema.items !== 'object') {
    return undefined;
  }
  const itemSchema = getRealSchema(schema.items, definitions);
  const headers = Object.entries(itemSchema?.properties || {})
    .sort(comparePropertyOrder)
    .map(([key, value]) => translator.find(value.title));
  return new ArrayStore(translator.find(schema?.title), headers, () =>
    createStore(itemSchema, translator, definitions)
  );
}

function makeOneOfStore(schema, translator, definitions) {
  if (!Array.isArray(schema.oneOf) || schema.oneOf.length == 0) {
    return undefined;
  }
  let store = new OneOfStore(translator.find(schema?.title));
  schema.oneOf.forEach(item => {
    const itemSchema = getRealSchema(item, definitions);
    const itemStore = createStore(itemSchema, translator, definitions);
    store.add(itemStore, value => matchRequired(itemSchema?.required || [], value));
  });
  return store;
}

function createStore(schema, translator, definitions) {
  definitions = definitions || schema?.definitions;
  if (schema?.$ref) {
    return createStore(getRealSchema(schema, definitions), translator, definitions);
  }
  let type = schema.type;
  if (schema?.oneOf) {
    type = 'oneOf';
  }
  type = type || 'object';
  const makeFns = {
    boolean: makeBooleanStore,
    string: makeStringStore,
    integer: makeIntegerStore,
    number: makeNumberStore,
    object: makeObjectStore,
    array: makeArrayStore,
    oneOf: makeOneOfStore,
  };
  let store = makeFns?.[type]?.(schema, translator, definitions);
  if (store !== undefined) {
    store.setFormColumns?.(schema?.options?.grid_columns);
  }
  return store;
}

export function makeParameterStoreFromJsonSchema(schema, lang) {
  const translator = new Translator(schema?.translations, lang);
  return createStore(schema, translator);
}
