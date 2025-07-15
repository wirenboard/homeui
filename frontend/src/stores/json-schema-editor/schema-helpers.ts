import type { JsonSchema } from './types';

export const getDefaultBooleanValue = (schema: JsonSchema) : boolean => {
  if (typeof schema.default === 'boolean') {
    return schema.default;
  }
  return false;
};

export const getDefaultNumberValue = (schema: JsonSchema) : number => {
  if (typeof schema.default === 'number') {
    return schema.default;
  }
  if (typeof schema.minimum === 'number') {
    return schema.minimum;
  }
  return 0;
};

export const getDefaultStringValue = (schema: JsonSchema) : string => {
  if (typeof schema.default === 'string') {
    return schema.default;
  }
  return '';
};
