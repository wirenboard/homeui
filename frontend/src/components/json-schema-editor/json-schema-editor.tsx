import { lazy, Suspense } from 'react';
import {
  PropertyStore,
  ObjectStore,
  StringStore,
  NumberStore,
  BooleanStore,
  Translator
} from '@/stores/json-schema-editor';
import type { JsonSchemaEditorProps } from './types';
import './styles.css';

const BooleanParamEditor = lazy(() => import('./boolean-param-editor'));
const NumberParamEditor = lazy(() => import('./number-param-editor'));
const ObjectParamEditor = lazy(() => import('./object-param-editor'));
const StringParamEditor = lazy(() => import('./string-param-editor'));

const DefaultEditorBuilder = (store: PropertyStore, paramId: string, translator: Translator) => {
  if (store.storeType === 'object') {
    return (
      <Suspense>
        <ObjectParamEditor store={store as ObjectStore} paramId={paramId} translator={translator}/>
      </Suspense>
    );
  }
  if (store.storeType === 'string') {
    return (
      <Suspense>
        <StringParamEditor store={store as StringStore} paramId={paramId} translator={translator}/>
      </Suspense>
    );
  }
  if (store.storeType === 'number') {
    return (
      <Suspense>
        <NumberParamEditor store={store as NumberStore} paramId={paramId} translator={translator}/>
      </Suspense>
    );
  }
  if (store.storeType === 'boolean') {
    return (
      <Suspense>
        <BooleanParamEditor store={store as BooleanStore} paramId={paramId} translator={translator}/>
      </Suspense>
    );
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
