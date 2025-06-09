import { makeObservable, computed } from 'mobx';
import { makeStoreFromJsonSchema } from '@/stores/json-schema-editor';
import i18n from '../../../i18n/react/config';
import { TabType } from './tabsStore';

export class SettingsTab {
  constructor(data, schema, schemaTranslator) {
    this.name = i18n.t('device-manager.labels.settings');
    this.type = TabType.SETTINGS;
    this.data = data;
    this.schemaStore = makeStoreFromJsonSchema(schema, data);
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
