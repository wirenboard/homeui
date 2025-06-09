export type TranslationsByLocale = {
  en?: Record<string, string>;
  ru?: Record<string, string>;
};

export interface Translations {
  translations: TranslationsByLocale;
}

export interface WbOptions {
  // Show editor even if the property is not required and options.show_opt_in is not set
  // If the property is not set in original JSON, it will be set to default value
  show_editor?: boolean;
}

export interface InputAttributes {
  placeholder?: string;
}

export interface JsonEditorOptions {
  hidden?: boolean;
  show_opt_in?: boolean;
  grid_columns?: number;
  inputAttributes?: InputAttributes;
  patternmessage?: string; // Message for pattern validation error
  enum_titles?: string[]; // Titles for enum values

  wb?: WbOptions;
}

export interface JsonSchema {
  // properties from json-schema specification
  type: 'number' | 'integer' | 'string' | 'boolean' | 'object';
  title?: string;
  description?: string;

  enum?: (string | number)[];

  default?: 'number' | 'string' | 'boolean';

  $ref?: string;

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

  // custom json-editor properties
  propertyOrder?: number; // Order of the property in the UI
  format?: string;
  options?: JsonEditorOptions;
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
