import { autocompletion, type CompletionSource } from '@codemirror/autocomplete';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { type DevicesStore } from '@/stores/devices';
import { getEnums } from './enums';
import { methods } from './methods';
import { snippetSource } from './snippets';

function mergeSources(sources: CompletionSource[]): CompletionSource {
  return (context) => {
    for (const s of sources) {
      const result = s(context);
      if (result) return result;
    }
    return null;
  };
}

export const getExtensions = (devicesStore: DevicesStore) => {
  const autocomplete = mergeSources([
    ...getEnums(devicesStore),
    ...methods,
    snippetSource,
  ]);

  return [
    autocompletion(),
    javascript({ jsx: false }),
    javascriptLanguage.data.of({
      autocomplete,
    }),
  ];
};
