import { type ReactElement } from 'react';
import {
  type StringStore,
  type ObjectStore,
  type NumberStore,
  type BooleanStore,
  type ArrayStore,
  type PropertyStore,
  type ObjectParamStore,
  type ByteArrayStore,
  type Translator,
  type ValidationError,
} from '@/stores/json-schema-editor';

export interface EditorBuilderFunctionProps {
  store: PropertyStore;
  paramId?: string;
  translator: Translator;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  hideError?: boolean; // Do not show error state
  isTopLevel?: boolean; // Is the top-level editor
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
  titleOverride?: string;
}

export interface NumberEditorProps {
  store: NumberStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
  isDisabled?: boolean;
  hideError?: boolean;
}

export interface StringEditorProps {
  store: StringStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
  hideError?: boolean;
}

export interface ObjectEditorProps {
  store: ObjectStore;
  translator: Translator;
  editorBuilder?: EditorBuilderFunction;
  isTopLevel?: boolean;
}

export interface ArrayEditorProps {
  store: ArrayStore;
  translator: Translator;
  editorBuilder?: EditorBuilderFunction;
}

export interface BooleanArrayEditorProps {
  store: ArrayStore;
  translator: Translator;
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
  showError: boolean;
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

export interface TableCellWithEditorProps {
  paramStore: ObjectParamStore;
  translator: Translator;
  editorBuilder: EditorBuilderFunction;
  width?: number;
}
