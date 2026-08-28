// Rule files the engine loads: .js/.ts decide script vs ES module by their
// syntax, .mjs/.mts are always ES modules, .cjs/.cts always classic scripts.
export const RULE_FILE_EXTENSION_RX = /\.[mc]?[jt]s$/;
export const TS_RULE_FILE_EXTENSION_RX = /\.[mc]?ts$/;

// the extension a file keeps through a rename or copy (.js for a name
// without one)
export function ruleFileExtension(name: string): string {
  return RULE_FILE_EXTENSION_RX.exec(name)?.[0] ?? '.js';
}
