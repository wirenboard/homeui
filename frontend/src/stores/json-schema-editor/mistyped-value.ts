/**
 * Represents a value that does not match the expected type.
 *
 * @property type - Type of a value.
 * @property value - String representation of a value.
 */
export default class MistypedValue {
  readonly type: string;
  readonly value: string;

  constructor(type: string, value: string) {
    this.type = type;
    this.value = value;
  }
}
