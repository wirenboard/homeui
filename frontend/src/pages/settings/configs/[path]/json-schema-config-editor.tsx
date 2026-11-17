import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef } from 'react';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { ObjectStore, StoreBuilder, Translator, loadJsonSchema } from '@/stores/json-schema-editor';
import type { JsonSchemaConfigEditorProps } from './types';

// New json-schema-editor for a confed config (opted in via configFile.editor).
// Changes flow back through the same onChange seam the legacy editor uses.
export const JsonSchemaConfigEditor = observer(({ schema, data, onChange }: JsonSchemaConfigEditorProps) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { store, translator } = useMemo(() => {
    const translator = new Translator();
    const loadedSchema = loadJsonSchema(schema);
    if (!loadedSchema) {
      return { store: null, translator };
    }
    translator.addTranslations(loadedSchema.translations);
    const store = new ObjectStore(loadedSchema, data, false, new StoreBuilder());
    return { store, translator };
  }, [schema]);

  useEffect(() => {
    if (!store) {
      return;
    }
    return reaction(
      () => ({ value: store.value, hasErrors: store.hasErrors }),
      ({ value, hasErrors }) => onChangeRef.current(value, hasErrors ? ['invalid'] : []),
      { fireImmediately: true },
    );
  }, [store]);

  if (!store) {
    return null;
  }

  return <JsonSchemaEditor store={store} translator={translator} />;
});

export default JsonSchemaConfigEditor;
