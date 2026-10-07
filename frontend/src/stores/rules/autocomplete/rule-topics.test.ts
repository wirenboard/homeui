import { CompletionContext } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorState } from '@codemirror/state';
import { makeRuleTopicsSource } from './rule-topics';

const topics = ['wb-device/Temperature', 'wb-device/Relay'];
const source = makeRuleTopicsSource(topics);

const complete = async (code: string) => {
  const pos = code.indexOf('|');
  const state = EditorState.create({
    doc: code.replace('|', ''),
    extensions: [javascript()],
  });
  return { state, result: await source(new CompletionContext(state, pos, false)) };
};

describe('rule topic autocomplete', () => {
  test.each([
    'defineAlias("alias", |)',
    'defineAlias("alias", wb|)',
    'defineAlias(\n  "alias",\n  |\n)',
    'defineAlias(getName("a", "b"), |)',
    'defineRule("rule", { whenChanged: | })',
    'defineRule({ whenChanged: [|] })',
    'defineRule("rule", {\n  whenChanged: [\n    "other/Control",\n    |\n  ]\n})',
  ])('inserts a quoted topic in %s', async (code) => {
    const { state, result } = await complete(code);

    expect(result).not.toBeNull();
    expect(result.options.map((option) => option.label)).toEqual(topics);
    expect(result.options[0].apply).toBe('"wb-device/Temperature"');
    const updated = state.update({
      changes: { from: result.from, to: result.to, insert: result.options[0].apply as string },
    }).state.doc.toString();
    expect(updated).toBe(code.replace(/(?:wb)?\|/, '"wb-device/Temperature"'));
  });

  test.each([
    'defineAlias("alias", "|")',
    'defineAlias(\'alias\', \'wb|\')',
    'defineAlias("alias", "wb|',
    'defineRule("rule", { whenChanged: "wb|" })',
    'defineRule({ whenChanged: \'wb|\' })',
    'defineRule({ "whenChanged": ["wb|"] })',
    'defineRule({ \'whenChanged\': [\'other/Control\', \'wb|\'] })',
    'defineRule("rule", {\n  whenChanged: [\n    "other/Control",\n    "wb|"\n  ]\n})',
    'defineRule({ whenChanged: ["other/Control, with comma", "wb|',
    `defineRule({ whenChanged: ["${'other/Control,'.repeat(30)}", "wb|"] })`,
  ])('completes inside the existing quotes in %s', async (code) => {
    const { state, result } = await complete(code);

    expect(result).not.toBeNull();
    expect(result.options.map((option) => option.label)).toEqual(topics);
    expect(result.options[0].apply).toBe('wb-device/Temperature');
    const updated = state.update({
      changes: { from: result.from, to: result.to, insert: result.options[0].apply as string },
    }).state.doc.toString();
    expect(updated).toBe(code.replace(/(?:wb)?\|/, 'wb-device/Temperature'));
  });

  test.each([
    'defineAlias("wb|")',
    'defineAlias("alias", "other/Control", "wb|")',
    'defineAlias("alias", getName("wb|"))',
    'defineRule("wb|", {})',
    'defineRule({ other: "wb|" })',
    'defineRule({ whenChanged: ["other/Control"], other: ["wb|"] })',
    'defineRule({ nested: { whenChanged: "wb|" } })',
    'defineRule({ whenChanged: "other/Control"| })',
    'defineRule({ whenChanged: ["other/Control"]| })',
    'otherFunction({ whenChanged: "wb|" })',
    'const value = { whenChanged: ["wb|"] };',
    '// defineAlias("alias", "wb|',
  ])('does not suggest topics outside the supported values in %s', async (code) => {
    const { result } = await complete(code);
    expect(result).toBeNull();
  });
});
