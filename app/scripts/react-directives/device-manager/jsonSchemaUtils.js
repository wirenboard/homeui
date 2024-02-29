'use strict';

function getDefaultPropertyValue(schema) {
  if (schema?.hasOwnProperty('default')) {
    return schema.default;
  }
  if (schema?.hasOwnProperty('enum')) {
    return schema.enum[0];
  }
  if (schema?.type === 'array') {
    return [];
  }
  return undefined;
}

function addProperties(obj, schema, defaultProperties) {
  [...(schema?.required || []), ...(defaultProperties || [])].forEach(propName => {
    const defaultValue = getDefaultPropertyValue(schema?.properties?.[propName]);
    if (defaultValue !== undefined) {
      obj[propName] = defaultValue;
    }
  });

  Object.entries(schema?.properties || {}).forEach(([key, value]) => {
    if (value.hasOwnProperty('requiredProp')) {
      const defaultValue = getDefaultPropertyValue(value);
      if (defaultValue !== undefined) {
        obj[key] = defaultValue;
      }
    }
  });
}

export function getDefaultObject(schema) {
  let res = {};
  addProperties(res, schema, schema?.defaultProperties);
  schema?.allOf?.forEach(subSchema => {
    let node = subSchema;
    if (subSchema.hasOwnProperty('$ref')) {
      subSchema['$ref'].split('/').forEach(nodeName => {
        if (nodeName == '#') {
          node = schema;
        } else {
          node = node?.[nodeName];
        }
      });
    }
    addProperties(res, node, schema?.defaultProperties);
  });
  return res;
}
