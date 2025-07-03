import type { JsonSchema, JsonEditorOptions } from './types';

type Definitions = Record<string, JsonSchema>;

const isObject = (value: unknown): boolean => {
  return typeof value === 'object' && value !== null;
};

const expandAllOf = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  const allOfSchemas: JsonSchema[] = schema.allOf.reduce((acc, s) => {
    if (!isObject(s)) {
      return acc;
    }
    const expanded = expandSchema(s, definitions, refCache);
    if (expanded) {
      acc.push(expanded);
    }
    return acc;
  }, []);

  const required = allOfSchemas.reduce((acc, s) => {
    if (Array.isArray(s.required)) {
      s.required.forEach((r: string) => acc.add(r));
    }
    return acc;
  }, new Set<string>());

  if (schema.required) {
    schema.required.forEach((r: string) => required.add(r));
  }

  let res: JsonSchema = {
    type: 'object',
    title: schema.title,
    description: schema.description,
    propertyOrder: schema.propertyOrder,
    options: schema.options,
    properties: {},
    required: Array.from(required),
    format: schema.format,
    device: schema.device,
  };

  allOfSchemas.forEach((s) => {
    if (isObject(s.properties)) {
      Object.entries(s.properties).forEach(([key, value]) => {
        const propSchema = expandSchema(value as JsonSchema, definitions, refCache);
        if (propSchema) {
          res.properties[key] = propSchema;
        }
      });
    }
  });

  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const propSchema = expandSchema(value, definitions, refCache);
      if (propSchema) {
        res.properties[key] = propSchema;
      }
    });
  }

  return res;
};

const expandRef = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  if (refCache[schema.$ref]) {
    return refCache[schema.$ref];
  }
  const definitionKey = schema.$ref.replace('#/definitions/', '');
  const ref = definitions[definitionKey];
  const res = isObject(ref) ? expandSchema(ref as JsonSchema, definitions, refCache) : undefined;
  if (res !== undefined) {
    refCache[schema.$ref] = res;
  }
  return res;
};

const sanitizeOptions = (options: JsonEditorOptions): JsonEditorOptions => {
  const sanitized: JsonEditorOptions = {};
  sanitized.hidden = !!options.hidden;
  sanitized.show_opt_in = !!options.show_opt_in;
  if (typeof options.grid_columns === 'number') {
    sanitized.grid_columns = options.grid_columns;
  }
  if (options.inputAttributes !== undefined) {
    sanitized.inputAttributes = options.inputAttributes;
  }
  if (typeof options.patternmessage === 'string') {
    sanitized.patternmessage = options.patternmessage;
  }
  if (isObject(options.wb)) {
    sanitized.wb = {};
    sanitized.wb.show_editor = !!options.wb.show_editor;
  }
  return sanitized;
};

const sanitizeBooleanSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'boolean',
    title: schema.title,
    description: schema.description,
  };
  if (typeof schema.default === 'boolean') {
    res.default = schema.default;
  }
  if (isObject(schema.options)) {
    res.options = sanitizeOptions(schema.options);
  }
  if (typeof schema.propertyOrder === 'number') {
    res.propertyOrder = schema.propertyOrder;
  }
  return res;
};

const sanitizeNumberSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'number',
    title: schema.title,
    description: schema.description,
  };
  if (typeof schema.default === 'number') {
    res.default = schema.default;
  }
  if (typeof schema.maximum === 'number') {
    res.maximum = schema.maximum;
  }
  if (typeof schema.minimum === 'number') {
    res.minimum = schema.minimum;
  }
  if (isObject(schema.options)) {
    res.options = sanitizeOptions(schema.options);
  }
  if (Array.isArray(schema.enum)) {
    res.enum = schema.enum;
  }
  if (typeof schema.propertyOrder === 'number') {
    res.propertyOrder = schema.propertyOrder;
  }
  return res;
};

const sanitizeStringSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'string',
    title: schema.title,
    description: schema.description,
  };
  if (typeof schema.default === 'string') {
    res.default = schema.default;
  }
  if (typeof schema.maxLength === 'number') {
    res.maxLength = schema.maxLength;
  }
  if (typeof schema.minLength === 'number') {
    res.minLength = schema.minLength > 0 ? schema.minLength : 0;
  }
  if (typeof schema.pattern === 'string') {
    res.pattern = schema.pattern;
  }
  if (Array.isArray(schema.enum)) {
    res.enum = schema.enum;
  }
  if (isObject(schema.options)) {
    res.options = sanitizeOptions(schema.options);
  }
  if (typeof schema.propertyOrder === 'number') {
    res.propertyOrder = schema.propertyOrder;
  }
  return res;
};

const sanitizeObjectSchema = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema => {
  let res: JsonSchema = {
    type: 'object',
    title: schema.title,
    description: schema.description,
    device: schema.device,
    properties: {},
  };
  if (Array.isArray(schema.required)) {
    res.required = schema.required;
  }
  if (isObject(schema.properties)) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const sanitizedValue = expandSchema(value, definitions, refCache);
      if (sanitizedValue) {
        res.properties[key] = sanitizedValue;
      }
    });
  }
  if (isObject(schema.options)) {
    res.options = sanitizeOptions(schema.options);
  }
  if (typeof schema.propertyOrder === 'number') {
    res.propertyOrder = schema.propertyOrder;
  }
  if (typeof schema.format === 'string') {
    res.format = schema.format;
  }
  return res;
};

const expandSchema = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  if (typeof schema.$ref === 'string') {
    return expandRef(schema, definitions, refCache);
  }
  if (Array.isArray(schema.allOf)) {
    return expandAllOf(schema, definitions, refCache);
  }
  if (schema.type === 'boolean') {
    return sanitizeBooleanSchema(schema);
  }
  if (schema.type === 'number' || schema.type === 'integer') {
    return sanitizeNumberSchema(schema);
  }
  if (schema.type === 'string') {
    return sanitizeStringSchema(schema);
  }
  return sanitizeObjectSchema(schema, definitions, refCache);
};

export const loadJsonSchema = (schema: unknown, externalDefinitions: unknown): JsonSchema | undefined => {
  if (!isObject(schema)) {
    return undefined;
  }
  let definitions: Definitions;
  let schemaAsRecord = schema as Record<string, any>;
  if (externalDefinitions !== undefined && isObject(externalDefinitions)) {
    definitions = externalDefinitions as Definitions;
  } else {
    definitions = schemaAsRecord?.definitions || {};
  }

  // Convert legacy parameter definition as object to array
  const deviceParameters = schemaAsRecord?.device?.parameters;
  if (isObject(deviceParameters) && !Array.isArray(deviceParameters)) {
    schemaAsRecord.device.parameters = Object.entries(deviceParameters).map(([id, param]) => {
      (param as Record<string, any>).id = id;
      return param;
    });
  }
  return expandSchema(schema as JsonSchema, definitions, {});
};
