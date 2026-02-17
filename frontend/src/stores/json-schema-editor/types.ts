import { type MistypedValue } from './mistyped-value';

export interface TranslationsByLocale {
  en?: Record<string, string>;
  ru?: Record<string, string>;
}

export interface WbOptions {
  // Show editor even if the property is not required and options.show_opt_in is not set
  // If the property is not set in original JSON, it will be set to default value
  // So the resulting value can't be undefined
  show_editor?: boolean;

  // If true, the title of the property and editor's surrounding panel will not be shown
  disable_title?: boolean;

  // If true and the property is not required,
  // it will be omitted from the resulting JSON if its value is equal to the default value
  omit_default?: boolean;

  // If true, the resulting value can be undefined.
  // This option is useful for string properties where empty string is not a valid value
  // and we want to allow user to not set the property at all.
  // This option has effect only if show_editor is true
  allow_undefined?: boolean;
}

export interface InputAttributes {
  placeholder?: string;
}

export interface JsonEditorOptions {
  hidden?: boolean;
  compact?: boolean;

  // If true, the property will be shown in the editor even if it is not required
  // The resulting value can be undefined, the editor will show empty line without error
  show_opt_in?: boolean;

  grid_columns?: number;
  inputAttributes?: InputAttributes;
  patternmessage?: string; // Message for pattern validation error
  enum_titles?: string[]; // Titles for enum values

  wb?: WbOptions;
}

export interface JsonSchema {
  // properties from json-schema specification
  type: 'number' | 'integer' | 'string' | 'boolean' | 'object' | 'array' | 'oneOf';
  title?: string;
  description?: string;

  enum?: (string | number)[];

  default?: number | string | boolean;

  $ref?: string;

  oneOf?: JsonSchema[];

  // string specific properties
  maxLength?: number; // Maximum length for string validation
  minLength?: number; // Minimum length for string validation
  pattern?: string; // Regular expression for string validation

  // number specific properties
  maximum?: number;
  minimum?: number;

  // object specific properties
  properties?: Record<string, JsonSchema>;
  required?: string[];
  allOf?: JsonSchema[];

  // array specific properties
  items?: JsonSchema | JsonSchema[];
  minItems?: number;
  maxItems?: number;

  // custom json-editor properties
  propertyOrder?: number; // Order of the property in the UI
  format?: string;
  options?: JsonEditorOptions;
  defaultProperties?: string[];

  // wb specific properties
  translations?: TranslationsByLocale;
  device?: unknown; // Used in wb-mqtt-serial to store device template
}

export interface ValidationError {
  // Key for i18n translation
  key?: string;

  // Custom message for the error if key is not provided
  // The message can be translated using translations provided with the schema
  msg?: string;

  // Additional data for i18n
  data?: Record<string, unknown>;
}

export type JsonValue = string | number | boolean;
export type JsonArray = Array<JsonValue | JsonObject | JsonArray>;
export interface JsonObject {
  [key: string]: JsonValue | JsonObject | JsonArray;
}

export interface PropertyStore {
  value: MistypedValue | JsonObject | JsonValue | JsonArray | undefined;
  schema: JsonSchema;
  isDirty: boolean;
  hasErrors: boolean;
  error: ValidationError | undefined;

  readonly required: boolean;
  readonly storeType: string;
  readonly defaultText: string;

  setUndefined(): void;
  setDefault(): void;
  commit(): void;
  reset(): void;
}
