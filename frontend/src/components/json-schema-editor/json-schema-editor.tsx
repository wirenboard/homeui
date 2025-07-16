import {
  PropertyStore,
  ObjectStore,
  StringStore,
  NumberStore,
  BooleanStore,
  Translator
} from '@/stores/json-schema-editor';
import { BooleanParamEditor } from './boolean-param-editor';
import { NumberParamEditor } from './number-param-editor';
import { ObjectParamEditor } from './object-param-editor';
import { StringParamEditor } from './string-param-editor';
import type { JsonSchemaEditorProps } from './types';
import './styles.css';

const DefaultEditorBuilder = (store: PropertyStore, paramId: string, translator: Translator) => {
  if (store.storeType === 'object') {
    return <ObjectParamEditor store={store as ObjectStore} paramId={paramId} translator={translator}/>;
  }
  if (store.storeType === 'string') {
    return <StringParamEditor store={store as StringStore} paramId={paramId} translator={translator}/>;
  }
  if (store.storeType === 'number') {
    return <NumberParamEditor store={store as NumberStore} paramId={paramId} translator={translator}/>;
  }
  if (store.storeType === 'boolean') {
    return <BooleanParamEditor store={store as BooleanStore} paramId={paramId} translator={translator}/>;
  }
  return null;
};

export const JsonSchemaEditor = ({ store, translator, customEditorBuilder }: JsonSchemaEditorProps) => {
  if (store.storeType !== 'object') {
    return null;
  }
  const editorBuilderFunction = (store: PropertyStore, paramId: string, translator: Translator) => {
    if (customEditorBuilder) {
      const editor = customEditorBuilder(store, paramId, translator);
      if (editor) {
        return editor;
      }
    }
    return DefaultEditorBuilder(store, paramId, translator);
  };
  return (
    <div className="wb-jsonEditor">
      <ObjectParamEditor
        store={store as ObjectStore}
        paramId="root"
        translator={translator}
        editorBuilder={editorBuilderFunction}
      />
    </div>
  );
};
