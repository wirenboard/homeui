import { makeObservable, computed } from 'mobx';
import i18n from '@/i18n/config';
import { type JsonSchema, ObjectStore, StoreBuilder, type Translator } from '@/stores/json-schema-editor';
import { TabType } from './tabs-store';

export class SettingsTab {
  public name: string = i18n.t('device-manager.labels.settings');
  public type: TabType = TabType.Settings;
  public data: any;
  public schemaStore: ObjectStore;
  public schemaTranslator: Translator;

  constructor(data: any, schema: JsonSchema, schemaTranslator: Translator) {
    this.data = data;
    this.schemaStore = new ObjectStore(schema, data, false, new StoreBuilder());
    this.schemaTranslator = schemaTranslator;

    makeObservable(this, {
      editedData: computed,
      hasJsonValidationErrors: computed,
      isDirty: computed,
      hasInvalidConfig: computed,
    });
  }

  commitData() {
    this.schemaStore.commit();
  }

  get editedData() {
    return this.schemaStore.value;
  }

  get hasJsonValidationErrors() {
    return this.schemaStore.hasErrors;
  }

  get isDirty() {
    return this.schemaStore.isDirty;
  }

  get hasInvalidConfig() {
    return this.schemaStore.hasErrors;
  }
}
