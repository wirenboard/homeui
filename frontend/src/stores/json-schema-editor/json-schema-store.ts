import BooleanStore from './boolean-store';
import NumberStore from './number-store';
import { ObjectStore, ObjectStoreParam } from './object-store';
import StringStore from './string-store';
import { JsonSchema } from './types';

const makeBooleanStore = (schema: JsonSchema, initialValue: unknown, required: boolean): BooleanStore => {
  return new BooleanStore(schema, initialValue, required);
};

const makeStringStore = (schema: JsonSchema, initialValue: unknown, required: boolean) : StringStore => {
  return new StringStore(schema, initialValue, required);
};

const makeNumberStore = (schema: JsonSchema, initialValue: unknown, required: boolean): NumberStore => {
  return new NumberStore(schema, initialValue, required);
};

function comparePropertyOrder([key1, schema1], [key2, schema2]) {
  const order1 = schema1.propertyOrder ?? 10000;
  const order2 = schema2.propertyOrder ?? 10000;
  if (order1 === order2) {
    return key1.localeCompare(key2);
  }
  return order1 - order2;
}

const makeObjectStore = (schema: JsonSchema, initialValue: unknown, _required: boolean) : ObjectStore => {
  let params: ObjectStoreParam[] = [];
  if (schema?.properties) {
    Object.entries(schema.properties)
      .sort(comparePropertyOrder)
      .forEach(([key, value]) => {
        params.push(
          new ObjectStoreParam(
            key,
            createStore(value, initialValue?.[key], !!schema.required?.includes(key))
          )
        );
      });
  }
  return new ObjectStore(schema, params);
};

const createStore = (
  schema: JsonSchema,
  initialValue: unknown,
  required: boolean
) : ObjectStore | NumberStore | StringStore | BooleanStore => {
  const makeFns = {
    boolean: makeBooleanStore,
    string: makeStringStore,
    integer: makeNumberStore,
    number: makeNumberStore,
    object: makeObjectStore,
  };
  return makeFns[schema.type](schema, initialValue, required);
};

export const makeStoreFromJsonSchema = (schema: JsonSchema, initialValue: unknown): ObjectStore => {
  return makeObjectStore(schema, initialValue, true);
};
