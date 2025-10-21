import { ReactElement } from 'react';
import {
  StringStore,
  ObjectStore,
  NumberStore,
  BooleanStore,
  ArrayStore,
  PropertyStore,
  ObjectParamStore,
  ByteArrayStore,
  Translator,
  type ValidationError
} from '@/stores/json-schema-editor';

export interface EditorBuilderFunctionProps {
  store: PropertyStore;
  paramId?: string;
  translator: Translator;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
}

export type EditorBuilderFunction = (props: EditorBuilderFunctionProps) => ReactElement | null;

export interface JsonSchemaEditorProps {
  store: PropertyStore;
  translator: Translator;
  customEditorBuilder?: EditorBuilderFunction;
}

export interface BooleanEditorProps {
  store: BooleanStore;
  paramId?: string;
  errorId?: string;
  descriptionId?: string;
  translator: Translator;
}

export interface NumberEditorProps {
  store: NumberStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
  isDisabled?: boolean;
}

export interface StringEditorProps {
  store: StringStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
}

export interface ObjectEditorProps {
  store: ObjectStore;
  translator: Translator;
  editorBuilder?: EditorBuilderFunction;
}

export interface ArrayEditorProps {
  store: ArrayStore;
  translator: Translator;
  editorBuilder?: EditorBuilderFunction;
}

export interface ByteArrayEditorProps {
  store: ByteArrayStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
}

export interface EditorWrapperProps {
  param: ObjectParamStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
}

export interface EditorWrapperLabelProps {
  param: ObjectParamStore;
  title: string;
  inputId: string;
}

export interface ParamDescriptionProps {
  id?: string;
  description?: string;
  defaultText?: string;
}

export interface ParamErrorProps {
  id?: string;
  error?: ValidationError;
  translator: Translator;
}

export interface OptionalParamsSelectDialogProps {
  isOpened: boolean;
  store: ObjectStore;
  translator: Translator;
  onClose: () => void;
}
