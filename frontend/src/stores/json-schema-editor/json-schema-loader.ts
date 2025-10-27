import type { JsonSchema, JsonEditorOptions } from './types';

type Definitions = Record<string, JsonSchema>;

const isObject = (value: unknown): boolean => {
  return typeof value === 'object' && value !== null;
};

const expandAllOf = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  let res: JsonSchema = {
    type: 'object',
    properties: {},
  };

  const allOfSchemas: JsonSchema[] = schema.allOf.reduce((acc, s) => {
    if (!isObject(s)) {
      return acc;
    }
    const expanded = expandSchema(s, definitions, refCache);
    if (expanded) {
      acc.push(expanded);
      sanitizeCustomProperties(expanded, res);
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

  res.required = Array.from(required);

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

  sanitizeCustomProperties(schema, res);

  return res;
};

const expandOneOf = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  const oneOfSchemas: JsonSchema[] = schema.oneOf.reduce((acc, s) => {
    if (!isObject(s)) {
      return acc;
    }
    const expanded = expandSchema(s, definitions, refCache);
    if (expanded) {
      sanitizeCustomProperties(schema, expanded);
      acc.push(expanded);
    }
    return acc;
  }, []);

  const res: JsonSchema = {
    type: 'oneOf',
    oneOf: oneOfSchemas,
  };

  sanitizeCustomProperties(schema, res);

  return res;
};

const expandRef = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  if (refCache[schema.$ref]) {
    return structuredClone(refCache[schema.$ref]);
  }
  const definitionKey = schema.$ref.replace('#/definitions/', '');
  const ref = definitions[definitionKey];
  const res = isObject(ref) ? expandSchema(ref as JsonSchema, definitions, refCache) : undefined;
  if (res !== undefined) {
    refCache[schema.$ref] = res;
  }
  return structuredClone(res);
};

const sanitizeCustomProperties = (source: JsonSchema, dest: JsonSchema) => {
  if (isObject(source.options)) {
    if (!isObject(dest.options)) {
      dest.options = {};
    }
    sanitizeOptions(source.options, dest.options);
  }
  if (typeof source.propertyOrder === 'number') {
    dest.propertyOrder = source.propertyOrder;
  }
  if (typeof source.format === 'string') {
    dest.format = source.format;
  }
  if (typeof source.title === 'string') {
    dest.title = source.title;
  }
  if (typeof source.description === 'string') {
    dest.description = source.description;
  }
};

const sanitizeOptions = (source: JsonEditorOptions, dest: JsonEditorOptions) => {
  dest.hidden = !!source.hidden;
  dest.show_opt_in = !!source.show_opt_in;
  if (typeof source.grid_columns === 'number') {
    dest.grid_columns = source.grid_columns;
  }
  if (source.inputAttributes !== undefined) {
    dest.inputAttributes = source.inputAttributes;
  }
  if (typeof source.patternmessage === 'string') {
    dest.patternmessage = source.patternmessage;
  }
  if (isObject(source.wb)) {
    dest.wb = {};
    dest.wb.show_editor = !!source.wb.show_editor;
    dest.wb.omit_default = !!source.wb.omit_default;
    dest.wb.allow_undefined = !!source.wb.allow_undefined;
  }
  if (Array.isArray(source.enum_titles)) {
    dest.enum_titles = source.enum_titles;
  }
};

const sanitizeBooleanSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'boolean',
  };
  if (typeof schema.default === 'boolean') {
    res.default = schema.default;
  }
  sanitizeCustomProperties(schema, res);
  return res;
};

const sanitizeNumberSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'number',
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
  if (Array.isArray(schema.enum)) {
    res.enum = schema.enum;
  }
  sanitizeCustomProperties(schema, res);
  return res;
};

const sanitizeStringSchema = (schema: JsonSchema): JsonSchema => {
  let res : JsonSchema = {
    type: 'string',
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
  sanitizeCustomProperties(schema, res);
  return res;
};

const sanitizeObjectSchema = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema => {
  let res: JsonSchema = {
    type: 'object',
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
  sanitizeCustomProperties(schema, res);
  return res;
};

const sanitizeArraySchema = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema => {
  let res : JsonSchema = {
    type: 'array',
  };
  if (typeof schema.maxItems === 'number') {
    res.maxItems = schema.maxItems;
  }
  if (typeof schema.minItems === 'number') {
    res.minItems = schema.minItems > 0 ? schema.minItems : 0;
  }
  if (Array.isArray(schema.items)) {
    res.items = schema.items.reduce((acc, item) => {
      const expanded = expandSchema(item, definitions, refCache);
      if (expanded) {
        acc.push(expanded);
      }
      return acc;
    }, [] as JsonSchema[]);
  } else {
    if (isObject(schema.items)) {
      const itemSchema = expandSchema(schema.items, definitions, refCache);
      if (itemSchema) {
        res.items = itemSchema;
      }
    }
  }
  sanitizeCustomProperties(schema, res);
  return res;
};

const expandSchema = (schema: JsonSchema, definitions: Definitions, refCache: Definitions): JsonSchema | undefined => {
  if (typeof schema.$ref === 'string') {
    let res = expandRef(schema, definitions, refCache);
    sanitizeCustomProperties(schema, res);
    return res;
  }
  if (Array.isArray(schema.allOf)) {
    return expandAllOf(schema, definitions, refCache);
  }
  if (Array.isArray(schema.oneOf)) {
    return expandOneOf(schema, definitions, refCache);
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
  if (schema.type === 'array') {
    return sanitizeArraySchema(schema, definitions, refCache);
  }
  return sanitizeObjectSchema(schema, definitions, refCache);
};

export const loadJsonSchema = (schema: unknown, externalDefinitions?: unknown): JsonSchema | undefined => {
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
  let res = expandSchema(schema as JsonSchema, definitions, {});
  res.translations = schemaAsRecord?.translations;
  return res;
};
