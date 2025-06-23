export default class MistypedValue {
  readonly type: string;
  readonly value: string;

  constructor(value: unknown) {
    this.type = typeof value;
    this.value = String(value);
  }
}
