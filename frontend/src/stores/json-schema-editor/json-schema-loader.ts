import BooleanStore from './boolean-store';
import NumberStore from './number-store';
import ObjectStore, { ObjectStoreParam } from './object-store';
import StringStore from './string-store';
import { BooleanSchema, NumberSchema, ObjectSchema, StringSchema } from './types';

const expandSchema = (schema: any, definitions: any, schemaCache: Record<any, any>) => {
  if (schema?.$ref) {
    if (schemaCache[schema.$ref]) {
      return schemaCache[schema.$ref];
    }
    const ref = schema.$ref.replace('#/definitions/', '');
    const res = expandSchema(definitions[ref], definitions, schemaCache);
    schemaCache[schema.$ref] = res;
    return res;
  }
  if (schema?.allOf) {
    if (schemaCache[schema]) {
      return schemaCache[schema];
    }
    const allOfSchemas = schema.allOf.map((s: any) => expandSchema(s, definitions, schemaCache));
    let res = {
      ...schema,
      properties: Object.assign({}, ...allOfSchemas.map((s: any) => s.properties || {})),
      required: [...new Set([].concat(...allOfSchemas.map((s: any) => s.required || [])))],
    };
    delete res.allOf;
    schemaCache[schema] = res;
    return res;
  }
  return schema;
};

const makeBooleanStore = (schema: any, _definitions: any, initialValue: any, required: boolean): BooleanStore => {
  return new BooleanStore(schema as BooleanSchema, initialValue, required);
};

const makeStringStore = (schema: any, _definitions: any, initialValue: any, required: boolean) : StringStore => {
  return new StringStore(schema as StringSchema, initialValue, required);
};

const makeNumberStore = (schema: any, _definitions: any, initialValue: any, required: boolean): NumberStore => {
  return new NumberStore(schema as NumberSchema, initialValue, required);
};

function comparePropertyOrder([key1, schema1], [key2, schema2]) {
  const order1 = schema1?.propertyOrder || 10000;
  const order2 = schema2?.propertyOrder || 10000;
  if (order1 === order2) {
    return key1.localeCompare(key2);
  }
  return order1 - order2;
}

const makeObjectStore = (schema: any, definitions: any, initialValue: any, _required: boolean) : ObjectStore => {
  let params: ObjectStoreParam[] = [];
  if (schema?.properties) {
    Object.entries(schema.properties)
      .sort(comparePropertyOrder)
      .forEach(([key, value]) => {
        params.push(
          new ObjectStoreParam(
            key,
            createStore(value, definitions, initialValue?.[key], !!schema.required?.includes(key))
          )
        );
      });
  }
  return new ObjectStore(schema as ObjectSchema, params);
};

const createStore = (
  schema: any,
  definitions: any,
  initialValue: any,
  required: boolean
) : any => {
  if (schema === undefined) {
    return undefined;
  }
  const expandedSchema = expandSchema(schema, definitions, {});
  if (!expandedSchema?.type) {
    return undefined;
  }
  let type = expandedSchema.type;
  const makeFns = {
    boolean: makeBooleanStore,
    string: makeStringStore,
    integer: makeNumberStore,
    number: makeNumberStore,
    object: makeObjectStore,
  };
  const makeFn = makeFns[type];
  if (makeFn === undefined) {
    return undefined;
  }
  return makeFn(expandedSchema, definitions, initialValue, required);
};

export const makeStoreFromJsonSchema = (schema: any, initialValue: any): any => {
  const definitions = schema?.definitions || {};
  return createStore(schema, definitions, initialValue, true);
};
