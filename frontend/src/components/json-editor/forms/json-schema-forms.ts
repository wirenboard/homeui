import i18n from '@/i18n/config';
import { Translator } from '@/stores/json-schema-editor';
import { ArrayStore } from './array-store';
import { BooleanStore } from './boolean-store';
import { FormStore } from './form-store';
import { NumberStore } from './number-store';
import { OneOfStore } from './one-of-store';
import { OptionsStore } from './options-store';
import { StringStore } from './string-store';
import { makeMinLengthValidator } from './string-validators';

function matchRequired(required: string[], value: Record<string, any>) {
  const keys = Object.keys(value);
  return required.every((key) => keys.includes(key));
}

function getRealSchema(schema, definitions) {
  if (schema?.$ref) {
    const ref = schema.$ref.replace('#/definitions/', '');
    return definitions[ref];
  }
  return schema;
}

function makeBooleanStore(schema, translator: Translator) {
  return new BooleanStore({
    name: translator.find(schema?.title, i18n.language),
    value: schema?.default || false,
  });
}

function makeOptionsStore(schema, translator: Translator) {
  const titlesSource = schema?.options?.enum_titles || schema?.enum;
  const optionsTitles = titlesSource.map((value) => translator.find(value, i18n.language));
  return new OptionsStore({
    name: translator.find(schema?.title, i18n.language),
    options: schema?.enum.map((value, index) => ({
      value: value,
      label: optionsTitles[index] || value,
    })),
    value: schema?.default,
  });
}

function makeStringStore(schema, translator: Translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  let validator;
  if (schema?.minLength) {
    validator = makeMinLengthValidator(schema.minLength);
  }
  return new StringStore({
    name: translator.find(schema?.title, i18n.language),
    description: translator.find(schema?.description, i18n.language),
    value: schema?.default,
    placeholder: translator.find(schema?.options?.inputAttributes?.placeholder, i18n.language),
    readOnly: schema?.readOnly,
    validator: validator,
  });
}

function makeIntegerStore(schema, translator: Translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  return new NumberStore({
    type: 'integer',
    name: translator.find(schema?.title, i18n.language),
    description: translator.find(schema?.description, i18n.language),
    min: schema?.minimum,
    max: schema?.maximum,
    value: schema?.default,
    strict: true,
  });
}

function makeNumberStore(schema, translator: Translator) {
  if (Array.isArray(schema?.enum)) {
    return makeOptionsStore(schema, translator);
  }
  return new NumberStore({
    name: translator.find(schema?.title, i18n.language),
    description: translator.find(schema?.description, i18n.language),
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

function makeObjectStore(schema, translator: Translator, definitions) {
  if (schema?.properties === undefined) {
    return undefined;
  }
  let store = new FormStore(translator.find(schema?.title, i18n.language));
  Object.entries(schema.properties)
    .sort(comparePropertyOrder)
    .forEach(([key, value]) => {
      store.add(key, createStore(value, translator, definitions));
    });
  return store;
}

function makeArrayStore(schema, translator: Translator, definitions) {
  if (schema?.items === undefined || typeof schema.items !== 'object') {
    return undefined;
  }
  const itemSchema = getRealSchema(schema.items, definitions);
  const headers = Object.entries(itemSchema?.properties || {})
    .sort(comparePropertyOrder)
    .map(([_key, value]: [string, any]) => translator.find(value.title, i18n.language));
  return new ArrayStore(translator.find(schema?.title, i18n.language), headers, () =>
    createStore(itemSchema, translator, definitions),
  );
}

function makeOneOfStore(schema, translator: Translator, definitions) {
  if (!Array.isArray(schema.oneOf) || schema.oneOf.length === 0) {
    return undefined;
  }
  let store = new OneOfStore(translator.find(schema?.title, i18n.language));
  schema.oneOf.forEach((item) => {
    const itemSchema = getRealSchema(item, definitions);
    const itemStore = createStore(itemSchema, translator, definitions);
    store.add(itemStore, (value) => matchRequired(itemSchema?.required || [], value));
  });
  return store;
}

export function createStore(schema, translator: Translator, definitions?: any) {
  const defs = definitions || schema?.definitions;
  if (schema?.$ref) {
    return createStore(getRealSchema(schema, defs), translator, defs);
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
  let store = makeFns?.[type]?.(schema, translator, defs);
  if (store !== undefined) {
    store.setFormColumns?.(schema?.options?.grid_columns);
  }
  return store;
}

export function makeParameterStoreFromJsonSchema(schema) {
  const translator = new Translator();
  translator.addTranslations(schema?.translations);
  return createStore(schema, translator);
}
