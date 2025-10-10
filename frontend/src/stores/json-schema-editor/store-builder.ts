import { ArrayStore } from './array-store';
import { BooleanStore } from './boolean-store';
import { NumberStore } from './number-store';
import { ObjectStore } from './object-store';
import { StringStore } from './string-store';
import { ByteArrayStore } from './byte-array-store';
import { JsonSchema, PropertyStore } from './types';

export class StoreBuilder {

  createStore(schema: JsonSchema, initialValue: unknown, required: boolean): PropertyStore | undefined {
    if (!schema || !schema.type) {
      return undefined;
    }
    switch (schema.format) {
      case 'wb-serial-int':
      case 'wb-int-address': {
        // To simplify user input, use string store for integers and addresses
        let convertedInitialValue: unknown = initialValue;
        if (typeof initialValue === 'number' && Number.isInteger(initialValue)) {
          convertedInitialValue = String(initialValue);
        }
        return new StringStore(schema.oneOf[0], convertedInitialValue, required);
      }
      case 'wb-serial-number': {
        // To simplify user input, use string store for numbers
        let convertedInitialValue: unknown = initialValue;
        if (typeof initialValue === 'number') {
          convertedInitialValue = String(initialValue);
        }
        return new StringStore(schema.oneOf[0], convertedInitialValue, required);
      }
      case 'wb-byte-array': {
        return new ByteArrayStore(schema, initialValue, required);
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
      case 'array':
        return new ArrayStore(schema, initialValue, required, this);
      default:
        return undefined;
    }
  }
}
