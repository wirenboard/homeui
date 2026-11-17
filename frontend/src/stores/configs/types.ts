export interface ConfigListItem {
  title: string;
  description: string;
  editor: string;
  schemaPath: string;
  configPath: string;
  titleTranslations: {
    ru?: string;
    en?: string;
  };
}

export interface Config {
  configPath: string;
  editor?: string;
  content: any;
  schema: any;
}
