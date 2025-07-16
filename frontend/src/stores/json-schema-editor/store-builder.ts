import BooleanStore from './boolean-store';
import NumberStore from './number-store';
import { ObjectStore } from './object-store';
import StringStore from './string-store';
import { JsonSchema, PropertyStore } from './types';

type FactoryFunction = (
  schema: JsonSchema,
  initialValue: unknown,
  required: boolean,
  builder: StoreBuilder
) => PropertyStore | undefined;

export class StoreBuilder {

  private _factoryFns: FactoryFunction[] = [];

  addRule(rule: FactoryFunction): void {
    this._factoryFns.push(rule);
  }

  createStore(schema: JsonSchema, initialValue: unknown, required: boolean): PropertyStore | undefined {
    if (!schema || !schema.type) {
      return undefined;
    }
    for (const factoryFn of this._factoryFns) {
      const store = factoryFn(schema, initialValue, required, this);
      if (store) {
        return store;
      }
    }
    switch (schema.type) {
      case 'boolean':
        return new BooleanStore(schema, initialValue, required);
      case 'string':
        return new StringStore(schema, initialValue, required);
      case 'integer':
      case 'number':
        return new NumberStore(schema, initialValue, required);
      case 'object':
        return new ObjectStore(schema, initialValue, required, this);
      default:
        return undefined;
    }
  }
}
