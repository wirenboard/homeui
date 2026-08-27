import { autocompletion, type CompletionSource } from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { type DevicesStore } from '@/stores/devices';
import { getEnums } from './enums';
import { wbRulesGlobals } from './globals-generated';
import { methods } from './methods';
import { snippets } from './snippets';

export type { TsEditorSupport } from './types';

// exported for tests
export function mergeSources(sources: CompletionSource[]): CompletionSource {
  return async (context) => {
    for (const s of sources) {
      const result = await s(context);
      if (!result) continue;
      // an empty result must not shadow later sources: the TS service answers with
      // zero entries inside dev["..."], where the device-list source has the real ones
      if (result.options.length > 0) return result;
      // ...but inside a string literal global identifiers/snippets are never the answer
      const prev = context.state.sliceDoc(Math.max(0, result.from - 1), result.from);
      if (prev === '"' || prev === '\'') return result;
    }
    return null;
  };
}

// a snippet wins over the generated global of the same label (richer template)
const snippetLabels = new Set(snippets.map((s) => s.label));
const staticCompletions = [
  ...snippets,
  ...wbRulesGlobals.filter((g) => !snippetLabels.has(g.label)),
];

const staticSource: CompletionSource = (context) => {
  const word = context.matchBefore(/[A-Za-z_$][\w$]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return { from: word.from, options: staticCompletions, validFor: /^[\w$]*$/ };
};

// the service's entries are label + kind only; the static list adds snippet templates
// (replacing the plain entry of the same label) and generated globals it did not surface
const withStaticExtras = (typeAware: CompletionSource): CompletionSource => async (context) => {
  const result = await typeAware(context);
  if (!result || result.options.length === 0) return null;
  // member accesses and string literals are the service's alone
  const prev = context.state.sliceDoc(Math.max(0, result.from - 1), result.from);
  if (prev === '.' || prev === '"' || prev === '\'') return result;
  const tsLabels = new Set(result.options.map((o) => o.label));
  return {
    ...result,
    options: [
      ...result.options.filter((o) => !snippetLabels.has(o.label)),
      ...snippets,
      ...wbRulesGlobals.filter((g) => !snippetLabels.has(g.label) && !tsLabels.has(g.label)),
    ],
  };
};

export const getExtensions = (
  devicesStore: DevicesStore,
  options?: { typescript?: boolean; typeAwareSource?: CompletionSource },
) => {
  const autocomplete = mergeSources([
    // device/topic string contexts answer from the live device list first: the service
    // returns non-empty identifier lists in the unquoted variants and would shadow them
    ...getEnums(devicesStore),
    ...(options?.typeAwareSource ? [withStaticExtras(options.typeAwareSource)] : []),
    ...methods,
    staticSource,
  ]);

  return [
    autocompletion(),
    javascript({ jsx: false, typescript: !!options?.typescript }),
    javascriptLanguage.data.of({
      autocomplete,
    }),
  ];
};
