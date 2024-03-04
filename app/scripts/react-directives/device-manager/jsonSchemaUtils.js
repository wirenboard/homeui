'use strict';

function isNotEmptyArray(schema) {
  return schema?.type === 'array' && schema?.minItems;
}

function getSchemaByRef(ref, node, root) {
  ref.split('/').forEach(nodeName => {
    if (nodeName == '#') {
      node = root;
    } else {
      node = node?.[nodeName];
    }
  });
  return node;
}

function getDefaultArrayValue(schema, root) {
  if (schema?.minItems) {
    if (Array.isArray(schema.items)) {
      return schema.items.map(item => getDefaultPropertyValue(item, root));
    }
  }
  return [];
}

function getDefaultPropertyValue(schema, root, defaultProperties) {
  if (schema?.hasOwnProperty('default')) {
    return schema.default;
  }
  if (schema?.hasOwnProperty('enum')) {
    return schema.enum[0];
  }
  if (schema?.type === 'array') {
    return getDefaultArrayValue(schema, root);
  }
  if (schema.hasOwnProperty('$ref')) {
    return getDefaultPropertyValue(getSchemaByRef(schema['$ref'], schema, root), root);
  }
  if (schema?.type === 'object' || schema?.type === undefined) {
    return getDefaultObject(schema, root, defaultProperties);
  }
  return undefined;
}

export function getDefaultObject(schema, root, defaultProperties) {
  let res = {};
  root ??= schema;
  defaultProperties ??= [];
  defaultProperties = [
    ...defaultProperties,
    ...(schema?.required || []),
    ...(schema?.defaultProperties || []),
  ];

  Object.entries(schema?.properties || {}).forEach(([key, value]) => {
    if (
      value.hasOwnProperty('requiredProp') ||
      defaultProperties.includes(key) ||
      isNotEmptyArray(value)
    ) {
      const defaultValue = getDefaultPropertyValue(value, root);
      if (defaultValue !== undefined) {
        res[key] = defaultValue;
      }
    }
  });

  if (schema?.allOf && Array.isArray(schema.allOf) && schema.allOf.length) {
    schema.allOf.forEach(subSchema => {
      Object.assign(res, getDefaultPropertyValue(subSchema, root, defaultProperties));
    });
  }

  if (schema?.oneOf && Array.isArray(schema.oneOf) && schema.oneOf.length) {
    return getDefaultPropertyValue(schema.oneOf[0], root);
  }
  return res;
}

export function getTranslation(key, lang, translations) {
  return translations[lang]?.[key] || translations?.en?.[key] || key;
}
