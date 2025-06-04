type Locale = 'ru' | 'en';

export type TranslationsByLocale = {
  [_key in Locale]?: string;
};

export interface Translations {
  [value: string]: Translations;
}

export interface SchemaBase {
  // properties from json-schema specification
  type: 'boolean' | 'string' | 'integer' | 'number' | 'object';
  title?: string;
  description?: string;

  // custom json-editor properties
  propertyOrder?: number; // Order of the property in the UI
  format?: string;
}

export interface WbOptions {
  // Show editor even if the property is not required and options.show_opt_in is not set
  // If the property is not set in original JSON, it will be set to default value
  show_editor?: boolean;
}

export interface OptionsBase {
  hidden?: boolean;
  show_opt_in?: boolean;
  grid_columns?: number;
  wb?: WbOptions;
}

export interface BooleanSchema extends SchemaBase {
  // properties from json-schema specification
  default?: boolean;

  // custom json-editor properties
  options?: OptionsBase;
}

export interface InputAttributes {
  placeholder?: string;
}

export interface StringOptions extends OptionsBase {
  inputAttributes?: InputAttributes;
  patternmessage?: string; // Message for pattern validation error
  enum_titles?: string[]; // Titles for enum values
}

export interface StringSchema extends SchemaBase {
  // properties from json-schema specification
  default?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string; // Regular expression for validation
  enum?: string[]; // Array of allowed values

  // custom json-editor properties
  options?: StringOptions;
}

export interface NumberOptions extends OptionsBase {
  inputAttributes?: InputAttributes;
  enum_titles?: string[]; // Titles for enum values
}

export interface NumberSchema extends SchemaBase {
  // properties from json-schema specification
  default?: number;
  maximum?: number;
  minimum?: number;
  enum?: number[]; // Array of allowed values

  // custom json-editor properties
  options?: NumberOptions;
}

export interface ObjectSchema extends SchemaBase {
  // properties from json-schema specification
  properties?: Record<string, SchemaBase>;
  default?: Record<string, unknown>;
  required?: string[];

  // custom json-editor properties
  options?: OptionsBase;
}

export interface ValidationError {
  // Key for i18n translation
  key?: string;

  // Custom message for the error if key is not provided
  // The message can be translated using translations provided with the schema
  msg?: string;

  data?: Record<string, unknown>;
}
