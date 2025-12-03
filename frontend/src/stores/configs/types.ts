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
