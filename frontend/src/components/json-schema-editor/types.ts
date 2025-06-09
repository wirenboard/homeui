import {
  StringStore,
  ObjectStore,
  ObjectStoreParam,
  NumberStore,
  BooleanStore,
  Translator,
  ValidationError
} from '@/stores/json-schema-editor';

export interface JsonSchemaEditorProps {
  store: ObjectStore;
  translator: Translator;
}

export interface BooleanParamEditorProps {
  key: string;
  store: BooleanStore;
  translator: Translator;
}

export interface NumberParamEditorProps {
  store: NumberStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
}

export interface ObjectParamEditorProps {
  store: ObjectStore;
  translator: Translator;
}

export interface StringParamEditorProps {
  store: StringStore;
  inputId?: string;
  descriptionId?: string;
  errorId?: string;
  translator: Translator;
}

export interface EditorWrapperProps {
  inputId: string;
  descriptionId: string;
  errorId: string;
  param: ObjectStoreParam;
  translator: Translator;
}

export interface ParamDescriptionProps {
  id: string;
  description?: string;
  defaultText?: string;
}

export interface ParamErrorProps {
  id?: string;
  error?: ValidationError;
  translator: Translator;
}
