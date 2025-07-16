import { JsonEditorOptions, TranslationsByLocale } from '@/stores/json-schema-editor';

export interface WbDeviceTemplateParameter {
  title: string;
  id: string;
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
  name: string;
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
