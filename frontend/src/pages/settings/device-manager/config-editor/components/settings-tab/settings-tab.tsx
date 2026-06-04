import SettingsIcon from '@/assets/icons/settings.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import type { SettingsTabContentProps, SettingsTabProps } from './types';
import './styles.css';

export const SettingsTab = ({ tab }: SettingsTabProps) => (
  <div className="settingsTab">
    <SettingsIcon className="settingsTab-icon" />
    <span className="settingsTab-name">{tab.name}</span>
    {tab.hasInvalidConfig && <WarnIcon className="settingsTab-icon" />}
  </div>
);

export const SettingsTabContent = ({ tab }: SettingsTabContentProps) => (
  <JsonSchemaEditor store={tab.schemaStore} translator={tab.schemaTranslator}/>
);
