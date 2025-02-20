type Locale = 'ru' | 'en';

export type NameTranslations = {
  [_key in Locale]?: string;
};

export interface DeviceMeta {
  title?: NameTranslations;
}

export type EnumTranslations = {
  [value: string]: NameTranslations;
};

export interface CellMeta {
  title?: NameTranslations;
  enum?: EnumTranslations;
  readonly?: boolean;
  type?: string;
  min?: number | string;
  max?: number | string;
  precision?: number;
  units?: string;
  order?: number;
  error?: string;
}
