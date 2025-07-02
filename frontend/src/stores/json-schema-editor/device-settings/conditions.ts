export class Conditions {
  public functions: Record<string, Function> = {};

  getFunction(conditionText?: string, dependencies?: string[]): Function | undefined {
    if (!conditionText || !dependencies) {
      return undefined;
    }
    try {
      let fn = this.functions?.[conditionText];
      if (!fn) {
        fn = new Function(
          dependencies,
          'let isDefined = p => p!==undefined; return ' + conditionText + ';'
        );
        this.functions[conditionText] = fn;
      }
      return fn;
    } catch (e) {
      return undefined;
    }
  }
}
