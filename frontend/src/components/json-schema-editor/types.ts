import { ReactElement } from 'react';
import {
  StringStore,
  ObjectStore,
  NumberStore,
  BooleanStore,
  PropertyStore,
  Translator,
  type ValidationError
} from '@/stores/json-schema-editor';

export type EditorBuilderFunction = (
  store: PropertyStore,
  paramId: string,
  translator: Translator
) => ReactElement | null;

export interface JsonSchemaEditorProps {
  store: PropertyStore;
  translator: Translator;
  customEditorBuilder?: EditorBuilderFunction;
}

export interface BooleanParamEditorProps {
  store: BooleanStore;
  paramId: string;
  translator: Translator;
}

export interface NumberEditorProps {
  store: NumberStore;
  inputId: string;
  descriptionId: string;
  errorId: string;
  translator: Translator;
}

export interface NumberParamEditorProps {
  store: NumberStore;
  paramId: string;
  translator: Translator;
}

export interface ObjectParamEditorProps {
  store: ObjectStore;
  paramId: string;
  translator: Translator;
  editorBuilder?: EditorBuilderFunction;
}

export interface StringEditorProps {
  store: StringStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
}

export interface StringParamEditorProps {
  store: StringStore;
  paramId: string;
  translator: Translator;
}

export interface EditorWrapperProps {
  descriptionId: string;
  errorId: string;
  store: NumberStore | StringStore | BooleanStore;
  translator: Translator;
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
