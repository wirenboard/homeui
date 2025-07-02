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
  if (schema.enum && schema.enum.length > 0 && typeof schema.enum[0] === 'number') {
    return schema.enum[0] as number;
  }
  return 0;
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
