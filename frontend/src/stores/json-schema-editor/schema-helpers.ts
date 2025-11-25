import type { JsonSchema } from './types';

export const getDefaultBooleanValue = (schema: JsonSchema) : boolean => {
  if (typeof schema.default === 'boolean') {
    return schema.default;
  }
  return false;
};

export const getDefaultNumberValue = (schema: JsonSchema, strict: boolean) : number | undefined => {
  if (typeof schema.default === 'number') {
    return schema.default;
  }
  if (typeof schema.minimum === 'number') {
    return schema.minimum;
  }
  if (schema.enum && schema.enum.length > 0 && typeof schema.enum[0] === 'number') {
    return schema.enum[0] as number;
  }
  return strict ? undefined : 0;
};

export const getDefaultStringValue = (schema: JsonSchema) : string => {
  if (typeof schema.default === 'string') {
    return schema.default;
  }
  if (schema.enum && schema.enum.length > 0 && typeof schema.enum[0] === 'string') {
    return schema.enum[0] as string;
  }
  return '';
};

export const getDefaultObjectValue = (schema: JsonSchema, strict: boolean) : object => {
  let res = {};
  Object.entries(schema?.properties || {}).forEach(([key, value]) => {
    if (schema.required?.includes(key)) {
      const defaultValue = getDefaultValue(value, strict);
      if (defaultValue !== undefined) {
        res[key] = defaultValue;
      }
    }
  });
  return res;
};

/**
 * Derives a default JavaScript value that conforms to the provided JSON Schema.
 *
 * @param schema - The JSON Schema object used to determine the default value. Must be a valid JsonSchema.
 * @param strict - When true, use stricter/default-conservative rules.
 *                 In strict mode numeric value is set to undefined if no other default can be determined,
 *                 in non strict mode it is set to 0.
 *                 Defaults to false.
 *
 * @returns A value that matches the given schema, or `undefined` when no sensible default can be determined.
 *
 */
export const getDefaultValue = (schema: JsonSchema, strict: boolean = false) => {
  switch (schema.type) {
    case 'boolean':
      return getDefaultBooleanValue(schema);
    case 'number':
    case 'integer':
      return getDefaultNumberValue(schema, strict);
    case 'string':
      return getDefaultStringValue(schema);
    case 'object':
      return getDefaultObjectValue(schema, strict);
    case 'array':
      return [];
    case 'oneOf':
      if (schema.oneOf.length > 0) {
        return getDefaultValue(schema.oneOf[0], strict);
      }
      return undefined;
    default:
      return undefined;
  }
};
