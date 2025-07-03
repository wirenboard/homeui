export type TranslationsByLocale = {
  en?: Record<string, string>;
  ru?: Record<string, string>;
};

export interface WbOptions {
  // Show editor even if the property is not required and options.show_opt_in is not set
  // If the property is not set in original JSON, it will be set to default value
  // So the resulting value can't be undefined
  show_editor?: boolean;

  // If true, the title of the property and editor's surrounding panel will not be shown
  disable_title?: boolean;
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
  type: 'number' | 'integer' | 'string' | 'boolean' | 'object';
  title?: string;
  description?: string;

  enum?: (string | number)[];

  default?: number | string | boolean;

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

  // wb specific properties
  device?: WbDeviceTemplate;
  translations?: TranslationsByLocale;
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

export interface WbDeviceTemplateParameter {
  title: string;
  id?: string;
  enum?: number[];
  enum_titles?: string[];
  default?: number;
  min?: number;
  max?: number;
  order?: number;
  required?: boolean;
  description?: string;
  group?: string;
  condition?: string;
  dependencies?: string[];
}

export interface WbDeviceTemplateChannelSettings {
  enabled?: boolean;
  read_period_ms?: number;
}

export interface WbDeviceTemplateChannel extends WbDeviceTemplateChannelSettings {
  name: string;
  description?: string;
  group?: string;
  condition?: string;
  dependencies?: string[];
}

export interface WbDeviceParametersGroup {
  title: string;
  id: string;
  order?: number;
  description?: string;
  group?: string;
  ui_options?: JsonEditorOptions;
}

export interface WbDeviceTemplate {
  groups?: WbDeviceParametersGroup[];
  parameters?: WbDeviceTemplateParameter[];
  channels?: WbDeviceTemplateChannel[];
  translations?: TranslationsByLocale;
}
