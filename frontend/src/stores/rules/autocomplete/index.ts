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
      // an empty result must not shadow later sources: the TS language
      // service answers with zero entries inside dev["..."] (index
      // signature, no literal keys), where the device-list source has
      // the real completions
      if (result.options.length > 0) return result;
      // ...but inside a string literal the tail sources (global
      // identifiers/snippets) are never the answer: a control reference
      // with no matches keeps its empty popup instead of junk globals
      const prev = context.state.sliceDoc(Math.max(0, result.from - 1), result.from);
      if (prev === '"' || prev === '\'') return result;
    }
    return null;
  };
}

// snippets and generated globals are one namespace: offered together,
// snippet variants first (they insert richer templates), generated
// signatures for everything the snippet list does not cover
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

// the language service returns plain type-aware entries (label + kind
// only); the static list still contributes its richer snippet templates
// (which replace the plain entry of the same label) and any generated
// signature the service did not surface. Member accesses (obj.foo) stay
// the service's alone - global snippets don't belong in property lists.
const withStaticExtras = (typeAware: CompletionSource): CompletionSource => async (context) => {
  const result = await typeAware(context);
  if (!result || result.options.length === 0) return null;
  // member accesses (obj.foo) and string-literal completions (inside
  // "..." - e.g. vdev.getControl("<control name>)) are the service's
  // alone; global snippets/identifiers must not be spliced into them
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
    // device/topic string-argument contexts (dev["...], getDevice(...)
    // answer from the live device list first - the language service
    // returns non-empty identifier lists in the unquoted variants and
    // would shadow them
    ...getEnums(devicesStore),
    // the TS language service (when loaded) answers next with type-aware
    // completions; static sources below are the no-service fallback
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
