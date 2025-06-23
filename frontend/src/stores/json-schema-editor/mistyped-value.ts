/**
 * Represents a value that does not match the expected type.
 *
 * @property type - Type of a value.
 * @property value - String representation of a value.
 */
export default class MistypedValue {
  readonly type: string;
  readonly value: string;

  constructor(value: unknown) {
    this.type = typeof value;
    this.value = String(value);
  }
}
