import { lazy, Suspense } from 'react';
import {
  ObjectStore,
  StringStore,
  NumberStore,
  BooleanStore
} from '@/stores/json-schema-editor';
import type { JsonSchemaEditorProps, EditorBuilderFunctionProps } from './types';
import './styles.css';

const BooleanEditor = lazy(() => import('./boolean-param-editor'));
const NumberEditor = lazy(() => import('./number-param-editor'));
const ObjectEditor = lazy(() => import('./object-param-editor'));
const StringEditor = lazy(() => import('./string-param-editor'));

const DefaultEditorBuilder = (props: EditorBuilderFunctionProps) => {
  if (props.store.storeType === 'object') {
    return (
      <Suspense>
        <ObjectEditor store={props.store as ObjectStore} translator={props.translator} />
      </Suspense>
    );
  }
  if (props.store.storeType === 'string') {
    return (
      <Suspense>
        <StringEditor
          store={props.store as StringStore}
          translator={props.translator}
          inputId={props.inputId}
          descriptionId={props.descriptionId}
          errorId={props.errorId}
        />
      </Suspense>
    );
  }
  if (props.store.storeType === 'number') {
    return (
      <Suspense>
        <NumberEditor
          store={props.store as NumberStore}
          translator={props.translator}
          inputId={props.inputId}
          descriptionId={props.descriptionId}
          errorId={props.errorId}
        />
      </Suspense>
    );
  }
  if (props.store.storeType === 'boolean') {
    return (
      <Suspense>
        <BooleanEditor
          store={props.store as BooleanStore}
          paramId={props.paramId}
          translator={props.translator}
          descriptionId={props.descriptionId}
          errorId={props.errorId}
        />
      </Suspense>
    );
  }
  return null;
};

export const JsonSchemaEditor = ({ store, translator, customEditorBuilder }: JsonSchemaEditorProps) => {
  if (store.storeType !== 'object') {
    return null;
  }
  const editorBuilderFunction = (props: EditorBuilderFunctionProps) => {
    if (customEditorBuilder) {
      const editor = customEditorBuilder(props);
      if (editor) {
        return editor;
      }
    }
    return DefaultEditorBuilder(props);
  };
  return (
    <div className="wb-jsonEditor">
      <ObjectEditor
        store={store as ObjectStore}
        translator={translator}
        editorBuilder={editorBuilderFunction}
      />
    </div>
  );
};
